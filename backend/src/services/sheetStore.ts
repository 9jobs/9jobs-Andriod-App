import { allowedUsers } from "../superAdmin/permissions";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { Pool } from "pg";
import { createDatabasePool } from "../lib/database";
import { clientSchema, digest, mirrorRegistry, parseRegistry, RegistryClient } from "./clientRegistry";

export const SHEET_ID = "1KM8Jr2zjiGNRJJNorqIQHdlNc9-YMiTx_xmXZizVKvU";
export const sheetSchema = `
create schema if not exists sheet_sync;
revoke all on schema sheet_sync from public;
create table if not exists sheet_sync.snapshots (
 id text primary key, source_id text not null, imported_at timestamptz not null default now(),
 record_count integer not null, candidate_count integer not null, diagnostics jsonb not null,
 source_completed boolean not null default false
);
create table if not exists sheet_sync.records (
 id text primary key, candidate_label text not null, fields jsonb not null
);
create table if not exists sheet_sync.record_annotations (
 record_id text primary key references sheet_sync.records(id),
 resolved_date text, view_date text not null, date_resolution_status text not null
);
create index if not exists sheet_records_candidate_idx on sheet_sync.records(candidate_label);
create table if not exists sheet_sync.snapshot_records (
 snapshot_id text not null references sheet_sync.snapshots(id), record_id text not null references sheet_sync.records(id),
 source_row text not null, ordinal integer not null, primary key(snapshot_id,record_id)
);
create table if not exists sheet_sync.head (
 source_id text primary key, snapshot_id text not null references sheet_sync.snapshots(id), checked_at timestamptz not null default now()
);
create table if not exists sheet_sync.candidate_mappings (
 user_id text not null, candidate_label text not null, approved_by text not null, approved_at timestamptz not null default now(),
 revoked_at timestamptz, primary key(user_id,candidate_label)
);
create table if not exists sheet_sync.email_approvals (
 email text not null, candidate_label text not null, approved_by text not null,
 approved_at timestamptz not null default now(), resolved_user_id text, revoked_at timestamptz,
 primary key(email,candidate_label)
);
revoke all on all tables in schema sheet_sync from public;
`;
export const clientRegistrySchema = sheetSchema + clientSchema;
let pool: Pool | undefined;
export function sheetDb() { return pool ??= createDatabasePool(); }
export const sheetEnabled = () => process.env.SHEET_INTEGRATION_ENABLED === "true";

export async function sheetVersion(userId: string, db: Pool = sheetDb()) {
  const result = await db.query(`select h.snapshot_id,a.client_id,a.approved_at
    from sheet_sync.head h cross join sheet_sync.client_accounts a
    where h.source_id=$1 and a.user_id=$2 and a.revoked_at is null order by a.client_id`,[SHEET_ID,userId]);
  return { version: result.rowCount ? hash(JSON.stringify(result.rows)) : null };
}

function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
export function validateClientExport(source: any, registry: RegistryClient[]) {
 const p = source.clientProtocol;
 const {EXPECTED_HEADERS} = require("../../scripts/inspect-duplicate-sheet.cjs");
 if (p?.version !== 1 || p.state !== "COMPLETED" || !/^g_[a-f0-9]{32}$/.test(p.generation) || !Array.isArray(p.parts) || !Array.isArray(source.provenance) || JSON.stringify(source.allJobs?.values?.[0]) !== JSON.stringify(EXPECTED_HEADERS)) throw new Error("Completed client provenance required");
 if(!Number.isFinite(Date.parse(p.completedAt)) || Date.parse(p.completedAt)>Date.now()+300000)throw new Error("Invalid generation completion time");
 const rows = source.allJobs.values.slice(1);
 let offset = 0;
 const names = new Set();
 for(const part of p.parts) {
  if (!/^_9JOBS_DATA_g_[a-f0-9]{32}_\d+$/.test(part.tab) || names.has(part.tab) || !registry.some(item=>item.sheetId===String(part.sheetId)) || !Number.isInteger(part.count) || part.count < 0) throw new Error("Invalid provenance part");
  names.add(part.tab);
  const chunk = rows.slice(offset,offset+part.count);
  if (chunk.length !== part.count || chunk.some((row:any[])=>row.length!==12 || !row[0] || !/^\d+$/.test(String(row[2])) || !row[3] || !row[4]) || digest(chunk)!==part.digest || source.provenance.slice(offset,offset+part.count).some((id:any)=>String(id)!==String(part.sheetId))) throw new Error("Provenance content mismatch");
  offset += part.count;
 }
 if (offset !== rows.length || source.provenance.length !== rows.length || rows.length !== p.recordCount || digest(p.parts)!==p.manifestDigest) throw new Error("Incomplete generation");
 return {incompleteRows:0,duplicateIndexNames:0,indexCountsMatch:true,candidateLabels:new Set(p.parts.map((part:any)=>String(part.sheetId))).size,sourceRecords:rows.length};
}
export function prepareSheetRows(values: unknown[][]) {
  const occurrences = new Map<string, number>();
  return values.slice(1).filter(row => row.some(cell => String(cell ?? "").trim())).map((row, ordinal) => {
    const fields = Array.from({ length: 11 }, (_, index) => String(row[index] ?? ""));
    const digest = hash(JSON.stringify(fields));
    const occurrence = (occurrences.get(digest) || 0) + 1;
    occurrences.set(digest, occurrence);
    // Versioned source occurrence, NOT a mutable application/business ID.
    return { id: `${digest}:${occurrence}`, candidate_label: fields[0], fields, source_row: String(row[11] ?? ""), ordinal };
  });
}

export async function importSheetExport(file: string, db: Pool, sourceCompleted = false) {
  const source = JSON.parse(await readFile(file, "utf8"));
  if (source.spreadsheetId !== SHEET_ID) throw new Error("Unapproved source spreadsheet");
  // Recompute diagnostics; never trust the export's stored diagnostic fields.
  const { inspectValues } = require("../../scripts/inspect-duplicate-sheet.cjs");
  const protocol = source.clientProtocol;
  if(sourceCompleted && !protocol)throw new Error("Permanent Client ID provenance is required for publication");
  const registry = protocol ? parseRegistry(source.registry.values) : [];
  const diagnostics = protocol ? validateClientExport(source,registry) : inspectValues(source.allJobs, source.candidateIndex);
  if (diagnostics.incompleteRows || diagnostics.duplicateIndexNames) throw new Error("Incomplete or ambiguous source snapshot");
  if (sourceCompleted && !diagnostics.indexCountsMatch) throw new Error("Source index counts do not reconcile; cannot publish");
  const rows = prepareSheetRows(source.allJobs.values).map((row,index)=>({...row, owner:protocol ? registry.find(item=>item.sheetId===String(source.provenance[index]))?.clientId : undefined}));
  // Order independent, includes multiplicity and raw source-row references.
  const snapshotId = hash(JSON.stringify([rows.map(row => [row.id, row.source_row,row.owner || ""]).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),registry.map(row=>[row.clientId,row.sheetId]).sort()]));
  const client = await db.connect();
  try {
    await client.query("begin");
    const lock = await client.query("select pg_try_advisory_xact_lock(91035, 65) as locked");
    if (!lock.rows[0].locked) throw new Error("Another sheet import is running");
    if (protocol && sourceCompleted) {
      const previous=await client.query(`select s.id,s.record_count,s.diagnostics from sheet_sync.head h join sheet_sync.snapshots s on s.id=h.snapshot_id where h.source_id=$1`,[SHEET_ID]);
      if(previous.rows[0]?.record_count>rows.length)throw new Error("Source count decreased; retain previous generation for review");
      const priorTime=Date.parse(previous.rows[0]?.diagnostics?.sourceCompletedAt);
      const nextTime=Date.parse(protocol.completedAt);
      if(previous.rows[0]?.diagnostics?.sourceGeneration===protocol.generation && previous.rows[0]?.id!==snapshotId)throw new Error("Committed generation identity cannot change");
      if(priorTime>nextTime || (priorTime===nextTime && previous.rows[0]?.id!==snapshotId))throw new Error("Older or conflicting generation cannot replace current data");
      const missing=await client.query("select source_sheet_id from sheet_sync.clients where not(source_sheet_id=any($1::text[]))",[registry.map(row=>row.sheetId)]);
      if(missing.rowCount)throw new Error("Registry entries disappeared; retain previous generation");
    }
    await mirrorRegistry(registry,client);
    const existing = await client.query("select id from sheet_sync.snapshots where id=$1", [snapshotId]);
    if (!existing.rowCount) {
      await client.query("insert into sheet_sync.snapshots(id,source_id,record_count,candidate_count,diagnostics,source_completed) values($1,$2,$3,$4,$5,$6)", [snapshotId,SHEET_ID,rows.length,diagnostics.candidateLabels,JSON.stringify(diagnostics),sourceCompleted]);
      for (let offset=0; offset<rows.length; offset+=500) {
        const batch = JSON.stringify(rows.slice(offset,offset+500));
        await client.query(`insert into sheet_sync.records(id,candidate_label,fields)
          select id,candidate_label,fields from jsonb_to_recordset($1::jsonb) as r(id text,candidate_label text,fields jsonb)
          on conflict(id) do nothing`, [batch]);
        await client.query(`insert into sheet_sync.snapshot_records(snapshot_id,record_id,source_row,ordinal)
          select $1,id,source_row,ordinal from jsonb_to_recordset($2::jsonb) as r(id text,source_row text,ordinal integer)`, [snapshotId,batch]);
      }
    }
    if (protocol) {
      for(let offset=0;offset<rows.length;offset+=500) {
        await client.query(`insert into sheet_sync.client_record_owners(snapshot_id,record_id,client_id)
          select $1,id,owner from jsonb_to_recordset($2::jsonb) as r(id text,owner text)
          on conflict(snapshot_id,record_id) do nothing`,[snapshotId,JSON.stringify(rows.slice(offset,offset+500))]);
      }
    }
    if (sourceCompleted && existing.rowCount) {
      await client.query("update sheet_sync.snapshots set source_completed=true where id=$1",[snapshotId]);
    }
    if(protocol && sourceCompleted)await client.query("update sheet_sync.snapshots set diagnostics=diagnostics || $2::jsonb where id=$1",[snapshotId,JSON.stringify({sourceCompletedAt:protocol.completedAt,sourceGeneration:protocol.generation})]);
    // Raw review imports never displace the most recent completed source for clients.
    const heads = [`${SHEET_ID}:review`, ...(sourceCompleted ? [SHEET_ID] : [])];
    for (const headId of heads) {
      await client.query("insert into sheet_sync.head(source_id,snapshot_id) values($1,$2) on conflict(source_id) do update set snapshot_id=excluded.snapshot_id,checked_at=now()", [headId,snapshotId]);
    }
    await client.query("commit");
    return { snapshotId, records: rows.length, candidates: diagnostics.candidateLabels, unchanged: Boolean(existing.rowCount), sourceCompleted, indexCountsMatch: diagnostics.indexCountsMatch };
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

export function sheetJob(record: any) {
  const f: string[] = record.fields;
  const labels = ["Candidate","Applied Date","Serial No","Position","Company","Company URL","Job Link","Recruiter","Contact","Email","Message"];
  let jobLink = "";
  try { const url = new URL(f[6]); if (["http:","https:"].includes(url.protocol)) jobLink = f[6]; } catch { /* Raw link remains in source_fields. */ }
  return {
    id: `sheet:${record.id}`, title: f[3], company: f[4], location: "", salary: "", job_type: "",
    posted_at: record.resolved_date || f[1], source_resolved_date:record.resolved_date || null, match_score: null, tags: [], category_id: null, job_link: jobLink,
    description: f.map((value,index) => value ? `${labels[index]}: ${value}` : "").filter(Boolean).join("\n"),
    user_name: f[0], user_email: "", source: "duplicate-sheet", source_fields: Object.fromEntries(labels.map((name,index) => [name,f[index]]).concat([["Source Row",record.source_row]])),
  };
}

export async function readSheetJobs(options: { userId?: string; admin?: boolean; query?: string; limit?: number; offset?: number; snapshotId?: string }, db: Pool = sheetDb()) {
  const head = options.admin ? `${SHEET_ID}:review` : SHEET_ID;
  const chosen = options.snapshotId
    ? await db.query("select id from sheet_sync.snapshots where id=$1 and source_id=$2 and ($3::boolean or source_completed=true)",[options.snapshotId,SHEET_ID,Boolean(options.admin)])
    : await db.query("select snapshot_id as id from sheet_sync.head where source_id=$1",[head]);
  const snapshotId: string | undefined = chosen.rows[0]?.id;
  if (!snapshotId) return {total:0,jobs:[],offset:options.offset ?? 0,limit:options.limit ?? 200,snapshotId:null};
  const params: unknown[] = [snapshotId];
  const conditions = ["m.snapshot_id=$1"];
  if (!options.admin) {
    if (!options.userId) throw new Error("Verified user ID required");
    params.push(options.userId);
    conditions.push("exists(select 1 from sheet_sync.client_record_owners o join sheet_sync.client_accounts a on a.client_id=o.client_id where o.snapshot_id=m.snapshot_id and o.record_id=m.record_id and a.user_id=$2 and a.revoked_at is null)");
  }
  const officeUsers=options.admin?await allowedUsers('client.view'):null;
  if(officeUsers){params.push(officeUsers);conditions.push(`exists(select 1 from sheet_sync.client_record_owners o join sheet_sync.client_accounts a on a.client_id=o.client_id where o.snapshot_id=m.snapshot_id and o.record_id=m.record_id and a.revoked_at is null and a.user_id=any($${params.length}::text[]))`);}
  if (options.query) {
    params.push(`%${options.query.slice(0,200)}%`);
    conditions.push(`(r.candidate_label ilike $${params.length} or r.fields->>3 ilike $${params.length} or r.fields->>4 ilike $${params.length})`);
  }
  const where = conditions.join(" and ");
  const from = `from sheet_sync.snapshot_records m join sheet_sync.records r on r.id=m.record_id left join sheet_sync.record_annotations annotation on annotation.record_id=r.id where ${where}`;
  const total = (await db.query(`select count(*)::int as count ${from}`, params)).rows[0].count;
  params.push(options.limit ?? 200,options.offset ?? 0);
  const records = await db.query(`select r.id,r.fields,m.source_row,annotation.resolved_date ${from} order by m.ordinal desc limit $${params.length-1} offset $${params.length}`,params);
  return { total, jobs: records.rows.map(sheetJob), offset: options.offset ?? 0, limit: options.limit ?? 200,snapshotId };
}

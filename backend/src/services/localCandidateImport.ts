import { createHash } from "node:crypto";
import type { Pool } from "pg";
import { SHEET_ID, prepareSheetRows } from "./sheetStore";

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export type CandidateApproval = { approved: boolean; approvedBy: string; userId: string; email: string;
  candidate: string; sourceSpreadsheetId: string; sourceSheetId: string; clientId: string; sourceRecords: number; refreshOnly?: boolean };

export function prepareLocalCandidate(source: any, approval: CandidateApproval) {
  if (!approval.approved || !approval.approvedBy || approval.sourceSpreadsheetId !== SHEET_ID ||
      source.spreadsheetId !== SHEET_ID || !/^\d+$/.test(approval.sourceSheetId) ||
      !/^9JOBS-CL-[a-f0-9-]{36}$/.test(approval.clientId)) throw new Error("Explicit exact candidate approval required");
  const { inspectValues } = require("../../scripts/inspect-duplicate-sheet.cjs");
  const { digestSource } = require("../../scripts/sheet-source-consistency.cjs");
  const sample = source.sample;
  const diagnostics = inspectValues(sample.allJobs, sample.candidateIndex);
  if (!sample.sourceValidation?.consistent || !diagnostics.indexCountsMatch ||
      diagnostics.duplicateIndexNames || sample.sourceValidation.digest !== digestSource(sample.allJobs, sample.candidateIndex)) throw new Error("Reconciled source evidence required");
  const tabs = source.metadata.sheets.filter((s: any) => s.properties.title === approval.candidate);
  if (tabs.length !== 1 || String(tabs[0].properties.sheetId) !== approval.sourceSheetId) throw new Error("Ambiguous candidate source identity");
  const index = sample.candidateIndex.values.slice(1).filter((r: any[]) => r[0] === approval.candidate);
  const values = sample.allJobs.values.filter((r: any[], i: number) => i === 0 || r[0] === approval.candidate);
  if (index.length !== 1 || Number(index[0][1]) !== approval.sourceRecords || values.length - 1 !== approval.sourceRecords) throw new Error("Candidate count changed; review approval again");
  const view = source.views.flatMap((v: any) => v.sheets).find((s: any) => String(s.properties.sheetId) === approval.sourceSheetId);
  if (!view || view.properties.title !== approval.candidate) throw new Error("Candidate view evidence missing");
  const viewRows = (view.data || []).flatMap((block: any) => block.rowData || []);
  const viewJobs: unknown[][] = [];
  let date = "";
  for (const row of viewRows) {
    const cells = row.values || [];
    const text = (i: number) => String(cells[i]?.formattedValue || "");
    if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(text(0))) { date = text(0); continue; }
    if (!/^\d+$/.test(text(0)) || !text(1) || !text(2)) continue;
    viewJobs.push([approval.candidate, date, text(0), text(1), text(2), cells[2]?.hyperlink || "",
      cells[3]?.hyperlink || "", text(4), text(5), text(6), text(7)]);
  }
  const canonical = (rows: unknown[][]) => rows.map(r => JSON.stringify(Array.from({ length: 11 }, (_, i) => String(r[i] || "").trim()))).sort();
  if (JSON.stringify(canonical(viewJobs)) !== JSON.stringify(canonical(values.slice(1)))) throw new Error("Candidate view and All_Jobs differ; review required");
  const rows = prepareSheetRows(values).map(row => ({ ...row,
    // Namespace source occurrences by the real Duplicate tab ID; names are not ownership keys.
    id: hash([SHEET_ID, approval.sourceSheetId, row.id, row.source_row]), owner: approval.clientId }));
  return { rows, fingerprint: hash(rows), dates: [...new Set(rows.map(r => r.fields[1]))],
    links: rows.filter(r => /^https?:\/\//.test(r.fields[6])).length };
}

export async function importLocalCandidate(source: any, approval: CandidateApproval, db: Pool) {
  const target = new URL(process.env.DATABASE_URL || "http://invalid");
  if (process.env.LOCAL_DATABASE_MODE !== "isolated-e2e" || target.hostname !== "127.0.0.1" || target.port !== "55439" ||
      target.username !== "client_id_test" || !/^\/9jobs_local_e2e_[a-z0-9_]+$/.test(target.pathname)) throw new Error("Isolated localhost database required");
  const prepared = prepareLocalCandidate(source, approval);
  const client = await db.connect();
  try {
    await client.query("begin");
    await client.query("set local statement_timeout='30s'");
    await client.query("select pg_advisory_xact_lock(91035,65)");
    const actual = await client.query("select current_database() as name");
    if (actual.rows[0].name !== target.pathname.slice(1)) throw new Error("Database target mismatch");
    const account = await client.query(`select a.user_id from sheet_sync.verified_accounts a
      join sheet_sync.account_directory d on d.user_id=a.user_id
      where a.user_id=$1 and a.email=$2 and d.email_verified and d.registration_status='verified'`, [approval.userId, approval.email]);
    if (!account.rowCount) throw new Error("Real verified local account required before import");
    if (approval.refreshOnly) {
      const mapping = await client.query(`select a.client_id from sheet_sync.client_accounts a where a.user_id=$1 and a.client_id=$2 and a.revoked_at is null for update`,[approval.userId,approval.clientId]);
      if (!mapping.rowCount) throw new Error("Active approved mapping required for automatic refresh");
      const count = await client.query(`select count(*)::int as count from sheet_sync.head h join sheet_sync.client_record_owners o on o.snapshot_id=h.snapshot_id where h.source_id=$1 and o.client_id=$2`,[SHEET_ID,approval.clientId]);
      if (approval.sourceRecords < count.rows[0].count) throw new Error("Source reduction requires review");
    }
    const existing = await client.query("select client_id from sheet_sync.clients where source_spreadsheet_id=$1 and source_sheet_id=$2", [SHEET_ID, approval.sourceSheetId]);
    if (existing.rowCount && existing.rows[0].client_id !== approval.clientId) throw new Error("Existing permanent Client ID must be preserved");
    await client.query(`insert into sheet_sync.clients(client_id,source_spreadsheet_id,source_sheet_id,candidate_name,created_at,last_seen_at)
      values($1,$2,$3,$4,now(),now()) on conflict(source_spreadsheet_id,source_sheet_id) do nothing`,
      [approval.clientId,SHEET_ID,approval.sourceSheetId,approval.candidate]);
    await client.query("update sheet_sync.clients set candidate_name=$2,last_seen_at=now() where client_id=$1",[approval.clientId,approval.candidate]);
    const head = (await client.query("select snapshot_id from sheet_sync.head where source_id=$1", [SHEET_ID])).rows[0]?.snapshot_id;
    const prior = head ? (await client.query(`select m.record_id as id,m.source_row,m.ordinal,o.client_id as owner
      from sheet_sync.snapshot_records m left join sheet_sync.client_record_owners o
      on o.snapshot_id=m.snapshot_id and o.record_id=m.record_id
      where m.snapshot_id=$1 and (o.client_id is null or o.client_id<>$2) order by m.ordinal,m.record_id`, [head,approval.clientId])).rows : [];
    const combined = [...prior, ...prepared.rows.map((r, i) => ({ id:r.id,source_row:r.source_row,owner:r.owner,ordinal:prior.length+i }))];
    const snapshot = hash(["approved-local-candidate-view-v1",combined.map(r=>[r.id,r.owner,r.source_row])]);
    const existed = await client.query("select id from sheet_sync.snapshots where id=$1", [snapshot]);
    if (!existed.rowCount) {
      const count = new Set(combined.map(r=>r.owner).filter(Boolean)).size;
      await client.query(`insert into sheet_sync.snapshots(id,source_id,record_count,candidate_count,diagnostics,source_completed)
        values($1,$2,$3,$4,$5,true)`, [snapshot,SHEET_ID,combined.length,count,JSON.stringify({policy:"approved-local-candidate-view-v1",sourceFetchedAt:source.fetchedAt,candidateFingerprint:prepared.fingerprint,sourceSheetId:approval.sourceSheetId,masterSheetIdentityVerified:false,previousSnapshot:head})]);
      for (const row of prepared.rows) {
        await client.query("insert into sheet_sync.records(id,candidate_label,fields) values($1,$2,$3) on conflict(id) do nothing", [row.id,row.candidate_label,JSON.stringify(row.fields)]);
      }
      for (let i=0;i<combined.length;i+=500) {
        const batch=JSON.stringify(combined.slice(i,i+500));
        await client.query(`insert into sheet_sync.snapshot_records(snapshot_id,record_id,source_row,ordinal)
          select $1,id,source_row,ordinal from jsonb_to_recordset($2::jsonb) as r(id text,source_row text,ordinal integer)`, [snapshot,batch]);
        await client.query(`insert into sheet_sync.client_record_owners(snapshot_id,record_id,client_id)
          select $1,id,owner from jsonb_to_recordset($2::jsonb) as r(id text,owner text) where owner is not null`, [snapshot,batch]);
      }
    }
    for (const id of [SHEET_ID,SHEET_ID+":review"]) await client.query(`insert into sheet_sync.head(source_id,snapshot_id) values($1,$2)
      on conflict(source_id) do update set snapshot_id=excluded.snapshot_id,checked_at=now()`, [id,snapshot]);
    await client.query("commit");
    return {clientId:approval.clientId,records:prepared.rows.length,snapshot,total:combined.length,unchanged:Boolean(existed.rowCount),dates:prepared.dates,links:prepared.links};
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

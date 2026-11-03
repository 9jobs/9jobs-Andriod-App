import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";

export const MASTER_ID = "1PRAH1qR9PyJtlUjHyfcq3eN2LiU2ERLaVaLRM5nkd2Y";
export const REGISTRY_HEADERS = ["Client_ID", "Source_Spreadsheet_ID", "Source_Sheet_ID", "Candidate_Name", "Created_At", "Last_Seen_At", "Account_Mapping_Status"];
export const clientSchema = `
create schema if not exists sheet_sync;
revoke all on schema sheet_sync from public;
create table if not exists sheet_sync.clients (
 client_id text primary key check(client_id ~ '^9JOBS-CL-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
 source_spreadsheet_id text not null, source_sheet_id text not null,
 candidate_name text not null, created_at timestamptz not null, last_seen_at timestamptz not null,
 unique(source_spreadsheet_id,source_sheet_id)
);
create table if not exists sheet_sync.verified_accounts (
 user_id text primary key, email text not null, full_name text not null,
 verified_at timestamptz not null, registered_at timestamptz not null default now(), last_authenticated_at timestamptz not null default now()
);
create table if not exists sheet_sync.account_directory (
 user_id text primary key, full_name text not null, email text not null, email_verified boolean not null,
 registration_status text not null check(registration_status in ('verified','pending_verification','blocked')),
 registered_at timestamptz not null, synced_at timestamptz not null default now()
);
create table if not exists sheet_sync.client_accounts (
 user_id text primary key references sheet_sync.verified_accounts(user_id),
 client_id text not null unique references sheet_sync.clients(client_id),
 approved_by text not null, approved_at timestamptz not null default now(), revoked_at timestamptz
);
create table if not exists sheet_sync.client_record_owners (
 snapshot_id text not null references sheet_sync.snapshots(id), record_id text not null references sheet_sync.records(id),
 client_id text not null references sheet_sync.clients(client_id), primary key(snapshot_id,record_id)
);
create table if not exists sheet_sync.client_email_associations (
 email text primary key check(email=lower(trim(email))),
 client_id text not null unique references sheet_sync.clients(client_id),
 approved_by text not null, approved_at timestamptz not null default now(),
 resolved_user_id text unique, revoked_at timestamptz
);
create table if not exists sheet_sync.candidate_sync_state (
 client_id text primary key references sheet_sync.clients(client_id),
 fingerprint text not null, record_count integer not null, last_success_at timestamptz not null,
 source_title text not null
);
create table if not exists sheet_sync.automation_status (
 source_id text primary key, state text not null default 'pending',
 last_attempt_at timestamptz, last_success_at timestamptz, refresh_requested_at timestamptz,
 completed_request_at timestamptz, consecutive_failures integer not null default 0,
 candidate_count integer, record_count integer, details jsonb not null default '{}'
);
create table if not exists sheet_sync.sync_events (
 id bigserial primary key, source_id text not null, event_at timestamptz not null default now(),
 event_type text not null, details jsonb not null
);
create index if not exists client_owners_client_snapshot_idx on sheet_sync.client_record_owners(client_id,snapshot_id);
create index if not exists client_email_resolved_idx on sheet_sync.client_email_associations(resolved_user_id);
revoke all on all tables in schema sheet_sync from public;
`;
export const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export type RegistryClient = { clientId: string; spreadsheetId: string; sheetId: string; name: string; createdAt: string; lastSeenAt: string };
export function parseRegistry(values: unknown[][]): RegistryClient[] {
 if (JSON.stringify(values[0]) !== JSON.stringify(REGISTRY_HEADERS)) throw new Error("Unexpected registry headers");
 const ids = new Set<string>(), sources = new Set<string>();
 return values.slice(1).filter(row => row.some(cell => String(cell ?? "").trim())).map(row => {
  const [clientId, spreadsheetId, sheetId, name, createdAt, lastSeenAt] = row.map(cell => String(cell ?? ""));
  const key = JSON.stringify([spreadsheetId,sheetId]);
  if (!/^9JOBS-CL-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(clientId) || spreadsheetId !== MASTER_ID || !/^\d+$/.test(sheetId) || !name || !Number.isFinite(Date.parse(createdAt)) || !Number.isFinite(Date.parse(lastSeenAt)) || ids.has(clientId) || sources.has(key)) throw new Error("Invalid or conflicting registry identity");
  ids.add(clientId); sources.add(key);
  return {clientId,spreadsheetId,sheetId,name,createdAt,lastSeenAt};
 });
}
export async function mirrorRegistry(clients: RegistryClient[], db: PoolClient) {
 for (const row of clients) {
  // Conflicts must match BOTH identities; never reassign a permanent ID.
  const result = await db.query(`insert into sheet_sync.clients(client_id,source_spreadsheet_id,source_sheet_id,candidate_name,created_at,last_seen_at)
   values($1,$2,$3,$4,$5,$6) on conflict(client_id) do update set candidate_name=excluded.candidate_name,last_seen_at=excluded.last_seen_at
   where clients.source_spreadsheet_id=excluded.source_spreadsheet_id and clients.source_sheet_id=excluded.source_sheet_id returning client_id`,
   [row.clientId,row.spreadsheetId,row.sheetId,row.name,row.createdAt,row.lastSeenAt]);
  if (result.rowCount !== 1) throw new Error("Registry identity reassignment rejected");
 }
}
export async function approveClientAccount(userId: string, clientId: string, approvedBy: string, db: Pool) {
 if (!userId || !clientId || !approvedBy) throw new Error("Explicit approval required");
 const result = await db.query(`insert into sheet_sync.client_accounts(user_id,client_id,approved_by)
  select a.user_id,c.client_id,$3 from sheet_sync.verified_accounts a
  join sheet_sync.account_directory d on d.user_id=a.user_id cross join sheet_sync.clients c
  where a.user_id=$1 and c.client_id=$2 and d.email_verified=true and d.registration_status='verified'
  on conflict(user_id) do nothing returning user_id`,[userId,clientId,approvedBy]);
 if (result.rowCount !== 1) throw new Error("Account must be verified, unlinked and client must be available; existing/revoked mappings are not overwritten");
}

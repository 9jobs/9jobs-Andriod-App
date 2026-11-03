-- Reviewed additive schema. Do not apply to production without approval.

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
revoke all on all tables in schema sheet_sync from public;

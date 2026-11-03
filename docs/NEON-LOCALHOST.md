# Neon-backed localhost

The localhost backend and existing Admin Panel use the isolated Neon development
branch `codex/localhost-neon-20261103` in the existing project
`steep-hall-49133624`. Its database is `ninejobs_local_migrated`.
The existing production branch/database was not migrated, merged, or deployed.
Its existing data remains untouched. Clerk Development still owns authentication.

## Start

In separate terminals:

```powershell
cd D:\9jobs-App\backend
npm run dev:local
```

```powershell
cd D:\9jobs-App\backend
npm run dev:admin
```

For the existing Android/phone development launcher and terminal QR:

```powershell
cd D:\9jobs-App\mobile
npm run android
```

Do not start a second backend/Admin instance if the corresponding port is already
occupied. Backend: http://127.0.0.1:3100; Admin: http://localhost:3001.
`/health` reports `databaseProvider: neon` and `databaseMode: neon-development`.
This identifies the selected configuration; the verified migration and runtime
SQL checks provide the separate evidence that database reads work.

## Private configuration and data safety

- `backend/.env.neon-local`: private development database connection, gitignored.
- `backend/.env.local-e2e`: existing Clerk Development settings; unchanged.
- `.work/neon-local/active.json`: explicit local target selection, pinned to this
  development branch's endpoint and database. Never points at production.
- `.work/localhost-e2e/platform-credentials.key`: existing encryption key, retained;
  restore it together with database backups if encrypted records need recovery.
- Existing loopback test scripts retain their isolated local configuration.
  Test/migration commands must not be repointed at production.

The initial local dump was restored into a new empty Neon database, with no
`--clean`, truncate, delete, or account overwrite. All 44 application tables were
verified against the frozen local restore with matching row counts/checksums.
Matching source timezones are necessary for timestamp checksum comparison.
Original data and local recovery database are retained. The migration script is
not an ongoing importer and refuses a changed/nonmatching destination.

The local JSON feature data was separately copied into `legacy_store.state`.
All 30 legacy operations use a PostgreSQL transaction in this selected runtime.
A row lock prevents concurrent lost updates; an error rolls back and does not
fall back to writing JSON or contacting Supabase. This small compatibility store
preserves existing behavior; it is not a high-volume analytics store.
The normal relational jobs, accounts, chat, documents and subscriptions continue
using their existing PostgreSQL tables/adapters. The installed Supabase-shaped
query API remains a compatibility interface; external Supabase auth/storage is
blocked in this development runtime.

## Automatic ingestion

The existing read-only Duplicate Sheet worker starts with the backend. Its default
interval remains 900 seconds, with the existing stale-cache request signal,
session advisory lock, failure backoff and last-successful-data retention. It uses
the direct Neon endpoint because its lock requires session affinity. No trigger
was recreated. Master-to-Duplicate automation is still outside this change.
The computer/backend and internet connection must remain available.

## Evidence and rollback

Private evidence lives under `.work/neon-local/verified-migration.json` and
`runtime-verification.json`; the verified original local restore evidence lives
under `.work/localhost-e2e/backups/0c62a772238f/`.
The tests run in a newly created isolated validation database, never production:

```powershell
cd D:\9jobs-App\backend
npm run test:persistence
npm run typecheck
```

To choose the retained loopback database again, stop the local backend and Admin
processes and **rename** `.work/neon-local/active.json` to
`active.neon-paused.json`, then restart the local launchers. This preserves Neon
data too. It does not copy later Neon updates back into the older local database;
back up/reconcile those changes before treating a rollback as a data cutover.

Real post-cutover Clerk login and Android visual interaction still require a
genuine user session; unauthenticated rejection tests do not establish that result.
No Google Sheet, production deployment, or production authentication setting is
changed by these launchers.

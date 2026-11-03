# Client ID delivery — 2 November 2026

Local implementation and isolated tests only. Production activation is stopped.
No live Master/Duplicate cells, live database data/schema, Google permissions,
triggers, authentication configuration, backup system or deployments were changed.
No commits or pushes were made. Pre-existing staged/uncommitted work was retained.

## Results

- Backend: 19 tests passed, including real localhost PostgreSQL transactions and
  authenticated HTTP requests with signed fixture Clerk JWTs. Clerk REST/JWKS
  responses were mocked; no real client account/password/OTP was used.
- Mobile: 13 tests passed across four focused suites. Jest used forceExit because
  existing session-provider timers remain open; this is not a device smoke test.
- Admin: nine authentication-helper tests passed with mocked HTTP responses.
- Backend, Admin and mobile TypeScript checks passed with no emitted build.
- Admin UI equivalence compares the TypeScript AST's JSX nodes against the pre-edit
  backup, allowing the required server-authentication logic changes. Mobile provider
  equivalence permits only session/token transport logic. No JSX, fields, badges,
  screens, styles or navigation were added or changed by this implementation.
- A local database dump restored into a new localhost database. All 12 table
  counts and SHA-256 fingerprints matched. All 59 pre-edit code backup files
  restored with matching SHA-256 hashes. No existing database was dropped/cleared.
- The existing cached export still has its original SHA-256:
  `2d78fd5965b482b69604177c662ab83a1afed0bc30b3eb4381e404d0ec81c458`.
  It contains 35,122 job rows and 65 normalized names. No live row-count claim
  is inferred from that October 31 cache.

The Apps Script replacement runs in a local JavaScript fixture with read-only
Master objects and destructive methods that throw. Real Google-hosted Apps
Script calls, consent, quotas and elapsed execution times remain untested.
Real Clerk client logins, production mappings and Android device screens remain
activation smoke tests. No real 65-client registry was created in Google Sheets.

## Required test matrix

| # | Requirement | Isolated evidence |
|---|---|---|
| 1 | Existing 65 candidates get unique IDs | 65 synthetic source-sheet identities produce 65 distinct prefixed UUIDs; database constraints enforce uniqueness. |
| 2 | Preserve 35,122-record baseline | Complete generation/import has 35,122 memberships; original snapshot remains intact after subsequent versions. Cached real export hash also remains unchanged. |
| 3 | Repeated sync retains IDs | Repeated generation and import retain IDs and source records; unchanged parts/views are reused. |
| 4 | New candidate gets ID | New fixture candidate with a job appears with a new ID and total grows to 35,123. A second zero-job candidate also receives an ID. |
| 5 | Rename retains ID | Changing source title keeps source sheet ID/Client ID and database ownership. |
| 6 | Duplicate names stay separate | Two source sheets share a display name and an identical job occurrence; account reads have disjoint authorized record IDs. |
| 7 | Registration stores actual identity | Spoofed request names/emails/roles/IDs are ignored; signed subject plus trusted verified-email lookup supplies the saved account. Existing subscription survives repeat login. |
| 8 | Unlinked registration has no jobs | Verified-but-unlinked user gets zero jobs/null version. Unverified directory account cannot be mapped. |
| 9 | Mapped user sees own jobs | Two real local database mappings return their exact source-sheet job counts. |
| 10 | Request tampering cannot cross clients | Forged request IDs/names, legacy JWTs, wrong issuer/session, revoked session/mapping and pinned historical reads are rejected or return no data. |
| 11 | Admin gets account information | Admin-only directory returns authenticated names, verified emails, registration/mapping status. Existing profile API hydration replaces spoofed profile identity with trusted identity without changing layout. |
| 12 | Android/Admin UI unchanged | Source-equivalence tests and typechecks pass. Physical-device and real browser login tests are not claimed. |
| 13 | No Master modification | Master fixture rejects every mutation; all source cell arrays remain identical. Local patch only reads the real Master after activation. No live script execution occurred. |
| 14 | No Duplicate data loss | Pre-existing fixture tabs, formulas and markers remain byte-equivalent. Interrupted writes preserve committed data; shrinking, conflicting, stale and incomplete imports cannot replace the head. |
| 15 | Backup and two-hour schedule preserved | Fixture protects both trigger IDs; separate candidate refresh and pause gate tested. Live two-hour trigger was inspected read-only. The separate daily backup is still unverified. |

Additional checks exercise transaction rollback, concurrent-import advisory locks,
literal formula-like source text, source changes during extraction, journal/view
retries, unknown helper classification and immutable source identity conflicts.

## ID and authorization proof

UUIDs are generated only in the Duplicate's Client_Registry by the authorized
Apps Script account. The source spreadsheet+sheet ID is the matching key. Names
are display metadata. Unknown layouts enter Client_Registry_Review rather than
getting an ID. Trusted template signatures support future and zero-job clients.

The read-only service account fetches a completed generation and its provenance.
The private database mirrors the registry; snapshot record ownership joins
`client_record_owners.client_id` to `client_accounts.client_id` and the verified
Clerk subject. Client request fields and recruiter/contact emails never select
ownership. No new UI field or account-claim endpoint exists.

## Application/code files changed

Modified existing files (relative to the pre-edit backup, not Git HEAD):

- admin-next/src/App.tsx — Clerk bearer forwarding and server-confirmed password authentication; existing form/layout unchanged.
- admin-next/src/lib/adminAuth.ts — remove bundled password and frontend password verification; request a server-confirmed token.
- admin-next/src/lib/adminAuth.test.ts — test server rejection, confirmed admin role and absence of a bundled password.
- backend/src/middleware/auth.ts — accept only verified, issuer-bound backend JWTs.
- backend/src/middleware/sheetIdentity.ts — signature and active Clerk session verification.
- backend/src/routes/auth.ts — trusted account exchange, preserving profile state.
- backend/src/routes/database.ts — authenticated identity hydration for existing profile responses.
- backend/src/routes/sheetSync.ts — verified account persistence and admin directory API.
- backend/src/routes/tracker.ts — authenticated names/emails in existing personal-info results.
- backend/src/services/sheetStore.ts — provenance validation, transactional registry mirror and permanent ownership joins.
- backend/scripts/inspect-duplicate-sheet.cjs — opt-in, allowlisted read-only protocol reads.
- backend/scripts/import-duplicate-sheet.cjs — disable the legacy name-only importer by default.
- backend/tests/sheet-pipeline.test.cjs — explicit opt-in gate on the old cloud-writing test.
- mobile/lib/data/backend-auth-token.ts — forward active Clerk session; reject stale account responses.
- mobile/providers/SessionProvider.tsx — register/clear token getters; no private transport for local demo identities.
- mobile/tests/unit/session-provider.test.tsx — assert demo stays local.
- mobile/tests/unit/session-provider-clerk.test.tsx — mocked Clerk token/fetch transport.

New files:

- backend/apps-script/ClientSync.gs
- backend/migrations/20261102_client_registry.sql
- backend/src/services/clientRegistry.ts
- backend/src/services/verifiedAccount.ts
- backend/scripts/client-generation.cjs
- backend/scripts/client-operation-target.cjs
- backend/scripts/sync-client-generation.cjs
- backend/scripts/approve-client-account.cjs
- backend/scripts/backfill-clerk-accounts.cjs
- backend/scripts/verify-client-id-restore.cjs
- backend/tests/helpers/apps-script-fixture.cjs
- backend/tests/client-registry-script.test.cjs
- backend/tests/client-registry-local.test.cjs
- mobile/tests/unit/backend-auth-session.test.ts
- backend/CLIENT_ID_ACTIVATION.md
- backend/CLIENT_ID_DELIVERY.md

## Evidence and reproduction

Private, ignored local artifacts:

- `.work/client-id-phase3-backup/manifest.json` — pre-edit code checksums.
- `.work/client-id-restored-code/` — isolated restored code copies.
- `.work/client-id-validation/backend-final.tap` — backend test output.
- `.work/client-id-validation/mobile-final.txt` — mobile test output.
- `.work/client-id-validation/admin-final.txt` — Admin test output.
- `.work/client-id-validation/client_ids_*/evidence.json` — per-run synthetic database/authorization evidence.
- `.work/client-id-validation/client_ids_*/restore-evidence.json` — full restore table counts/hashes and dump reference directory.

To repeat the backend tests, start the existing isolated PostgreSQL cluster on
127.0.0.1:55439 with role client_id_test. This cluster is in
`.work/client-id-postgres`; it contains synthetic test databases only. From
backend, run:

```powershell
node -e "require('./tests/client-registry-local.test.cjs');require('./tests/client-registry-script.test.cjs');require('./tests/duplicate-sheet-preflight.test.cjs');require('./tests/sheet-source-consistency.test.cjs')"
npm run typecheck
```

The local integration test creates a new uniquely named database on localhost.
It cannot take a cloud DATABASE_URL. The old cloud pipeline test is not run.
For recovery reproduction, take the generated `client_ids_<12 hex>` name from
its evidence file and run `node scripts/verify-client-id-restore.cjs <name>`.
It creates a new restore database and retains the dump; it never clears one.
Windows process restrictions may require permission to launch pg_dump/pg_restore.

From mobile:

```powershell
npm test -- --runTestsByPath tests/unit/backend-auth-session.test.ts tests/unit/sheet-records.test.ts tests/unit/session-provider-clerk.test.tsx tests/unit/session-provider.test.tsx --silent --forceExit
npx tsc --noEmit --incremental false
```

From admin-next: `npx tsc --noEmit --incremental false`.
The nine Admin auth tests run with
`npm test -- src/lib/adminAuth.test.ts --pool=threads --maxWorkers=1 --minWorkers=1`.
The local PostgreSQL helper was stopped after testing; all test databases/dumps
were retained. To restart it in PowerShell:

```powershell
& 'C:/Program Files/PostgreSQL/18/bin/pg_ctl.exe' -D 'D:/9jobs-App/.work/client-id-postgres' -l 'D:/9jobs-App/.work/client-id-postgres.log' -o '-h 127.0.0.1 -p 55439' -w start
```

## Production gate

See CLIENT_ID_ACTIVATION.md for the exact pause/recovery, authorization,
backup/restore, migration, mapping, deployment and two-hour reactivation sequence.

The provided backup URL points to the same Master Sync project; both its project
trigger page and account-wide My Triggers show only hourlySyncStaged. This does
not prove the separate backup is absent; it may be owned by another account.
Its correct project URL and a verified restore are still required before release.

Production approval has not been requested as an immediate deployment action:
fresh live recovery verification and Google-hosted isolated/device smoke tests
remain prerequisites. No production change is authorized by this delivery.

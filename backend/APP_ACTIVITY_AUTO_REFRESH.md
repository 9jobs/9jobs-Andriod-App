# Localhost source activity and automatic refresh

> Historical Mahir-only stage. The current all-source worker, 15-minute schedule and approved-email onboarding are documented in `FULL_AUTOMATION_LOCAL.md`; its instructions supersede the earlier two-minute schedule below.

Implemented November 2, 2026. Scope: the existing isolated localhost database and approved account mappings only. No production activation.

The actual Pixel 7 Mahir session displays **10 Cold Emails Sent**, **10 Contacts Reached**, and **66 Applied** in the existing Tracker. Screenshot: `../.work/localhost-e2e/tracker-outreach-verified.png`. The same authenticated app and navigation were retained.

The current reconciled read-only source contains 72 Mahir records: 66 explicitly Applied, 10 email Sent, 11 distinct meaningful contact names, 9 message Sent, and 1 message Shared. The eleventh contact has no recorded outreach, so it is available as an added contact and is not counted as reached. Six records have no explicit Applied status; they are preserved without inventing one. Dates and links remain in the source job details. Source Email=Sent is never treated as a login or recruiter email address; Contact names are never phone numbers. No send timestamps, replies, interviews or offers were inferred.

## Automatic behavior

`node scripts/start-localhost-e2e.cjs` now starts the backend and local refresh worker together. The worker performs a refresh at startup and waits two minutes after each completed cycle before the next. It reads All_Jobs and Candidate_Index twice, 30 seconds apart, then reconciles the allowlisted candidate view and hyperlinks. The existing app polls in the foreground (15 seconds in this local development configuration; 60 seconds when live transport is enabled with sheet integration). Changes normally appear within about three minutes after the Duplicate becomes consistent, while the backend, local database and app are running. This is not a Windows boot service or cloud scheduled task.

The worker derives recipients from existing active administrator-approved mappings in the local database. It follows source spreadsheet ID + numeric tab ID, keeping the permanent Client ID through a rename. It accepts new rows for that approved candidate without a new per-import count approval. It never creates or approves account mappings, and never assigns private data based only on name/email supplied by the app. New/unlinked accounts still need one explicit secure approval; matching a recruiter/contact email would be unsafe.

The worker uses the existing Google service account with `spreadsheets.readonly`. It neither creates a live registry nor touches either spreadsheet, Google triggers, account permissions, backup projects, Clerk configuration, or deployments. The old failing trigger is not recreated. Google source writes are unavailable in this reader.

Transactions, a singleton worker advisory lock, and the existing import transaction lock protect retries and concurrent refresh. Records and historical snapshots are retained; the active head changes only after a successful transaction. A count reduction, missing/ambiguous source identity, inconsistent source, stale validation or revoked mapping prevents replacement. The previous committed dataset remains available. Record edits may create new retained historical versions rather than overwrite old rows.

Status is in ignored `.work/localhost-e2e/approved-refresh-status.json`. A healthy cycle was observed at 10:12:40 UTC, followed automatically by another at 10:15:18 UTC; both retained the exact same 72-row Mahir snapshot and permanent ID. No live source rows were added for testing.

## Backend and existing UI

The authenticated `/api/mobile/snapshot` merges source applications, contacts and sent-email evidence with existing data and exposes `sourceActivity` counts, including messages Sent/Shared. Ownership still comes from the verified session and approved mapping. Client-supplied ownership parameters do not grant access.

The existing admin-only `/api/admin/client-accounts` now includes `source_activity` alongside trusted account information and mapping status. It remains admin protected. Existing Admin UI layouts were not edited. Its legacy counters that query only physical `applications` rows are not redesigned or replaced; source statistics are available in this authorized backend response. Dedicated new badges for messages/contact additions were not added. Source outreach statuses are not inserted into Chat as fabricated messages. Browser automation is currently disabled in Work settings, so this turn's new admin response was checked by isolated HTTP/database tests rather than a fresh browser login.

## Validation

- 13 focused backend tests passed, including a new disposable local PostgreSQL database: new rows, repeat idempotence, rename/stable ID, another candidate's active ownership and data preservation, count reduction, transaction rollback, revoked mapping, unlinked access, and exact activity semantics.
- Existing isolated PostgreSQL/HTTP account-security integration test passed, covering server-verified fixture identities, ownership tampering, unauthenticated requests and admin restrictions. These test fixtures do not alter or bypass real Development authentication.
- 16 mobile tests passed across source activity, live-sync and mobile-sync-repository suites.
- Backend and mobile TypeScript checks passed.
- Fresh automatic read-only refresh reconciled the actual source. Before/after local manifests preserve all **35,195 record IDs/content hashes** and all **67 permanent client identities**. Evidence: ignored `refresh-preservation-proof.json` and `refresh-before.private.json` in `.work/localhost-e2e`.
- Real emulator screenshot confirms the new 10/10 counters through Mahir's existing login. No fake session was created. A new registration or a second real unlinked-account login was not performed in this turn.

## Files changed for this extension

- `scripts/refresh-approved-local-clients.cjs`: local-only read-only recurring refresh.
- `scripts/start-localhost-e2e.cjs`: start worker with existing local backend.
- `src/services/localCandidateImport.ts`: approved refresh guard, transactional count protection and stable tab rename metadata.
- `src/services/sheetApplications.ts`: truthful source activity and safe address/phone classification.
- `src/routes/tracker.ts`: authorized activity overlay in existing snapshot.
- `src/routes/sheetSync.ts`: admin-only source statistics.
- `../mobile/lib/data/live-sync.ts`: existing counts accept explicit source evidence without invented dates or responses.
- `../mobile/lib/data/mobile-sync-repository.ts`: retain source activity metadata.
- `tests/approved-local-refresh.test.cjs`, `tests/approved-refresh-database.test.cjs`, `tests/sheet-applications.test.cjs`, `../mobile/tests/unit/sheet-activity-summary.test.ts`: regression coverage.

## Running locally

Backend: `http://127.0.0.1:3100`. Admin: `http://localhost:3001`. Existing Metro: `http://127.0.0.1:8095`, Pixel 7 on emulator-5554. To restart backend and its worker, run `node scripts/start-localhost-e2e.cjs` from `D:\9jobs-App\backend`; do not run a second copy while port 3100 is occupied. Existing ignored secret files are used privately. Do not use the production start/deploy or migration commands for this test.

Master was never accessed or modified during this extension. Duplicate access consisted only of read-only GETs. No existing database records were deleted, no new UI screens/layouts were created, and no production writes or deployment occurred.

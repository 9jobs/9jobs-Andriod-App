# 9JOBS automatic client pipeline — localhost delivery

Implemented and tested on November 2, 2026. This document supersedes the earlier Mahir-only two-minute refresh instructions. Production activation is not authorized.

## Current source and identity boundary

Fresh read-only inspection of Client_Summary found **65 candidate tabs and 35,155 genuine source records**, including **72 Mahir records**. This is the available Duplicate, rather than an assumed count of 100+ or the older synthetic baseline.

The existing local database also contains 66 synthetic fixture client identities and 35,123 fixture jobs. They were retained. There are now 65 actual Duplicate source identities plus those 66 fixture identities: **131 permanent IDs and 70,278 active records** in the isolated environment. These totals must not be presented as 131 real clients or 70,278 real spreadsheet jobs.

Each actual source is identified by the approved Duplicate spreadsheet ID and its numeric candidate tab ID. Candidate_Index must link to that exact tab in the same spreadsheet, and the tab must carry its existing candidate-view marker. Its job rows, multiplicity, fields and working HTTP(S) links are reconciled against All_Jobs. Names are labels, never ownership keys. IDs use `crypto.randomUUID()` with the `9JOBS-CL-` prefix and unique database constraints; previous IDs are reused.

Same account display names are supported when the source has independently identifiable tabs and unambiguous row groups. If two actual candidates have been collapsed into the same name-only All_Jobs group, the reader cannot reconstruct their ownership: those sources remain held/unlinked. Other unambiguous sources can continue. Missing index links, helper tabs, changed identity, count reductions and inconsistent working links are held for review.

Renaming the same tab preserves its permanent ID. Returning with the same tab ID also preserves it. A deleted/recreated tab has a different identity; a possible replacement is held for one-time administrative source verification instead of being merged by name. Original Master tab provenance is not available in this Duplicate and is never invented.

**Master-to-Duplicate automation is not restored.** The old Apps Script trigger remains deleted. The backend automatically ingests changes that actually appear in the Duplicate. It cannot ingest new Master data that has not reached the Duplicate.

## Persistent worker and freshness

The existing `scripts/start-localhost-e2e.cjs` starts the backend and upgraded existing worker together. The worker runs at startup and automatically after restart; no separate import command is needed per account or login.

- Default scheduled start interval: **900 seconds / approximately 15 minutes**, configurable from 600 to 86,400 seconds using `LOCAL_SHEET_SYNC_INTERVAL_SECONDS` in ignored `backend/.env.local-e2e`.
- Login/private job fetches perform a lightweight database freshness signal when the last successful scan is older than ten minutes. They return cached authorized data and never perform a Google import in the request.
- The worker checks coalesced refresh requests every 15 seconds. A failure uses bounded exponential backoff, starting at 30 seconds and capped by the configured interval.
- Google reads are paced at least 1,100ms apart (default 1,200ms), with bounded 429/5xx/network retries. Up to ten candidate ranges are read in each GET batch.
- Two raw source samples 30 seconds apart and final metadata/index/content revalidation detect concurrent source changes. Each candidate independently reconciles its view.
- Durable candidate fingerprints/checkpoints mean unchanged candidates do not require a full view import. Repeated reads do not create additional jobs or Client IDs.
- Singleton and publication advisory locks, a source timestamp guard, 500-row SQL batches, retained historical records/snapshots and one atomic head update prevent overlap and partial publication.
- A failed generation leaves the previous committed data accessible. New associations never bypass verified Clerk authentication.

This operates while the local backend, local PostgreSQL and computer are running. It is not a Windows boot service or an always-on production deployment.

## Dates and source activity

The Duplicate contains mixed historical display formats, including textual months and numeric dates that can mean either day/month or month/day. Raw All_Jobs strings remain unchanged in stored source fields. An additive backend annotation records the corresponding candidate-view date and a date-only ISO value only when the evidence resolves uniquely. No send time or timezone is invented.

The imported source currently has **31,884 corroborated dates** and **3,271 ambiguous/unknown dates**. Ambiguous dates and their complete job rows are retained; the backend does not fabricate a dated application event. Existing date-dependent Tracker counts may therefore exclude records without a reliable date or explicit application status. The raw dates remain available in job descriptions/source fields.

For Mahir, the source has 66 explicit Applied records, 10 email Sent statuses, 11 distinct meaningful contact names, 9 message Sent and 1 message Shared. Ten contacts have outreach evidence. The eleventh is an added contact, not an invented reached contact. Sent is not an email address, a contact name is not a phone number, and outreach messages are not fabricated as Chat messages. All 72 records and their source fields/links remain available through the private jobs API.

## Existing and new account workflow

1. Existing Clerk Development authentication verifies the session signature, active session and verified primary email server-side.
2. An existing active `client_accounts` mapping resolves automatically by trusted Clerk subject on every login. It is never reassigned by an email/name/Client ID in a request.
3. A new verified account may claim an exact previously approved `client_email_associations` row. The approval references a permanent Client ID; a source spreadsheet ID + tab ID can be supplied during review to resolve that ID.
4. A transaction and unique constraints bind the approval to one subject/client. Consumed, conflicting or revoked mappings cannot be silently reused or reactivated.
5. Unknown/unverified accounts remain pending or are rejected; they cannot read candidate jobs.

The source spreadsheet does not provide a trustworthy login-email association. **A trusted, administrator-reviewed bulk email-to-source list is still required for other clients.** Recruiter/contact emails or matching display names cannot replace this one-time ownership verification. Mahir's previously approved mapping remains active without further approval.

## One-time bulk approval, without new UI

Existing Admin authentication protects these additive backend operations:

- `GET /api/admin/sheet-sync/automation`: health, last attempt/success, counts, held cases and source IDs/Client IDs.
- `GET /api/admin/client-accounts`: trusted registered names, verified emails, mapping and source activity.
- `POST /api/admin/client-email-associations`: review by default; apply requires `approve:true` and the exact returned `reviewDigest`. The approving subject comes from the authenticated administrator, never the body.

Example review body (illustrative values only):

```json
{
  "associations": [
    {
      "email": "approved-client@example.invalid",
      "sourceSpreadsheetId": "1KM8Jr2zjiGNRJJNorqIQHdlNc9-YMiTx_xmXZizVKvU",
      "sourceSheetId": "123456789"
    }
  ]
}
```

Alternatively supply `clientId` instead of the source pair. Review reports conflicts before any approval. Applying the identical list again is idempotent. An unknown source, reused email/client, existing different mapping, revoked mapping or changed digest blocks approval.

The local operator alternative reads a private JSON array inside `.work`:

```powershell
cd D:\9jobs-App\backend
node scripts/onboard-client-emails.cjs D:\9jobs-App\.work\approved-client-emails.json
# Review the generated private report before explicitly applying its exact digest:
node scripts/onboard-client-emails.cjs D:\9jobs-App\.work\approved-client-emails.json --approve --review-digest <reviewed-digest>
```

Do not put passwords, OTPs, tokens or service-account credentials in this list. No bulk approvals for unknown clients were invented or applied during this task.

No Admin or Android UI components, fields, pages, badges, styles or navigation were changed in this extension. New health/mapping information stays in protected backend endpoints. Legacy Admin counters reading only physical `applications` rows are not a substitute for source statistics in these endpoints. Existing job detail/source descriptions preserve available positions, companies, dates, job links, recruiter/contact values, email/message statuses and raw unsupported URI values. There are no newly added UI badges for message Sent/Shared, added-contact totals, or source ambiguity. No offers, interviews or rejection outcomes were inferred.

## Evidence and tests

Final checks: **27 backend integration/security tests and 16 mobile tests passed (43 total)**. Backend TypeScript and diff whitespace checks passed. The final normal backend's restart scan took approximately **49.7 seconds**, reported healthy / 65 unchanged / 0 changed, and retained the identical snapshot. This is measured for the current 65-source Duplicate; the 500-client result is an isolated SQL/identity test, not a claim of 500 live Google clients tested.

- Before activation, the local database was backed up and restored into `9jobs_local_e2e_restore_82da790666c4`. Counts/checksums of **37 tables matched**. Backup/evidence: ignored `.work/localhost-e2e/backups/82da790666c4`.
- All **35,195 pre-existing record IDs/content hashes** and **67 pre-existing permanent client/source identities** remain preserved. `automatic-preservation-proof.json` records the before/after inclusion proof; newly imported source records account for the growth.
- Full actual source generation completed: 65 sources, 35,155 source rows, no held candidates. A backend restart automatically rechecked the source and reported **0 changed / 65 unchanged**, the identical snapshot, and no duplicate imports.
- Isolated PostgreSQL generation tests cover 500 source clients, 500 permanent unique IDs, cached repeat with one snapshot, new/zero-job candidates, renamed tabs, duplicate display-name isolation, ambiguous label rejection, approved-email auto-linking, unknown emails, repeated trusted-account resolution, conflicting/revoked mappings, rollback, last-good data and freshness coalescing.
- Isolated HTTP tests exercise actual verification code with explicitly labelled identity fixtures: admin-only review/approval, digest conflicts, forged identity fields, unauthenticated rejection, cross-client access and active-session verification. These fixture tests are not presented as real Clerk users.
- Real Android-originated Mahir requests were observed and independently verified with the real Development Clerk session. Private API returned 72 Mahir-only records; two real verified token exchanges retained the same mapping; forged ownership/email/role fields did not change it; admin reads and approvals returned 403; unauthenticated private requests returned 401; the existing mobile snapshot returned 66 source applications and the exact source activity counts.
- Current real emulator Home displays Mahir Julka and 66 Applications after reconnecting the restarted emulator to ports 3100/8095. Earlier existing Tracker verification also displayed 10 Cold Emails Sent and 10 Contacts Reached. Screenshot: ignored `.work/localhost-e2e/automatic-tracker-real.png`. The recent proof is a real existing session, not a fake login.

**Remaining real-user checks:** a second authorized Development client email and exact source identity have not been provided. Its one-time approval and genuine emulator login therefore remain pending. The current turn has repeated real verified-session exchanges, not a claimed manual logout/re-login. A fresh Admin browser check is also pending because local browser automation is disabled in Work settings; the user was asked to refresh the existing Admin Users page. Prior real Admin login/listing was verified earlier, and the new routes are covered by isolated HTTP tests. Do not represent these pending checks as passed.

## Files changed for this implementation

- `src/services/automaticSheetSync.ts`: linked source discovery, view/date reconciliation and transactional generation publication.
- `src/services/clientRegistry.ts`: additive associations, checkpoints, health/events and indexes.
- `src/services/clientEmailAssociations.ts`: reviewed bulk associations and verified-account auto-linking.
- `src/services/localSyncFreshness.ts`: lightweight coalesced stale-data requests.
- `src/services/verifiedAccount.ts`: resolve approved associations after trusted verification.
- `src/services/sheetStore.ts`: additive date evidence and authorized job responses using it.
- `src/services/sheetApplications.ts`: safe interpretation of historical dates without guessing ambiguous values.
- `src/routes/sheetSync.ts`: protected health and administrative review/apply endpoints.
- `scripts/inspect-duplicate-sheet.cjs`: allowlisted read-only candidate batches.
- `scripts/sheet-source-consistency.cjs`: stable reads with independent candidate isolation; strict legacy validation remains available.
- `scripts/refresh-approved-local-clients.cjs`: upgrade the existing worker to discover/import all valid source clients, with pacing, scheduling, backoff and persistent checkpoints.
- `scripts/start-localhost-e2e.cjs`, `scripts/localhost-e2e-config.cjs`: local startup and bounded configuration.
- `scripts/onboard-client-emails.cjs`: one-time private local bulk onboarding.
- `scripts/backup-localhost-e2e.cjs`: local backup/isolated restore verification.
- `tests/automatic-pipeline.test.cjs`, `tests/helpers/automatic-source-fixture.cjs`, `tests/client-registry-local.test.cjs`, `tests/duplicate-sheet-preflight.test.cjs`, `tests/sheet-applications.test.cjs`: integration, source-format, identity and security coverage.

Temporary real-session observation code and proofs stay in ignored `.work`; tokens were used in memory only and were never printed or saved. The normal final backend is started without the temporary observer.

## Exact localhost startup

The existing isolated PostgreSQL cluster must be available on `127.0.0.1:55439`. Its data directory is `D:\9jobs-App\.work\client-id-postgres`. Do not reinitialize it or rerun fixture setup/import scripts. If the computer was restarted and PostgreSQL is stopped, use the existing installed PostgreSQL tools:

```powershell
& 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe' -D 'D:\9jobs-App\.work\client-id-postgres' status
# Only if stopped:
& 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe' -D 'D:\9jobs-App\.work\client-id-postgres' -l 'D:\9jobs-App\.work\localhost-e2e\postgres.log' start
```

Run each service once in its own terminal. They are already running at delivery; do not start duplicates on occupied ports.

```powershell
cd D:\9jobs-App\backend
node scripts/start-localhost-e2e.cjs
```

Backend: `http://127.0.0.1:3100`; the worker starts automatically. Existing ignored `.env.local-e2e` provides Development Clerk configuration and optional `LOCAL_SHEET_SYNC_INTERVAL_SECONDS=900`. Existing `.env.sheets.local` privately references the existing Viewer service account. Keys do not go into frontend files or onboarding lists.

```powershell
cd D:\9jobs-App\backend
node scripts/start-localhost-admin.cjs
```

Admin: `http://localhost:3001`, existing UI/login.

```powershell
cd D:\9jobs-App\backend
node scripts/start-localhost-mobile.cjs
```

Metro: `http://127.0.0.1:8095`. With the existing Pixel 7 emulator running:

```powershell
$adbTool = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
& $adbTool -s emulator-5554 reverse tcp:3100 tcp:3100
& $adbTool -s emulator-5554 reverse tcp:8095 tcp:8095
& $adbTool -s emulator-5554 shell am start -a android.intent.action.VIEW -d 'ninejobs://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8095' com.ninejobs.mobile
```

Existing mapped accounts use their existing login; no Client ID entry or repeated approval is required. Routine source changes need no Codex/import/restart. Health is available through the protected automation endpoint and ignored `approved-refresh-status.json`. No production migration/deploy, Google Sheet writes, permission changes, Apps Script triggers or daily backup changes were performed. Original Master was not accessed.

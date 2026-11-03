# Duplicate Sheet integration — local live-test report

## Current result

The latest real Duplicate Sheet read contains **35,122 source records / 65 candidate labels**, now imported in the isolated Neon branch. The existing admin dashboard and Opportunities screen read that store. Candidate search runs across the complete imported dataset, with 200 source rows rendered per search to avoid rendering 35k table rows. All pages remain available through the authenticated API.

**The complete real-account Android client flow is not yet fully tested.** The Pixel_7 emulator and existing development client were started with Expo port 8095 and the isolated backend. The existing Home/Profile screens opened as the prior Test User, with no private Mayank records exposed. The existing sign-out/sign-up flow is being used for the requested Mayank account test. No real client account has been assigned source records by guessing its name/email. Password/phone/privacy-consent/OTP steps require the account owner's input; no such values were invented or bypassed.

The latest source passed a staged consistency policy: all 65 index counts reconcile, and two complete source samples matched across a 30-second quiet interval. This accepted the snapshot for the **isolated test environment**. It does not prove Apps Script finished a run; production release still requires review of the source completion protocol/timing and explicit deployment approval.

Production has not been deployed or migrated. Existing production users, applications, statuses and other records were not changed. No sheet was created or modified. The original Master Sheet, hourly Apps Script and daily backup were not accessed/changed.

### Approved Mayank pairing

The workspace user supplied and approved Mayank Sodhi's login email. That approval is now stored in the isolated database's private `sheet_sync.email_approvals` table; the exact address stays in the private database rather than this repository report. The current review dataset contains **8,472 Mayank records**. Approval has not created a login account or granted an unverified identity access.

The isolated database had no profile for the supplied email. This does **not** prove that the account is absent from Clerk; the backend has no configured Clerk server secret to look it up, and the existing browser Clerk dashboard required administrator sign-in. The approval is therefore pending verification of the real Clerk subject.

`src/services/sheetEmailMapping.ts` can resolve an approved email after a verified Clerk session: a server-side Clerk user lookup checks the exact subject and verified primary email, then binds the approved candidate to that subject transactionally. Without `CLERK_SECRET_KEY`, it does not guess or grant access. Approval cannot transfer automatically to a different subject, and revoked candidate mappings are not silently re-enabled. No client-provided email is trusted. Alternatively, the operator can confirm the exact Clerk user ID from the existing Clerk dashboard and explicitly approve that ID binding.

The Clerk dashboard sign-in page was left open for the workspace administrator. No candidate sign-in, OTP email, account creation, password change, secret creation or production mutation was performed.

The user subsequently requested creation of a new Mayank account through the existing app. The emulator now runs the actual development client against the isolated backend. The prior local Test User was signed out through the existing Profile button, and the existing Create account screen was prefilled with Mayank's supplied first/last name and email. Phone number, password/confirmation and Privacy Policy consent remain untouched for the account owner. Continue has not been submitted, no OTP has been requested, and account creation/sign-in is **not** claimed complete. Evidence: `.work/sheet-signup-ready.png`. After the owner completes the required private fields and verification, the real account subject and authorized source data still need to be checked.

## Verified source and storage

- Approved spreadsheet: `1KM8Jr2zjiGNRJJNorqIQHdlNc9-YMiTx_xmXZizVKvU` (`Client_Summary`). Only All_Jobs and Candidate_Index values are fetched; candidate worksheets are not imported.
- All_Jobs headers: Candidate, Applied Date, Serial No, Position, Company, Company URL, Job Link, Recruiter, Contact, Email, Message, Source Row.
- All twelve fields are retained without inventing statuses, application outcomes, scores, salary or location. Date representations are retained as supplied; they are not blindly converted.
- Full read: 35,089 rows, 65 candidate labels; no rows missing candidate, serial, position or company.
- One Candidate_Index count does not reconcile with All_Jobs. Earlier index-reported total was 35,081. Source rows therefore remain in **admin review**, rather than being silently published as a completed client dataset.
- Normalized candidate+serial has 33,412 collisions; normalized candidate+Source Row has 44 collisions; 674 links are missing; 424 source occurrences have identical first-eleven-field content. None were silently collapsed.
- Storage uses immutable source-content occurrences and versioned snapshot memberships. Reordering preserves snapshot identity; identical occurrences retain multiplicity. Changed content creates a new version while retaining history. These are source-version IDs, not claimed permanent application/business IDs. Existing application statuses are untouched.
- Staging branch: `codex/duplicate-sheet-live-test-20261031`, ID `br-dawn-truth-a7n0s78z`, within the existing project. It was created as an ordinary child branch of production, so it initially inherited the parent's database data/schema. Only this child received the additive sheet tables/import. The original/default branch was not modified.
- Private schema: `sheet_sync`; tables: snapshots, records, snapshot_records, head, candidate_mappings, email_approvals. The existing generic database adapter cannot query this schema, and PUBLIC schema/table privileges are revoked.
- Repeating the real import returned `unchanged: true` with 35,089 rows and the same snapshot. No extra source records were created.
- Private key contents were not copied into the repository. Key-path/test-database configuration lives only in ignored local env files; raw exports and screenshots live in ignored `.work/`. No Google credential is passed to admin/mobile clients.

## Admin/API behavior

- Existing admin UI/layout/styles/navigation remain intact. Source records are appended to the existing data-service result, not placed in the shared jobs catalog. Dashboard Live Opportunities includes the real source count; imported candidate labels are not fabricated login users.
- Existing search can locate candidate/company/position across all source rows. Initial/search response is capped at 200 source rows. This is not a new pagination UI.
- Added `GET /api/admin/sheet-sync/status`, `GET /api/admin/sheet-sync/records`, `GET /api/mobile/sheet-records`, and `GET /api/mobile/sheet-records/version`.
- Source-row update/delete through existing job write handlers is rejected. Imported source records are read-only; source changes are processed by the sync worker. Existing edit/delete controls were not redesigned.
- The configured deployed backend still returned `Cannot POST /api/database/query` / HTTP 404 during the earlier probe, despite the route existing in local source. Live local testing uses the corrected current backend on port 3100. A production deployment/routing fix remains separate and requires explicit approval.

## Authentication and client data binding

- Private endpoints reject legacy/demo JWTs that merely contain client-supplied user IDs/emails.
- Clerk session verification pins the configured issuer/JWKS and RS256 algorithm; validates expiry, session ID, issuer and authorized party; and obtains the user ID from the signed subject. No request-supplied email, candidate label or target user ID controls ownership.
- Production admin access to private endpoints requires a verified Clerk subject listed in server-side `SHEET_ADMIN_USER_IDS`. The existing password/preview token is accepted for sheet review only on the explicitly configured isolated test branch, with a separate strong local JWT secret. This preview method is not enabled for production sheet data.
- Client reads join the verified user ID against explicit approved candidate mappings and a completed source snapshot. Unmapped clients receive no private records. Revocation is checked on reads and version checks, including pinned historical snapshots.
- The app reuses its current Clerk provider, existing screens, snapshot cache and loading/error paths. A lightweight version/mapping check avoids re-downloading unchanged source pages; pagination pins a single immutable snapshot. Account changes abort stale private responses; sign-out clears the added in-memory cache. Existing dev polling remains; when sheet integration is enabled, production also checks through the existing query mechanism every 60 seconds.
- Source jobs enter the existing jobs data service only after authorization/publication. They are not inserted as confirmed applications. Tracker/application/interview/offer metrics are not inflated from raw job rows. Scores remain absent for source rows.
- Additional fields are retained in private `source_fields` and the existing description field; no new UI fields were added. Unsafe/non-HTTP job links are not made actionable, while the original value is preserved in source_fields.
- The original legacy token exchange still has broader pre-existing trust issues; it was not rewritten. Private sheet access is isolated from that insecure client-identity path. A broader authentication audit is not claimed complete.

## Automatic local review synchronization

`scripts/sync-duplicate-sheet-review.cjs --watch` is running locally: one-hour interval, database advisory-lock protection around the scheduled cycle, 60-second retry after failure, and bounded Google request retries. A complete automatic cycle was tested successfully. Empty/failed fetches preserve the prior export and imported data. Repeated identical data is not inserted again.

The staging worker now uses `--consistent`: both source samples must have valid schemas/nonempty records, complete required fields and reconciled candidate index counts; content (including raw Source Row references and repeat multiplicity) must stay identical across 30 seconds. The import recomputes the digest, rejects stale/edited evidence, and only accepts it for client reads when the ignored test configuration explicitly sets `SHEET_PUBLICATION_POLICY=reconciled-stable-reads-v1`. Four consistency tests pass, including changing/failed/empty/mismatched data and stale/tampered evidence.

This observation-based staging policy does not assert Apps Script completion. Production still needs its completion marker/window reviewed. Unstable samples remain review-only and cannot replace the last accepted client snapshot. The latest real cycle accepted 35,122 rows, with matching candidate counts and `sourceCompleted: true` in the internal snapshot acceptance flag. Client access still requires a verified approved account mapping. This is not instantly realtime. Local processes need this computer running; production/serverless scheduling has not been configured or deployed.

## Live test access and restart commands

Local admin: `http://localhost:3001`; local backend: `http://127.0.0.1:3100`. Both processes were started for this test. The browser tab was left open on the existing admin panel.

To restart backend in one PowerShell terminal:

```powershell
cd D:\9jobs-App\backend
node scripts/start-sheet-test.cjs
```

Start the admin in another terminal:

```powershell
cd D:\9jobs-App\admin-next
$env:VITE_BACKEND_URL = 'http://localhost:3100'
$env:NEXT_PUBLIC_SHEET_INTEGRATION_ENABLED = 'true'
npm run dev -- --port 3001
```

If the hourly worker has stopped, run in a third terminal (do not start another while one is running):

```powershell
cd D:\9jobs-App\backend
node scripts/sync-duplicate-sheet-review.cjs --watch
```

After an approved real mapping and completed source are available, Android testing uses `EXPO_PUBLIC_SHEET_INTEGRATION_ENABLED=true` and the local backend URL. For an Android emulator, use `http://10.0.2.2:3100`, or use `adb reverse tcp:3100 tcp:3100` and `http://127.0.0.1:3100`. These flags were not forced into the currently configured production mobile env. No Android device/emulator appeared in `adb devices` during this run.

## Validation results

- Real API read and database import: 35,089 records / 65 candidate labels.
- Repeat real import: same snapshot, `unchanged: true`, no added duplicates.
- Real browser: dashboard shows 35,089 Live Opportunities; existing Opportunities list shows real records; searching Mayank Sodhi returns source data from the full 8,472 matching rows, 200 displayed at once. Proof images: `.work/sheet-integration-dashboard.png` and `.work/sheet-integration-search.png`.
- Backend, admin and mobile TypeScript checks passed after the integration changes.
- Eight preflight tests passed (read-only allowlist/auth, schema/empty failures, collisions, 35k-row processing, reorder fingerprint and retry behavior).
- PostgreSQL + authenticated HTTP pipeline test passed in a separate synthetic validation schema in the test branch: repeat/reorder/changed/new records, cross-client query tampering, unmapped/legacy-token rejection, wrong issuer/origin, client-to-admin rejection, pagination bounds/pinned history, mapping revocation, failed-empty-import preservation, and concurrent-import lock rejection. Synthetic fixtures are not exposed by the real admin dataset; the validation schemas were retained without destructive cleanup.
- Five mobile data-service tests passed: verified active-account requirement, pinned pagination, token forwarding, logout/account-switch protection, snapshot-change rejection, version-cache reuse and mapping revocation.
- Android device UI, actual Clerk client logins A/B and their real mappings: **not tested**. Payment/subscription/Resume AI and other unrelated flows were not comprehensively retested; no claim is made that the entire application regression suite passed.

## Exact integration files

Backend: `src/app.ts`, `src/routes/auth.ts`, `src/routes/database.ts`, `src/routes/tracker.ts`, `src/routes/sheetSync.ts`, `src/middleware/sheetIdentity.ts`, `src/services/sheetStore.ts`, `src/services/sheetEmailMapping.ts`.

Scripts: `scripts/inspect-duplicate-sheet.cjs`, `scripts/fetch-duplicate-sheet.cjs`, `scripts/sheet-source-consistency.cjs`, `scripts/import-duplicate-sheet.cjs`, `scripts/start-sheet-test.cjs`, `scripts/sync-duplicate-sheet-review.cjs`, `scripts/approve-sheet-client.cjs`.

Tests: `backend/tests/duplicate-sheet-preflight.test.cjs`, `backend/tests/database-route-presence.test.cjs`, `backend/tests/sheet-source-consistency.test.cjs`, `backend/tests/sheet-pipeline.test.cjs`, `mobile/tests/unit/sheet-records.test.ts`.

Admin: `admin-next/src/App.tsx` (data/auth token binding, existing search and statistics only).

Mobile: `lib/data/sheet-records.ts`, `lib/data/backend-auth-token.ts` (honor configured local backend rather than redirecting it to production), `lib/data/mobile-sync-repository.ts`, `lib/data/live-sync.ts`, `providers/SessionProvider.tsx`, `features/mobile-sync/hooks.ts`, `types/jobs.ts`.

This report and ignored local files `.env.sheets.local` / `.env.sheets-test.local` were updated. Existing unrelated/staged repository changes were preserved; nothing was committed or pushed in this integration task.

## Remaining inputs and production steps

1. Mayank's email-to-candidate pairing is approved and saved. Confirm the actual Clerk user ID through administrator dashboard access, or configure server-side Clerk user lookup so a verified login can resolve the pending approval. No password is needed in chat. Other real client pairings remain unconfigured.
2. Confirm the existing hourly source refresh completion marker/window and investigate the one Candidate_Index mismatch. Confirm permanent record semantics before attempting any linkage to mutable existing application statuses; do not treat source version hashes as permanent business IDs.
3. Connect an Android phone or start the emulator and use the existing app login to complete real two-account UI tests.
4. Configure the real Clerk issuer, allowed origins, admin subject allowlist, secure Google credentials, and mappings for the approved target environment. Apply additive schema through the normal reviewed migration process to that environment and verify source completion/publication.
5. Only after those tests and **explicit production deployment approval**, deploy the backend route changes and a proper persistent/serverless scheduler. Do not move the local Windows Downloads credential path into a production bundle. Keep the original Master Sheet/Apps Script/backup untouched.

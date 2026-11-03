# Mahir localhost integration — current results

Status: real Mahir Clerk Development login, source import, client mapping,
backend isolation checks, Android Home/Tracker data, genuine Admin login and
existing Admin Users listing are verified. All 72 rows were checked through the
authorized API; native visual checks sampled the Tracker count and source rows.

## Source and approved identity

- Duplicate: `1KM8Jr2zjiGNRJJNorqIQHdlNc9-YMiTx_xmXZizVKvU`.
- Exact tab: **Mahir Julka**, stable Duplicate sheet ID `1777788595`.
- Fresh `All_Jobs` total: **35,155**. Mahir: **72** records in `All_Jobs`,
  `Candidate_Index`, and the candidate view. Two source samples reconciled.
- No similar/duplicate Mahir candidate was found. Candidate view cells,
  hyperlinks and hidden markers were re-read after import and unchanged.
- The Original Master sheet ID for this candidate is not present in the
  Duplicate evidence and was not invented. The user explicitly approved a
  local registry key based on the actual Duplicate spreadsheet + tab ID.
- Clerk subject: `user_3LXjfATXyHBQzEyfUR1THh1oJbI`.
- Trusted profile: **Mahir Julka**, verified `julkamahir10@gmail.com`.
- Approved Client ID: `9JOBS-CL-26f9dd69-0bcc-4aba-9614-c94388da3559`.

The user manually logged into the emulator. The localhost backend verified the
real Clerk signature, active session and primary verified email before the
operator applied the separately approved account mapping. The password supplied
in chat was not used, printed or stored. No fake Clerk sessions were created.

## Preserved source meaning

All 72 job rows, all 72 job URLs, 15 company hyperlinks, original source-row
references, recruiter/contact/email/message values and seven historical
application dates are retained. Dates range from 22-Aug-2026 to 14-Sep-2026.
No interview or offer outcomes were supplied or fabricated.

66 rows explicitly contain `Applied` in the source progress/recruiter cell;
six have no such status. The existing Home/Tracker application response includes
only the 66 proven applications. The private jobs endpoint supplies all 72
rows. Date-only values remain date-only; no application times were invented.
The original source strings are preserved in `source_fields` and description.
The existing UI may not present every source column independently; no new UI
fields were added, and missing source statuses are not inferred.

## Local data and recovery

The existing database remains the isolated `127.0.0.1:55439` test database used
by backend port 3100. A readable custom-format local recovery archive and
before-import hashes were retained privately before applying the import.

- Before: 66 fixture Client IDs and 35,123 fixture records.
- After: 67 Client IDs and 35,195 total stored records, including Mahir's 72.
- Every previous record hash and every previous client row remained unchanged.
- Reimport returned the same Client ID and same snapshot with `unchanged=true`.
- No existing snapshot, job, account or mapping was deleted or reassigned.
- The import creates a new combined snapshot retaining every unrelated member;
  earlier snapshots are retained for recovery.

The current dataset mixes retained synthetic fixtures with the newly imported
real Mahir rows. Its total is not claimed to equal the live Sheet total.

## Verified tests

Using Mahir's actual authenticated emulator requests, temporary localhost-only
instrumentation performed read-only tests without printing or persisting tokens:

- Private source endpoint: 200, exactly 72, all owned by Mahir.
- Changed user ID, Client ID and candidate parameters: still Mahir's 72 only.
- Search for a different fixture candidate: zero results.
- Mahir calling administrator account/record endpoints: 403.
- Missing authentication: 401.
- Direct unlinked-subject data-service check: zero records. A separate real
  unlinked client login has not been exercised.
- Android Home screenshot visibly shows Mahir Julka and **66 Applications**.

Automated checks passed: nine read-only source preflight tests, two exact-source
validation tests, two application/date/local-target tests, and the database-route
authentication check. Backend TypeScript validation passed. An initial changed
reader-contract test was fixed by making candidate-view access explicitly opt-in
and restricting it to operator-approved numeric Duplicate tab IDs.

A repeat import initially hit an old PostgreSQL query plan; only that import's
long-running read was canceled and the transaction rolled back. The retry
completed unchanged. Imports now have a 30-second per-statement timeout.

## Existing Admin Panel

The Admin server was running at IPv4 port 3001 while a duplicate Expo process
occupied IPv6 port 3001, causing `localhost` to display the mobile signup page.
Only the duplicate Expo process was stopped; emulator Metro port 8095 and the
existing Admin server were preserved. `http://localhost:3001` now opens the
existing Admin UI.

The user identified and explicitly approved the verified Development admin
`9jobsapplicationservice@gmail.com`, subject
`user_3GG7g7Ee5gWNcpyDjsPydNOZQ9U`, in the ignored local
`SHEET_ADMIN_USER_IDS` setting. Mahir remains a client. No Clerk account role,
production auth configuration, password or key was changed by the agent.

The saved browser login was invalid and was logged out. The user did not know
the admin password, so the genuine Clerk Development forgot-password flow was
opened at `https://usable-flea-70.accounts.dev/sign-in`. Clerk sent the reset
code to the administrator's verified email. The user entered the code and
changed the password themselves. They then provided the changed credential for
login. It was used only in the masked existing login form, never stored in a
file, source, shell command or application log.

The custom Admin form needed an additional Clerk verification step. The real
verified Account Portal session was returned to localhost using Clerk's supported
redirect. No bypass or new account was used. The existing Users page visibly
lists Mahir's actual name, email and completed questionnaire. The genuine admin
session received HTTP 200 from `/api/admin/client-accounts` with Mahir's linked
Client ID and from `/api/admin/sheet-sync/records` with exactly 72 Mahir rows.
Evidence: `real-admin-security.json` and `admin-mahir-users.png`.

UI limitation: the existing Admin Users/Dashboard application counters read the
legacy application table and still show zero for this read-only source overlay.
Mobile Home/Tracker uses the 66 explicit source applications. The source count
and mapping were verified through authorized Admin endpoints without adding UI
fields. A separate real unlinked client login and every job-detail modal were
not exercised; unlinked data-service access returned zero as documented above.

Temporary session-probe instrumentation was removed after testing. The ordinary
localhost backend remains running with the approved local authorization.

## Tracker crash fix and actual emulator retest

Opening the populated Tracker initially crashed Android with
`Canvas: trying to draw too large(169045920bytes) bitmap` in `SvgView.onDraw`.
The decorative background was inside the scroll content and its SVG backing
bitmap grew with the full list height. `mobile/components/ui/Screen.tsx` now
renders the same background under the fixed viewport instead of inside the
scroller. No artwork, styles, cards, data, navigation or row limit was changed.

The new render-boundary regression test renders 72 source rows, verifies all
are retained, and verifies the backdrop is outside the long scroller. It passed,
as did mobile TypeScript checking. In the real Mahir emulator session, Tracker
opened with 66 Applied entries and scrolled to actual source cards, including
Construct Personnel Pty Ltd, Connectus Recruitment and Buildsafe Australia,
with original `3-Sep-2026` dates. The process remained alive and the native fatal
crash count stayed at four (all historical), with zero new fatal crashes.
Evidence: `tracker-fix-evidence.json`, `tracker-after-fix.png`, and
`tracker-scroll-check.png`. No records were removed to avoid the crash.

## Changes in this task

- `scripts/inspect-duplicate-sheet.cjs`: opt-in, allowlisted read-only candidate
  hyperlink/view inspection; the default reader contract remains unchanged.
- `scripts/import-local-candidate.cjs`: explicit operator dry run/apply command,
  pinned to the existing isolated localhost target.
- `src/services/localCandidateImport.ts`: exact source reconciliation,
  append-only records and snapshots, permanent identity and preservation checks.
- `src/services/sheetApplications.ts`: source-backed application response with
  original dates and explicit status only.
- `src/routes/tracker.ts`: additive authorized application overlay and rejection
  of edits to imported source jobs.
- `tests/local-candidate-import.test.cjs`, `tests/sheet-applications.test.cjs`,
  `tests/duplicate-sheet-preflight.test.cjs`: relevant validation/security checks.
- Ignored `backend/.env.local-e2e`: only the user-approved local admin subject
  was added. Secret values remain private.
- `mobile/components/ui/Screen.tsx`: viewport-bound background rendering fix.
- `mobile/tests/unit/screen-background-bounds.test.tsx`: long-list regression.

Private raw source snapshots, backup, mapping approval, JSON test evidence and
screenshots are under `.work/mahir-local/1793608787727-009782` and are not committed.

No Android or Admin UI redesign was performed. The only mobile rendering change
was the crash fix described above. No Google Sheet write, Original
Master access, production database change, trigger/permission edit or deployment
was performed during this localhost-only task. The Viewer service account and
`spreadsheets.readonly` scope were retained.

# 9JOBS localhost end-to-end test report

Latest readiness update: the user supplied an additional Clerk Development
secret in the ignored backend/.env.local-e2e file. Read-only Clerk API checks
returned HTTP 200, and its signing keys match the existing Admin/Android
Development instance. The localhost backend was restarted to load it; backend,
Admin and Metro all return HTTP 200, and Pixel_7 remains connected. No secret
was printed and no login session was created. The user will manually register
and verify the first test account next. Admin subject authorization and real
account mappings remain pending. Earlier missing-secret findings below describe
the previous test run, not the current configuration.

Date: 2 November 2026. Local services remain running for continued testing.
No deployment, live Sheet writes, production database writes, live trigger
changes, permissions changes, or Clerk configuration/key changes were performed.
The previously removed sync trigger was not recreated. Daily backup verification
was skipped as requested.

## Running services

| Service | Address / state |
|---|---|
| Backend + Socket.IO | http://127.0.0.1:3100 — health HTTP 200 |
| Existing Admin Panel | http://127.0.0.1:3001 — HTTP 200; original login screen rendered |
| Android Metro | http://127.0.0.1:8095 — packager status HTTP 200 |
| Android emulator | Pixel_7, emulator-5554, boot completed; com.ninejobs.mobile in foreground |
| Database | PostgreSQL on 127.0.0.1:55439, separate database 9jobs_local_e2e_209b08c1e606 |

ADB reverse maps device ports 3100 and 8095 to the same host ports. The existing
native development client loaded a new local bundle (2,609 modules). Android
SDK screen capture confirms the unchanged Create account screen, with empty
registration/password fields. No passwords, OTPs or fabricated client sessions
were entered. Screenshot: `.work/localhost-e2e/android-screen.png`.

Use the IPv4 Admin URL above: an older Expo server was occupying IPv6 port 3001
and initially served the mobile web app instead. That confirmed stale 9JOBS Expo
process was stopped; the current mobile Metro server uses 8095.

## Unique Client ID and record results

The new long-running local test database was initialized with the canonical
application schema plus the additive Client ID schema. Only synthetic source
fixtures were imported; the real Duplicate was not needed or modified.

- Initial registry: 65 clients, 65 distinct prefixed UUIDs, 35,122 job records.
- Repeated generation retained every initial ID.
- A new candidate with a recognized approved fixture template was simulated.
  It automatically received its ID through the same Apps Script logic.
- Current registry: **66 clients, 66 distinct Client IDs, 66 distinct stable
  source identities, 35,123 jobs**.
- Repeated import returned unchanged=true.
- The initial immutable snapshot still contains all **35,122** memberships.
- No source/job records or existing fixture tabs/formulas/markers were deleted.

The Apps Script fixture is a local JavaScript model, not a Google-hosted Apps
Script execution. Its source sheet IDs and protocol writes are simulated. Client
IDs have not been written to the live Duplicate.

## Authentication, Admin mapping and client-wise Android results

These results are **incomplete**, not a successful real-account E2E claim.

The existing Admin and Android publishable keys are both development keys and
match the same Clerk instance. The existing Google sign-in successfully opened
the Clerk Development dashboard. Its existing default secret is masked and
not recoverable from the displayed field. No matching backend secret exists in
the local environment files or process environment. No key was created, rotated,
copied into source/logs, or obtained through an authentication bypass.

The private local file `backend/.env.local-e2e` was prepared without a secret.
It needs the matching `CLERK_SECRET_KEY` and the approved development Admin
subject in `SHEET_ADMIN_USER_IDS`. These are local backend settings only; do not
put a secret in frontend variables or chat. Backend startup rejects live Clerk
secrets in this local configuration.

| Requested check | Result |
|---|---|
| Real development registration/login | Not completed; no real test account was created or signed into the app during this run. |
| Registered names/emails reaching the running backend | Not verified; account directory currently has zero registered accounts. No records were fabricated to simulate registration. |
| Admin user-management listing after login | Login screen rendered; authenticated user-list UI is blocked until valid backend verification/admin identity is configured. |
| Approved real test-user mappings | None created; current client_accounts count is zero. |
| Client-specific jobs displayed on Android | Not verified; the app is on the existing Create account screen. |
| Unmatched/forged request protection on running backend | Private requests without a verified identity return HTTP 401. |
| Two-client isolation, unlinked users, identity persistence and Admin directory logic | Pass in isolated PostgreSQL + signed-fixture HTTP tests; Clerk responses are mocked there. This is not substituted for real Clerk/device verification. |

Without the existing secret, completing these checks would require separately
authorized creation of a new development key or provision of the matching secret.
Creating keys is a Clerk configuration write outside the current localhost/test
fixture write boundary, so it was not done. Real test users must then complete
the existing sign-up/sign-in and email verification flow; mapping must use their
verified exact subjects and the approved synthetic Client IDs.

## API errors and fixes

1. **Local database routing:** existing provider routing recognized only Neon
   hostnames. Added an opt-in isolated-e2e mode restricted to loopback, port
   55439, the test role and the dedicated database prefix. In that mode, external
   or default database targets are rejected, and local PostgreSQL does not get
   forced Neon TLS options. Production routing defaults are unchanged.
2. **Production environment fallback:** local mode loads only the private local
   test configuration, not repository production/contact environment files.
   Backend external Supabase auth/storage is disabled in this mode, and fallback
   local JSON data is isolated under `.work/localhost-e2e/`.
3. **REST URL prefix:** the backend test Supabase-compatible client now uses a
   root localhost URL so its REST requests reach the PostgreSQL adapter. A real
   local profile count query succeeded with count=0 and no error.
4. **Cannot POST /api/database/query:** the running local route exists. POST
   without authentication returns **401**, not 404 or Cannot POST. Authenticated
   browser SQL queries are not claimed verified while Clerk setup is incomplete.
5. **Port conflict:** removed only the confirmed stale 9JOBS Expo server using
   IPv6 port 3001; Admin uses 3001 and Android Metro uses 8095.
6. **Emulator startup:** the first sandboxed launch could not write Android
   emulator lock files and left an orphan process. It was stopped and the same
   existing Pixel_7 was launched with access to its installed AVD files. No app
   data or accounts were cleared. Windows native capture could not read the
   emulator window; Android SDK screen capture verified the actual app screen.

Final HTTP probes: health 200, Admin 200, Metro 200, unauthenticated database/query
401, forged identity exchange 401, private jobs with a forged Client ID 401.

## Automated checks

- **20 backend tests passed**, including actual localhost PostgreSQL and HTTP
  authorization tests with signed fixture identities, ID stability, rename,
  same-name isolation, source change recovery, lost-response retries, zero-job
  classification, record retention and the new local-target safety guard.
- Backend TypeScript check passed.
- Existing Admin/Android JSX equivalence checks passed. No frontend screen,
  component, style, navigation or registration form source was changed in this
  localhost phase.

Evidence (private and Git-ignored):

- `.work/localhost-e2e/id-results.json`
- `.work/localhost-e2e/runtime-evidence.json`
- `.work/localhost-e2e/backend-tests.tap`
- `.work/localhost-e2e/android-screen.png`
- `.work/localhost-e2e/backend.log`

## Files changed for this localhost phase

Modified: backend/src/lib/database.ts, env.ts, supabase.ts, localDb.ts, and
backend/src/server.ts. Pre-edit copies are in `.work/localhost-e2e/pre-edit/`.

Added: scripts/localhost-e2e-config.cjs, setup-localhost-e2e.cjs,
simulate-localhost-client.cjs, start-localhost-e2e.cjs,
start-localhost-admin.cjs, start-localhost-mobile.cjs,
tests/localhost-database.test.cjs and this report.

## Restart / continue

The services are already running. Do not start duplicate listeners. If they
have stopped, first start the isolated PostgreSQL cluster as described in
CLIENT_ID_DELIVERY.md. From separate terminals in `D:/9jobs-App/backend`:

```powershell
node scripts/start-localhost-e2e.cjs
node scripts/start-localhost-admin.cjs
node scripts/start-localhost-mobile.cjs
```

The local setup/import can be repeated with `node scripts/setup-localhost-e2e.cjs`.
The same synthetic new-client scenario can be repeated with
`node scripts/simulate-localhost-client.cjs`; it reuses saved IDs and retained
snapshots. Do not delete the private fixture state to force a reset.

After securely supplying the matching existing development secret and approved
Admin subject, restart only the local backend. Continue real-account registration,
Admin listing, explicit test-user mapping and Android own-job/unlinked-account
checks. Do not activate Google scripts, recreate triggers or deploy production.

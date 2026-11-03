# Neon resume fix — November 2, 2026

Vercel hosts the existing API; the user-provided Neon database stores resumes
and questionnaires. No Vercel database or new Neon project was created.

The existing connection was found in the ignored root `.env.local`. Read-only
inspection found 27 application tables, all empty before testing. A verified-TLS
read-only backup was restored to a fresh localhost database; all 27 counts
matched. Evidence and private backups are retained in `.work/resume-live`.

The original deployment `dpl_GWs2y1wUaGpHDwe7WG5kZnTCv3t1` is retained for
rollback. 60 deployed source files were restored and SHA-256 verified locally.
The new package was built from that source with only five changed/new files:
`src/app.ts`, `src/routes/questionnaire.ts`, `src/lib/questionnaireDatabase.ts`,
`src/services/questionnaireDocuments.ts`, `src/services/questionnaireStore.ts`.
No Client ID activation, UI, Sheet, trigger or authentication-code changes
were included. The separate local Clerk hardening was not deployed here.

New deployment: `dpl_budKG4yYXxKPy3ixq1KRc2aYvBJF`,
https://backend-qar73bbyt-vijay-shukla-dev.vercel.app.
Promoted live URL: https://backend-theta-ten-27.vercel.app.
The existing Neon URL was passed privately as a deployment-only DATABASE_URL
override, never in arguments, source or output. Project environment settings
are unchanged; future deployments must retain the Neon override or configure
the approved Neon URL explicitly to avoid reverting to the old database setting.

Live checks: health 200; questionnaire read, upload preparation and upload 401
without credentials; invalid download capability 403. Questionnaire responses
report `x-9jobs-resume-storage: neon-v1`. The initial protected candidate
redirected to Vercel sign-in; this was not counted as an app success. No hosting
protection setting was changed. Promotion checks passed; rollback was not needed.

Local tests passed for persistent document bytes, concurrent identical retries,
overwrite rejection, ownership/path/MIME/size validation, download byte equality,
and tampered/expired/wrong-audience capabilities. Transaction tests passed for
profile + form save, user isolation, repeated save, missing-document rejection,
existing account email preservation, and rollback on invalid form data. Backend
and isolated candidate TypeScript checks passed. The local backend was reloaded
with the same resume fix but remains on its isolated localhost test database.

Real authenticated phone/local Save & Start remains pending user action. No
fake user, login session or authentication bypass was used. No complete live
registration/login/Client ID verification is claimed. Existing live authentication
was preserved. Private files now persist in Neon rather than `/var/task`.
Vercel's existing 4.5 MB request-body limit still applies to this unchanged
mobile transport; larger files need a separate upload transport.

No live Sheet write, trigger edit, data deletion, Clerk key change, or broad
production-environment retrieval occurred. The rejected whole-environment pull
was not executed. The sensitive old DATABASE_URL could not be revealed, but
the user's Neon clarification resolved the target using the already provided URL.
The blank `.env.resume-live-backup` template is no longer required for this fix.

# Resume live testing status

LATEST: The user clarified that the already provided Neon database must be used.
That connection was found and verified. The Neon backup was restored locally
with all 27 counts matching, and the targeted resume fix has now been promoted
to the existing live backend URL. Authenticated phone Save & Start is pending.
See RESUME_NEON_LIVE_RESULT.md for current evidence and deployment details.
The missing-credential findings below are historical and no longer block this fix.

## Historical inspection before Neon clarification

The user approved narrowly scoped resume-upload deployment/testing and then
explicitly approved reading only DATABASE_URL for a read-only recovery backup.

Read-only inspection identified the current production deployment as
`dpl_GWs2y1wUaGpHDwe7WG5kZnTCv3t1`, created October 27, 2026. The default Android
backend URL is https://backend-theta-ten-27.vercel.app. Its health endpoint is
healthy. The deployed questionnaire route still writes to `local_uploads` when
Supabase is unreachable, matching the reported `/var/task/local_uploads` error.

60 downloaded source files were copied to an isolated recovery folder and
SHA-256 verified. Evidence is in the ignored `.work/resume-live` directory.
Production source has older Supabase-based database/auth code; the local
workspace also contains unrelated unpublished Neon/Client ID/auth changes.
Deploying the entire current workspace is outside this narrowly approved fix.

The automatic approval reviewer rejected pulling the entire production
environment because it would retrieve unrelated credentials. That operation
was not executed. Metadata-only inspection succeeded. Following explicit user
approval, the individual DATABASE_URL retrieval endpoint was called; it
returned type `sensitive`, decrypted `false`, and no value. No other secret key
values were retrieved. No database backup or production migration was run.

Next prerequisite: provide the original production connection string privately
as DATABASE_URL in the gitignored `backend/.env.resume-live-backup`. Do not
rotate/replace the production setting. Then connect read-only, verify schema,
take a backup and restore into a new isolated local database. Only after that
prepare and validate the targeted patch against deployed source and activate
the approved resume change. Preserve existing records and unrelated routes.

Local persistence/security tests passed from the backend directory. Real
authenticated phone upload and complete registration/login remain unverified.
No fake sessions or authentication bypasses were used. No deployment, live
database write, Sheet write, trigger change, UI change, or credential rotation
occurred during this live inspection.

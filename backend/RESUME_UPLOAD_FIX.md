# Resume upload fix

Current status: the user-approved five-file fix is now live on the existing API
host with the existing Neon database. Backup/restore and smoke checks passed;
the user's authenticated Save & Start is pending. See RESUME_NEON_LIVE_RESULT.md.
Earlier local-only findings below describe preparation before activation.

The reported error attempts to create `/var/task/local_uploads`. Documents
cannot be durably stored in the deployed function's application directory.
The existing reachability helper switches to database health on Neon; that
does not verify that Supabase Storage is available.

For the existing Postgres adapter, questionnaire uploads now store immutable
document bytes in the private `questionnaire_documents` table rather than
using the function filesystem or the legacy Supabase storage account. Existing
mobile upload requests and all screens remain unchanged. The table is additive
and created on first use, serialized across concurrent cold starts. No existing
documents, questionnaire records or tables are removed or rewritten.

Uploads require the existing authenticated backend identity. Ownership and
document type are checked server-side; a questionnaire can only reference
documents already uploaded by that user. Duplicate upload retries preserve the
same bytes. Changed bytes cannot overwrite an existing path. Admin questionnaire
reads supply five-minute signed download links; downloads are attachment-only
and not cacheable. These links are document capabilities, never login tokens.
Legacy stored documents retain their existing Supabase download behavior.

Validation: backend TypeScript check; isolated PostgreSQL persistence, concurrent
retries, overwrite prevention, wrong-user paths, missing files, MIME/size checks,
download HTTP byte equality, tampered/expired/wrong-audience download links, and
unauthenticated upload/submission rejection. No real user session is fabricated.
Manual authenticated Save & Start remains to be tested by the user on localhost.

Production is unchanged. Before any approved activation: verify a restorable
database backup, review the additive table/permissions, and test the actual
deployment's request limits. Vercel Functions limit individual request bodies
to 4.5 MB: the existing 12 MB UI allowance needs direct object-storage uploads
or a separate large-file transport before production support can be claimed
for files above that hosting limit. Do not substitute `/tmp` as permanent storage.
See https://vercel.com/docs/functions/limitations.

Local runtime: `node scripts/start-localhost-e2e.cjs` from backend, using only
the isolated database and ignored local environment. No deployment, live Sheet
access, trigger edits, production migration, authentication bypass or UI change
is part of this fix.

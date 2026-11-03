import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import { questionnairePool as createDatabasePool, usesQuestionnaireDatabase } from "../lib/questionnaireDatabase";

export const usesDatabaseDocuments = () => usesQuestionnaireDatabase();
export const MAX_DOCUMENT_BYTES = 12 * 1024 * 1024;
export const DOCUMENT_TYPES = new Set([
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg", "image/png",
]);

export function documentPath(userId: string, kind: string, fileName: string) {
  return `${userId}/${kind}/${randomUUID()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
}

export function ownsDocumentPath(userId: string, storagePath: string, kind?: string) {
  const parts = storagePath.split("/");
  return parts.length === 3 && parts[0] === userId &&
    (kind ? parts[1] === kind : ["resume", "visa"].includes(parts[1])) &&
    /^[a-zA-Z0-9._-]+$/.test(parts[2]) && ![".", ".."].includes(parts[2]);
}

let documentSchemaReady: Promise<void> | undefined;
async function ensureDocumentSchema(pool: ReturnType<typeof createDatabasePool>) {
  if (!documentSchemaReady) {
    documentSchemaReady = (async () => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      // Serialize first-use DDL across processes and concurrent cold starts.
      await client.query("select pg_advisory_xact_lock(92401102)");
      await client.query(`create table if not exists questionnaire_documents (
        storage_path text primary key, user_id text not null,
        mime_type text not null, content bytea not null,
        created_at timestamptz not null default now(),
        check (octet_length(content) between 1 and 12582912)
      )`);
      await client.query("commit");
    } catch (error) { await client.query("rollback"); throw error; }
    finally { client.release(); }
    })().catch(error => { documentSchemaReady = undefined; throw error; });
  }
  await documentSchemaReady;
}

export async function withDocumentDatabase<T>(work: (pool: ReturnType<typeof createDatabasePool>) => Promise<T>) {
  const pool = createDatabasePool();
  await ensureDocumentSchema(pool);
  return work(pool);
}

export async function storeDocument(userId: string, storagePath: string, mimeType: string, content: Buffer) {
  if (!ownsDocumentPath(userId, storagePath) || !DOCUMENT_TYPES.has(mimeType) ||
      content.length === 0 || content.length > MAX_DOCUMENT_BYTES) throw new Error("Invalid document");
  // Immutable paths: a retry may succeed only when it contains the same bytes.
  return withDocumentDatabase(async pool => {
    await pool.query(`insert into questionnaire_documents(storage_path,user_id,mime_type,content)
      values($1,$2,$3,$4) on conflict(storage_path) do nothing`, [storagePath,userId,mimeType,content]);
    const result = await pool.query(`select 1 from questionnaire_documents
      where storage_path=$1 and user_id=$2 and mime_type=$3 and content=$4`, [storagePath,userId,mimeType,content]);
    if (!result.rowCount) throw new Error("Document path already exists");
  });
}

export async function hasDocument(userId: string, storagePath: string, kind: string) {
  if (!ownsDocumentPath(userId, storagePath, kind)) return false;
  return withDocumentDatabase(async pool => Boolean((await pool.query(
    "select 1 from questionnaire_documents where storage_path=$1 and user_id=$2", [storagePath,userId])).rowCount));
}

function signingSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("Document signing is unavailable");
  return secret;
}

export function signDocumentDownload(storagePath: string) {
  return jwt.sign({ storagePath }, signingSecret(), {
    algorithm: "HS256", expiresIn: "5m", audience: "questionnaire-document", issuer: "9jobs-backend",
  });
}

export function verifyDocumentDownload(token: string): string {
  const value = jwt.verify(token, signingSecret(), {
    algorithms: ["HS256"], audience: "questionnaire-document", issuer: "9jobs-backend",
  }) as jwt.JwtPayload;
  if (typeof value.storagePath !== "string") throw new Error("Invalid document link");
  return value.storagePath;
}

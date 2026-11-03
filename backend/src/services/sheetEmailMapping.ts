import type { Pool } from "pg";

// Operator-side approval only. No public endpoint accepts an email/name to grant access.
export async function approveSheetEmail(email: string, candidate: string, approvedBy: string, db: Pool) {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || !candidate || !approvedBy) throw new Error("Invalid approval");
  const candidateRow = await db.query(`select count(*)::int as count from sheet_sync.head h
    join sheet_sync.snapshot_records m on m.snapshot_id=h.snapshot_id
    join sheet_sync.records r on r.id=m.record_id where h.source_id=$1 and r.candidate_label=$2`,
    ["1KM8Jr2zjiGNRJJNorqIQHdlNc9-YMiTx_xmXZizVKvU:review",candidate]);
  if (!candidateRow.rows[0].count) throw new Error("Candidate not found in the imported review snapshot");
  const result = await db.query(`insert into sheet_sync.email_approvals(email,candidate_label,approved_by)
    values($1,$2,$3) on conflict(email,candidate_label) do nothing returning email`,[normalized,candidate,approvedBy]);
  const saved = await db.query("select email,candidate_label,resolved_user_id,revoked_at from sheet_sync.email_approvals where email=$1 and candidate_label=$2",[normalized,candidate]);
  return { approval:saved.rows[0],candidateRecords:candidateRow.rows[0].count,newApproval:Boolean(result.rowCount) };
}

// Called only after the request's Clerk session signature/subject has been verified.
// The existing legacy profile email and client-supplied email are never used.
export async function resolveSheetEmail(userId: string, db: Pool, fetcher: typeof fetch = fetch) {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) return false;
  const bound = await db.query("select 1 from sheet_sync.candidate_mappings where user_id=$1 limit 1",[userId]);
  if (bound.rowCount) return false; // Includes revoked mappings: do not silently re-enable them.
  const response = await fetcher(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`,{
    headers:{Authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(10000),redirect:"error",
  });
  if (!response.ok) throw new Error("Verified account lookup unavailable");
  const user = await response.json() as {
    id:string; banned?:boolean; locked?:boolean; primary_email_address_id:string;
    email_addresses:Array<{id:string;email_address:string;verification?:{status:string}}>;
  };
  if (user.id !== userId || user.banned || user.locked) return false;
  const primary = user.email_addresses?.find(item=>item.id===user.primary_email_address_id);
  if (!primary || primary.verification?.status!=="verified") return false;
  const client = await db.connect();
  try {
    await client.query("begin");
    const approved = await client.query(`update sheet_sync.email_approvals set resolved_user_id=$1
      where email=$2 and revoked_at is null and (resolved_user_id is null or resolved_user_id=$1)
      returning candidate_label,approved_by`,[userId,primary.email_address.trim().toLowerCase()]);
    for (const approval of approved.rows) {
      await client.query(`insert into sheet_sync.candidate_mappings(user_id,candidate_label,approved_by)
        values($1,$2,$3) on conflict(user_id,candidate_label) do nothing`,[userId,approval.candidate_label,approval.approved_by]);
    }
    await client.query("commit");
    return Boolean(approved.rowCount);
  } catch (error) { await client.query("rollback");throw error; }
  finally {client.release();}
}

import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { VerifiedAccount } from "./verifiedAccount";

type Row = { email:string; clientId?:string; sourceSpreadsheetId?:string; sourceSheetId?:string };
export async function reviewClientEmails(rows:Row[], db:Pool|PoolClient) {
 if(!Array.isArray(rows)||!rows.length||rows.length>2000)throw new Error("1–2000 reviewed associations required");
 const normalized:{email:string;clientId:string}[]=[];
 for(const r of rows){
  let id=String(r.clientId||'');
  if(r.sourceSheetId!==undefined||r.sourceSpreadsheetId!==undefined){
   if(typeof r.sourceSpreadsheetId!=='string'||!/^\d+$/.test(String(r.sourceSheetId||'')))throw new Error('Exact stable source identity required');
   const source=(await db.query('select client_id from sheet_sync.clients where source_spreadsheet_id=$1 and source_sheet_id=$2',[r.sourceSpreadsheetId,String(r.sourceSheetId)])).rows[0];
   if(!source||id&&id!==source.client_id)throw new Error('Source identity not found or conflicts');
   id=source.client_id;
  }
  normalized.push({email:String(r.email||'').trim().toLowerCase(),clientId:id});
 }
 const emails=new Set(),clients=new Set();
 for(const r of normalized){
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)||!/^9JOBS-CL-[a-f0-9-]{36}$/.test(r.clientId)||emails.has(r.email)||clients.has(r.clientId))throw new Error("Invalid or duplicate email/client association");
  emails.add(r.email);clients.add(r.clientId);
 }
 normalized.sort((a,b)=>a.email.localeCompare(b.email));
 const conflicts:any[]=[];
 for(const r of normalized){
  const target=await db.query("select client_id from sheet_sync.clients where client_id=$1",[r.clientId]);
  const approvals=await db.query("select email,client_id,revoked_at from sheet_sync.client_email_associations where email=$1 or client_id=$2",[r.email,r.clientId]);
  const accounts=await db.query(`select a.user_id,a.client_id,a.revoked_at,v.email from sheet_sync.client_accounts a join sheet_sync.verified_accounts v using(user_id) where a.client_id=$2 or v.email=$1`,[r.email,r.clientId]);
  if(!target.rowCount||approvals.rows.some(a=>a.revoked_at||a.email!==r.email||a.client_id!==r.clientId)||accounts.rows.some(a=>a.revoked_at||a.email!==r.email||a.client_id!==r.clientId))conflicts.push({email:r.email,clientId:r.clientId,reason:"missing_source_or_existing_association_conflict"});
 }
 return {rows:normalized,conflicts,digest:createHash("sha256").update(JSON.stringify(normalized)).digest("hex")};
}
export async function approveClientEmails(rows:Row[],approvedBy:string,expectedDigest:string,db:Pool){
 if(!approvedBy)throw new Error("Administrator approval required");
 const c=await db.connect();try{
  await c.query('begin');await c.query('select pg_advisory_xact_lock(91035,67)');
  const plan=await reviewClientEmails(rows,c);
  if(plan.conflicts.length||plan.digest!==expectedDigest)throw new Error("Review changed or conflicts require manual resolution");
  for(const r of plan.rows)await c.query(`insert into sheet_sync.client_email_associations(email,client_id,approved_by) values($1,$2,$3) on conflict(email) do nothing`,[r.email,r.clientId,approvedBy]);
  await c.query(`insert into sheet_sync.sync_events(source_id,event_type,details) values('account-associations','admin_approval',$1)`,[JSON.stringify({approvedBy,count:plan.rows.length,digest:plan.digest})]);
  await c.query('commit');return {approved:plan.rows.length,digest:plan.digest};
 }catch(e){await c.query('rollback');throw e;}finally{c.release();}
}

// Called only with a trusted Clerk account returned after signature/session verification.
export async function resolveApprovedClientEmail(account:VerifiedAccount,c:PoolClient){
 await c.query('select pg_advisory_xact_lock(91035,67)');
 const existing=await c.query('select client_id,revoked_at from sheet_sync.client_accounts where user_id=$1',[account.userId]);
 if(existing.rowCount)return {linked:!existing.rows[0].revoked_at,existing:true}; // Never undo a revocation or reassign.
 const approval=(await c.query(`select * from sheet_sync.client_email_associations where email=$1 and revoked_at is null for update`,[account.email])).rows[0];
 if(!approval||approval.resolved_user_id&&approval.resolved_user_id!==account.userId)return {linked:false};
 const occupied=await c.query('select 1 from sheet_sync.client_accounts where client_id=$1',[approval.client_id]);
 if(occupied.rowCount)return {linked:false};
 await c.query(`insert into sheet_sync.client_accounts(user_id,client_id,approved_by) values($1,$2,$3)`,[account.userId,approval.client_id,approval.approved_by]);
 await c.query('update sheet_sync.client_email_associations set resolved_user_id=$1 where email=$2',[account.userId,account.email]);
 return {linked:true,existing:false};
}

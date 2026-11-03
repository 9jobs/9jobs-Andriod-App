import type { Pool } from "pg";
import { resolveApprovedClientEmail } from "./clientEmailAssociations";
import { requestLocalSheetRefresh } from "./localSyncFreshness";
export type VerifiedAccount = { userId:string; email:string; fullName:string };
// Subject comes ONLY from verifyClerkSession, never a request body.
export async function lookupVerifiedAccount(userId: string, fetcher: typeof fetch = fetch): Promise<VerifiedAccount> {
 const secret = process.env.CLERK_SECRET_KEY;
 if (!secret) throw new Error("Server identity lookup is not configured");
 const response = await fetcher(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`, {headers:{Authorization:`Bearer ${secret}`},redirect:"error",signal:AbortSignal.timeout(10000)});
 if (!response.ok) throw new Error("Identity lookup unavailable");
 const user = await response.json() as any;
 const email = user.email_addresses?.find((item:any) => item.id === user.primary_email_address_id);
 if (user.id !== userId || user.banned || user.locked || email?.verification?.status !== "verified" || typeof email.email_address !== "string") throw new Error("Verified primary email required");
 return {userId,email:email.email_address.trim().toLowerCase(),fullName:[user.first_name,user.last_name].filter(item=>typeof item === "string" && item.trim()).join(" ").trim() || email.email_address};
}
export async function persistVerifiedAccount(account: VerifiedAccount, db: Pool, creationRole:"client"|"admin"="client") {
 const client = await db.connect();
 try {
  await client.query("begin");
  const profile = await client.query(`insert into public.profiles(id,full_name,email,role) values($1,$2,$3,$4)
   on conflict(id) do update set full_name=excluded.full_name,email=excluded.email
    returning account_status,role`,[account.userId,account.fullName,account.email,creationRole]);
  // A conflicting email rolls back rather than taking over an existing profile.
  if (profile.rows[0]?.account_status === "suspended" || profile.rows[0]?.account_status === "inactive") throw new Error("Account is not active");
  await client.query(`insert into sheet_sync.verified_accounts(user_id,email,full_name,verified_at)
   values($1,$2,$3,now()) on conflict(user_id) do update set email=excluded.email,full_name=excluded.full_name,verified_at=now(),last_authenticated_at=now()`,[account.userId,account.email,account.fullName]);
  await client.query(`insert into sheet_sync.account_directory(user_id,full_name,email,email_verified,registration_status,registered_at)
   values($1,$2,$3,true,'verified',now()) on conflict(user_id) do update set full_name=excluded.full_name,email=excluded.email,email_verified=true,registration_status='verified',synced_at=now()`,[account.userId,account.fullName,account.email]);
  await resolveApprovedClientEmail(account,client);
  await client.query("commit");
 } catch(error) { await client.query("rollback"); throw error; }
 finally { client.release(); }
 await requestLocalSheetRefresh(db);
}
export async function hydrateVerifiedProfiles(payload: any, db: Pool) {
 const rows=Array.isArray(payload)?payload:[payload];
 const ids=rows.filter(row=>row && typeof row.id==='string').map(row=>row.id);
 if(!ids.length)return payload;
 const result=await db.query("select user_id,full_name,email from sheet_sync.account_directory where user_id=any($1::text[])",[ids]);
 const identities=new Map(result.rows.map(row=>[row.user_id,row]));
 const hydrated=rows.map(row=>{
  const identity=identities.get(row?.id);
  return identity?{...row,...('full_name' in row?{full_name:identity.full_name}:{}),...('email' in row?{email:identity.email}:{})}:row;
 });
 return Array.isArray(payload)?hydrated:hydrated[0];
}
// Operator-only backfill from Clerk's authenticated account directory.
// This creates no ownership mapping and accepts no request-supplied account data.
export async function backfillClerkAccounts(db:Pool,fetcher:typeof fetch=fetch) {
 const secret=process.env.CLERK_SECRET_KEY;if(!secret)throw new Error("Server identity lookup is not configured");
 let offset=0,mirrored=0,pending=0;
 for(;;){
  const response=await fetcher(`https://api.clerk.com/v1/users?limit=100&offset=${offset}`,{headers:{Authorization:`Bearer ${secret}`},redirect:"error",signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error("Account directory unavailable");
  const users=await response.json() as any[];if(!Array.isArray(users) || users.length>100)throw new Error("Invalid account directory");
  for(const user of users){
   const primary=user.email_addresses?.find((item:any)=>item.id===user.primary_email_address_id);
   if(typeof user.id!=="string" || typeof primary?.email_address!=="string" || !Number.isFinite(user.created_at))throw new Error("Account directory needs review");
   const email=primary.email_address.trim().toLowerCase();
   const name=[user.first_name,user.last_name].filter(item=>typeof item==='string' && item.trim()).join(' ').trim() || email;
   const verified=primary.verification?.status==='verified',status=user.banned||user.locked?'blocked':verified?'verified':'pending_verification';
   const client=await db.connect();
   try{
    await client.query('begin');
    // Identity conflicts are reviewed, never merged on matching email or name.
    const creationRole=(process.env.SHEET_ADMIN_USER_IDS||'').split(',').filter(Boolean).includes(user.id)?'admin':'client';
    await client.query(`insert into public.profiles(id,full_name,email,role) values($1,$2,$3,$4)
     on conflict(id) do update set full_name=excluded.full_name,email=excluded.email`,[user.id,name,email,creationRole]);
    await client.query(`insert into sheet_sync.account_directory(user_id,full_name,email,email_verified,registration_status,registered_at)
     values($1,$2,$3,$4,$5,$6) on conflict(user_id) do update set full_name=excluded.full_name,email=excluded.email,email_verified=excluded.email_verified,registration_status=excluded.registration_status,synced_at=now()`,[user.id,name,email,verified,status,new Date(user.created_at)]);
    await client.query('commit');mirrored++;if(!verified)pending++;
   }catch(error){await client.query('rollback');throw error;}finally{client.release();}
  }
  if(users.length<100)break;offset+=users.length;
 }
 return {mirrored,pending};
}

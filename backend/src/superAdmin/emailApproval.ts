import { createHmac,randomInt,randomUUID,timingSafeEqual } from 'node:crypto';
import type { PoolClient } from 'pg';
import { managementDb,transaction,type Access } from './store';
import { lookupVerifiedAccount,type VerifiedAccount } from '../services/verifiedAccount';
import { createApprovalMailer } from './approvalEmail';

export const emailApprovalEnabled=()=>process.env.SUPER_ADMIN_EMAIL_APPROVAL_ENABLED==='true';
export class ApprovalError extends Error { constructor(public status:number,message:string){super(message);} }
function hash(id:string,code:string) {
  const secret=process.env.JWT_SECRET;
  if(!secret||secret.length<32)throw Error('Approval security configuration missing.');
  return createHmac('sha256',secret).update(id+'|'+code).digest('hex');
}
async function requireOwner(c:PoolClient,actor:string) {
  if(!(await c.query('select 1 from admin_management.owner_identity where clerk_user_id=$1 and issuer=$2',[actor,process.env.CLERK_ISSUER])).rowCount)throw new ApprovalError(403,'Protected owner required.');
}
const denied=(status:number,error:string)=>({status,error});

export async function requestAdminApproval(actor:Access,adminId:string) {
  if(!emailApprovalEnabled())throw new ApprovalError(409,'Email approval is not enabled.');
  const owner=await lookupVerifiedAccount(actor.userId);
  const send=createApprovalMailer();
  const id=randomUUID(),code=String(randomInt(0,1000000)).padStart(6,'0');
  const issue=await transaction<any>(actor.userId,'admin.approval.request',adminId,async c=>{
    await requireOwner(c,actor.userId);
    const admin=(await c.query('select * from admin_management.office_admins where id=$1 for update',[adminId])).rows[0];
    if(!admin)throw new ApprovalError(404,'Employee record not found.');
    if(admin.clerk_user_id===actor.userId||admin.email===owner.email)throw new ApprovalError(409,'The protected owner cannot be an Office Admin.');
    if(admin.status==='active')throw new ApprovalError(409,'This employee is already approved.');
    const limits=(await c.query(`select count(*) filter(where admin_id=$1)::int as employee_count,count(*)::int as owner_count,
      count(*) filter(where admin_id=$1 and created_at>now()-interval '60 seconds')::int as cooldown
      from admin_management.admin_approval_challenges where owner_user_id=$2 and created_at>now()-interval '1 hour'`,[adminId,actor.userId])).rows[0];
    if(limits.cooldown||limits.employee_count>=5||limits.owner_count>=20)throw new ApprovalError(429,'Please wait before requesting another approval code.');
    await c.query('update admin_management.admin_approval_challenges set consumed_at=now() where admin_id=$1 and consumed_at is null',[adminId]);
    await c.query(`insert into admin_management.admin_approval_challenges(id,admin_id,owner_user_id,owner_email,employee_email,access_version,code_hash,expires_at)
      values($1,$2,$3,$4,$5,$6,$7,now()+interval '5 minutes')`,[id,adminId,actor.userId,owner.email,admin.email,admin.access_version,hash(id,code)]);
    return {after:{challengeId:id,adminId,expiresInSeconds:300},result:admin,notifyAccess:false};
  });
  try { await send({to:owner.email,employeeName:issue.name,employeeEmail:issue.email,code}); }
  catch {
    await transaction(actor.userId,'admin.approval.delivery_failed',adminId,async c=>{
      await c.query('update admin_management.admin_approval_challenges set consumed_at=now() where id=$1',[id]);
      return {after:{challengeId:id},result:null,notifyAccess:false};
    });
    throw new ApprovalError(503,'Approval email could not be delivered. Please try again later.');
  }
  return {challengeId:id,sentTo:owner.email.replace(/^(.{2}).*(@.*)$/,'$1***$2'),expiresInSeconds:300,resendAfterSeconds:60};
}

export async function verifyAdminApproval(actor:Access,adminId:string,id:string,code:string) {
  if(!emailApprovalEnabled())throw new ApprovalError(409,'Email approval is not enabled.');
  if(!/^[a-f0-9-]{36}$/i.test(id)||!/^\d{6}$/.test(code))throw new ApprovalError(400,'Enter the 6-digit approval code.');
  const owner=await lookupVerifiedAccount(actor.userId);
  const result=await transaction<any>(actor.userId,'admin.approval.verify',adminId,async c=>{
    await requireOwner(c,actor.userId);
    const challenge=(await c.query('select *,expires_at>now() as unexpired from admin_management.admin_approval_challenges where id=$1 and admin_id=$2 and owner_user_id=$3 for update',[id,adminId,actor.userId])).rows[0];
    if(!challenge)return {notifyAccess:false,result:denied(400,'Approval request not found. Request a new code.')};
    if(challenge.consumed_at||!challenge.unexpired||challenge.owner_email!==owner.email)return {notifyAccess:false,result:denied(409,'This approval code expired or was already used. Request a new code.')};
    if(challenge.attempts>=5)return {notifyAccess:false,result:denied(423,'Too many incorrect codes. Request a new code.')};
    const expected=Buffer.from(challenge.code_hash,'hex'),provided=Buffer.from(hash(id,code),'hex');
    if(expected.length!==provided.length||!timingSafeEqual(expected,provided)) {
      await c.query('update admin_management.admin_approval_challenges set attempts=attempts+1 where id=$1',[id]);
      return {after:{challengeId:id,verified:false},notifyAccess:false,result:denied(401,'Incorrect approval code.')};
    }
    const admin=(await c.query('select * from admin_management.office_admins where id=$1 for update',[adminId])).rows[0];
    if(!admin||admin.email!==challenge.employee_email||admin.access_version!==challenge.access_version||admin.clerk_user_id===actor.userId)return {notifyAccess:false,result:denied(409,'Employee details or permissions changed. Request a new approval code.')};
    const approved=(await c.query("update admin_management.office_admins set status='active',access_version=access_version+1,updated_at=now() where id=$1 returning *",[adminId])).rows[0];
    await c.query('update admin_management.admin_approval_challenges set consumed_at=now(),approved_at=now(),approved_version=$2 where id=$1',[id,approved.access_version]);
    return {before:{status:admin.status},after:{status:'active',challengeId:id},result:{admin:approved,approved:true}};
  });
  if(result.error)throw new ApprovalError(result.status,result.error);
  return result;
}

// A one-time enrollment links the approved employee to the subject of their own
// verified Clerk session. The email is never used again to replace that ID.
export async function claimApprovedOfficeAccess(account:VerifiedAccount) {
  if(!emailApprovalEnabled())return;
  const db=managementDb();
  const candidate=(await db.query("select id from admin_management.office_admins where email=$1 and clerk_user_id is null and status='active'",[account.email])).rows[0];
  if(!candidate)return;
  await transaction(account.userId,'admin.approval.identity_link',candidate.id,async c=>{
    const admin=(await c.query('select * from admin_management.office_admins where id=$1 for update',[candidate.id])).rows[0];
    if(!admin||admin.status!=='active'||admin.clerk_user_id||admin.email!==account.email)return {result:null,notifyAccess:false};
    const owner=(await c.query('select clerk_user_id from admin_management.owner_identity where singleton=true')).rows[0];
    if(owner?.clerk_user_id===account.userId)throw new ApprovalError(403,'Owner identity cannot be linked as an employee.');
    const approved=(await c.query(`select 1 from admin_management.admin_approval_challenges where admin_id=$1 and employee_email=$2 and approved_at is not null and owner_user_id=$3 order by approved_at desc limit 1`,[admin.id,account.email,owner?.clerk_user_id])).rowCount;
    if(!approved)return {result:null,notifyAccess:false};
    await c.query('update admin_management.office_admins set clerk_user_id=$2,access_version=access_version+1,updated_at=now() where id=$1',[admin.id,account.userId]);
    return {after:{clerkUserId:account.userId},result:null,notifyAccess:false};
  });
}

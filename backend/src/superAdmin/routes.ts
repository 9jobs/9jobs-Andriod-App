import { Router, Request } from 'express';
import { randomUUID } from 'node:crypto';
import { ownerOnly, sessionExchange } from './identity';
import { enabled, managementDb, createAdmin, transaction, savePermissions, actions, Access, AdminEmailConflict } from './store';
import { emailApprovalEnabled,requestAdminApproval,verifyAdminApproval,ApprovalError } from './emailApproval';
import { ClientSourceError,listClientSources,linkClientSource } from './clientSources';
import { lookupVerifiedAccount } from '../services/verifiedAccount';
type OwnerRequest=Request & {management?:Access};
const router=Router();
router.use((_req,res,next)=>enabled()?next():res.status(404).json({error:'Management is not enabled'}));
router.post('/session',(req,res)=>void sessionExchange(req,res,'owner'));
router.use(ownerOnly);
router.use((_req,res,next)=>{res.setHeader('Cache-Control','private, no-store');next();});
const text=(v:unknown,max=200)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('Valid name/email required');return v.trim();};
const emailValue=(v:unknown)=>{const value=text(v).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw Error('Valid email required');return value;};
const uuid=(v:string)=>{if(!/^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(v))throw Error('Invalid record ID');return v;};
const actor=(req:OwnerRequest)=>req.management!.userId;
function endpoint(fn:(req:OwnerRequest)=>Promise<unknown>){return async(req:OwnerRequest,res:any)=>{try{res.json(await fn(req));}catch(error){if(error instanceof ClientSourceError)return res.status(error.status).json({error:error.message});if(error instanceof AdminEmailConflict)return res.status(409).json({error:error.message,code:'ADMIN_EMAIL_EXISTS',existingAdminId:error.existingAdminId});if(error instanceof ApprovalError)return res.status(error.status).json({error:error.message});res.status(400).json({error:'Invalid or conflicting management change. Existing records were preserved.'});}};}
router.get('/session',endpoint(async req=>({access:req.management})));
router.get('/admins',endpoint(async()=>({admins:(await managementDb().query(`select a.*,coalesce((select jsonb_agg(jsonb_build_object('clientId',c.id,'clientName',c.name,'clientStatus',c.status,'permanentClientId',l.permanent_client_id,'actions',p.actions) order by c.name,c.id)
 from admin_management.admin_client_permissions p join admin_management.managed_clients c on c.id=p.client_id
 left join admin_management.client_identity_links l on l.client_id=c.id where p.admin_id=a.id and cardinality(p.actions)>0),'[]'::jsonb) as assignments
 from admin_management.office_admins a order by a.created_at`)).rows})));
router.post('/admins',endpoint(async req=>{const email=text(req.body.email).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Invalid email');return createAdmin(actor(req),{name:text(req.body.name),email});}));
router.patch('/admins/:id',endpoint(async req=>{
 const id=uuid(req.params.id),input=req.body;let identity:any;
 if(emailApprovalEnabled()&&input.clerkUserId)throw Error('Employee identity links automatically after approval and verified login');
 const current=(await managementDb().query('select * from admin_management.office_admins where id=$1',[id])).rows[0];
 if(input.clerkUserId||input.email&&current?.clerk_user_id)identity=await lookupVerifiedAccount(text(input.clerkUserId||current.clerk_user_id));
 return transaction(actor(req),'admin.edit',id,async c=>{const old=(await c.query('select * from admin_management.office_admins where id=$1 for update',[id])).rows[0];if(!old)throw Error('Not found');const email=input.email!==undefined?emailValue(input.email):old.email;if(identity&&(identity.email!==email||old.clerk_user_id&&old.clerk_user_id!==identity.userId))throw Error('Identity mismatch');
 const row=(await c.query('update admin_management.office_admins set name=$2,email=$4,clerk_user_id=coalesce($3,clerk_user_id),access_version=access_version+1,updated_at=now() where id=$1 returning *',[id,input.name?text(input.name):old.name,identity?.userId||null,email])).rows[0];await c.query("update admin_management.admin_invitations set email=$2 where admin_id=$1 and status='pending'",[id,email]);return {before:old,after:row,result:row};});
}));
for(const [operation,status] of [['activate','active'],['disable','disabled'],['revoke','revoked']] as const) {
 router.post(`/admins/:id/${operation}`,endpoint(async req=>{
  if(operation==='activate'&&emailApprovalEnabled())throw new ApprovalError(409,'Use Verify & activate and enter the code sent to the Super Admin email.');
  return transaction(actor(req),`admin.${operation}`,uuid(req.params.id),async c=>{
   const old=(await c.query('select * from admin_management.office_admins where id=$1 for update',[req.params.id])).rows[0];
   if(!old||status==='active'&&!old.clerk_user_id)throw Error('Verified linked employee required');
   const row=(await c.query('update admin_management.office_admins set status=$2,access_version=access_version+1,updated_at=now() where id=$1 returning *',[req.params.id,status])).rows[0];
   return {before:old,after:row,result:row};
  });
 }));
}

for(const [suffix,verify] of [['request-approval',false],['verify-approval',true]] as const)router.post(`/admins/:id/${suffix}`,async(req:OwnerRequest,res)=>{
 try {const id=uuid(req.params.id);const result=verify?await verifyAdminApproval(req.management!,id,String(req.body?.challengeId||''),String(req.body?.code||'').trim()):await requestAdminApproval(req.management!,id);return res.json(result);}
 catch(error){return res.status(error instanceof ApprovalError?error.status:400).json({error:error instanceof ApprovalError?error.message:'Unable to process approval. No access was granted.'});}
});
// No external user creation/invitation is enabled by this local implementation.
router.post('/admins/:id/invite',(_req,res)=>res.status(409).json({error:'Live Clerk invitations require separate approval. Link an existing verified development employee identity after approval.'}));
router.get('/client-sources',endpoint(async()=>listClientSources()));
router.get('/clients',endpoint(async()=>({clients:(await managementDb().query('select c.*,l.permanent_client_id,l.clerk_user_id from admin_management.managed_clients c left join admin_management.client_identity_links l on l.client_id=c.id order by c.created_at')).rows})));
router.post('/clients',endpoint(async req=>{const id=randomUUID(),name=text(req.body.name),email=req.body.email?emailValue(req.body.email):null;return transaction(actor(req),'client.add',id,async c=>{if(email&&(await c.query('select 1 from admin_management.managed_clients where lower(email)=$1',[email])).rowCount)throw Error('Existing local client email');const row=(await c.query('insert into admin_management.managed_clients(id,name,email) values($1,$2,$3) returning *',[id,name,email])).rows[0];return {after:row,result:row};});}));
router.patch('/clients/:id',endpoint(async req=>transaction(actor(req),'client.edit',uuid(req.params.id),async c=>{const old=(await c.query('select * from admin_management.managed_clients where id=$1 for update',[req.params.id])).rows[0];if(!old)throw Error('Not found');if(req.body.email&&(await c.query('select 1 from admin_management.managed_clients where lower(email)=$1 and id<>$2',[emailValue(req.body.email),req.params.id])).rowCount)throw Error('Existing local client email');const row=(await c.query('update admin_management.managed_clients set name=$2,email=$3,updated_at=now() where id=$1 returning *',[req.params.id,req.body.name?text(req.body.name):old.name,req.body.email!==undefined?(req.body.email?emailValue(req.body.email):null):old.email])).rows[0];return {before:old,after:row,result:row};})));
for(const [operation,status] of [['disable','disabled'],['archive','archived'],['restore','active']] as const)router.post(`/clients/:id/${operation}`,endpoint(async req=>transaction(actor(req),`client.${operation}`,uuid(req.params.id),async c=>{const old=(await c.query('select * from admin_management.managed_clients where id=$1 for update',[req.params.id])).rows[0];if(!old)throw Error('Not found');const row=(await c.query('update admin_management.managed_clients set status=$2,updated_at=now() where id=$1 returning *',[req.params.id,status])).rows[0];
 if(status!=='active')await c.query("update admin_management.admin_client_permissions set actions='{}' where client_id=$1",[req.params.id]);return {before:old,after:row,result:row};})));
router.post('/clients/:id/link',endpoint(async req=>linkClientSource(actor(req),uuid(req.params.id),text(req.body.permanentClientId))));
router.get('/permissions/:adminId',endpoint(async req=>({actions,assignments:(await managementDb().query('select client_id as "clientId",actions from admin_management.admin_client_permissions where admin_id=$1',[uuid(req.params.adminId)])).rows})));
router.put('/permissions/:adminId',endpoint(async req=>{if(!Array.isArray(req.body.assignments)||req.body.assignments.length>1000)throw Error('Invalid assignments');return savePermissions(actor(req),uuid(req.params.adminId),req.body.assignments.map((a:any)=>({clientId:uuid(a.clientId),actions:Array.isArray(a.actions)?a.actions:[]})));}));
export default router;

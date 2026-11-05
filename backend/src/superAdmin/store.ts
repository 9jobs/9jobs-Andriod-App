import { Pool, PoolClient } from "pg";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";

export const accessChanges = new EventEmitter();
export const actions = ['client.view','client.records.add','client.records.edit','client.records.archive','applications.view','applications.update','messages.view','jobs.manage'] as const;
export type Action = typeof actions[number];
let pool: Pool | undefined;
export function enabled() { return process.env.SUPER_ADMIN_ENABLED === 'true'; }
export function managementDb() {
 if (!enabled()) throw Error('Management is disabled');
 const url = new URL(process.env.DATABASE_URL || 'http://invalid');
 if(process.env.LOCAL_DATABASE_MODE!=='isolated-e2e'||url.hostname!=='127.0.0.1'||url.port!=='55439'||url.username!=='client_id_test'||!/^\/9jobs_local_e2e_sa_[a-f0-9]{12}$/.test(url.pathname)) throw Error('Management requires the isolated loopback target');
 return pool ||= new Pool({connectionString:url.toString(),max:5,connectionTimeoutMillis:5000});
}
export type Access = { kind:'owner'|'office'; userId:string; issuer:string; adminId?:string; version?:number };
export async function resolveAccess(userId:string,issuer:string):Promise<Access|null> {
 const db=managementDb();
 const owner=(await db.query('select clerk_user_id,issuer from admin_management.owner_identity where singleton=true')).rows[0];
 if(owner?.clerk_user_id===userId && owner.issuer===issuer) return {kind:'owner',userId,issuer};
 if(issuer!==process.env.CLERK_ISSUER)return null;
 const a=(await db.query("select id,status,access_version from admin_management.office_admins where clerk_user_id=$1",[userId])).rows[0];
 return a?.status==='active'?{kind:'office',userId,issuer,adminId:a.id,version:a.access_version}:null;
}
export async function transaction<T>(actor:string,action:string,target:string,operation:(c:PoolClient)=>Promise<{before?:unknown;after?:unknown;result:T;notifyAccess?:boolean}>):Promise<T>{
 const c=await managementDb().connect();try{await c.query('begin');await c.query('select pg_advisory_xact_lock(91036,1)');const value=await operation(c);await c.query('insert into admin_management.audit_events(actor,action,target,before_value,after_value) values($1,$2,$3,$4,$5)',[actor,action,target,JSON.stringify(value.before??null),JSON.stringify(value.after??null)]);await c.query('commit');if(value.notifyAccess!==false)accessChanges.emit('changed');return value.result;}catch(e){await c.query('rollback');throw e;}finally{c.release();}
}
export async function grants(userId:string,action:Action):Promise<string[]> {
 const access=await resolveAccess(userId,process.env.CLERK_ISSUER||'');if(access?.kind!=='office')throw Error('Active Office Admin required');
 return (await managementDb().query(`select l.clerk_user_id from admin_management.admin_client_permissions p join admin_management.office_admins a on a.id=p.admin_id join admin_management.managed_clients c on c.id=p.client_id join admin_management.client_identity_links l on l.client_id=c.id join sheet_sync.client_accounts current_mapping on current_mapping.client_id=l.permanent_client_id and current_mapping.user_id=l.clerk_user_id and current_mapping.revoked_at is null where a.id=$1 and a.status='active' and c.status='active' and $2=any(p.actions) and l.clerk_user_id is not null`,[access.adminId,action])).rows.map(r=>r.clerk_user_id);
}
export class AdminEmailConflict extends Error {
 readonly status=409;
 constructor(public existingAdminId:string){super('This employee already exists. Use Verify & activate on the existing record, or Edit to update it.');}
}
export async function createAdmin(actor:string,input:{name:string;email:string}){
 const id=randomUUID();return transaction(actor,'admin.add',id,async c=>{const existing=(await c.query('select id from admin_management.office_admins where email=$1',[input.email])).rows[0];if(existing)throw new AdminEmailConflict(existing.id);const row=(await c.query("insert into admin_management.office_admins(id,name,email) values($1,$2,$3) returning *",[id,input.name,input.email])).rows[0];await c.query("insert into admin_management.admin_invitations(id,admin_id,email,status) values($1,$2,$3,'pending')",[randomUUID(),id,input.email]);return {after:row,result:row};});
}
export async function savePermissions(actor:string,adminId:string,assignments:{clientId:string;actions:Action[]}[]){
 return transaction(actor,'permissions.save',adminId,async c=>{const admin=(await c.query('select * from admin_management.office_admins where id=$1 for update',[adminId])).rows[0];if(!admin)throw Error('Employee not found');if(new Set(assignments.map(a=>a.clientId)).size!==assignments.length)throw Error('Duplicate client assignment');const old=(await c.query('select * from admin_management.admin_client_permissions where admin_id=$1',[adminId])).rows;for(const a of assignments){if(a.actions.some(x=>!actions.includes(x)))throw Error('Unsupported action');const found=await c.query("select 1 from admin_management.managed_clients where id=$1 and (status='active' or $2::boolean)",[a.clientId,a.actions.length===0]);if(!found.rowCount)throw Error('Active client required');}
 // Revocation preserves assignment rows and historical audit records.
 await c.query("update admin_management.admin_client_permissions set actions='{}' where admin_id=$1",[adminId]);
 for(const a of assignments)await c.query('insert into admin_management.admin_client_permissions(admin_id,client_id,actions) values($1,$2,$3) on conflict(admin_id,client_id) do update set actions=excluded.actions',[adminId,a.clientId,[...new Set(a.actions)]]);
 await c.query('update admin_management.office_admins set access_version=access_version+1,updated_at=now() where id=$1',[adminId]);return {before:old,after:assignments,result:{saved:true}};});
}
export async function closeManagementDb(){await pool?.end();pool=undefined;}

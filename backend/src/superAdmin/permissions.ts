import { AsyncLocalStorage } from 'node:async_hooks';
import type { Request } from 'express';
import { grants, managementDb, type Action } from './store';
export type ManagedPrincipal={userId:string;role:string;email?:string;management_kind?:'owner'|'office'; operation?:'applications.update'};
export const requestAccess=new AsyncLocalStorage<ManagedPrincipal>();
export function officePrincipal(principal=requestAccess.getStore()){return principal?.management_kind==='office'?principal:undefined;}
export async function allowedUsers(action:Action,principal=requestAccess.getStore()){const office=officePrincipal(principal);return office?grants(office.userId,action):null;}
export async function requireClient(userId:string,action:Action,principal=requestAccess.getStore()){const users=await allowedUsers(action,principal);if(users&&!users.includes(userId))throw Error('Client access denied');}
export const resourceOwners:Record<string,string>={profiles:'id',applications:'user_id',saved_jobs:'user_id',interviews:'client_id',follow_ups:'client_id',recruiter_contacts:'client_id',cold_emails:'client_id',client_scores:'client_id',activity_logs:'client_id',conversations:'client_id',messages:'conversation_id',resume_scores:'user_id',candidate_questionnaires:'user_id',cover_letters:'user_id',interview_prep_sessions:'client_id',interview_prep_responses:'client_id'};
export function resourceAction(table:string,method:string):Action|null{
 const read=['GET','HEAD'].includes(method);
 if(read){if(['messages','conversations'].includes(table))return 'messages.view';if(['applications','interviews','follow_ups','client_scores','activity_logs','saved_jobs','interview_prep_sessions','interview_prep_responses'].includes(table))return 'applications.view';if(table==='jobs')return 'client.view';return resourceOwners[table]?'client.view':null;}
 if(['messages','conversations','jobs','interview_prep_sessions','interview_prep_responses'].includes(table))return null;
 if(table==='saved_jobs')return 'jobs.manage';
 if(table==='applications')return method==='DELETE'?'client.records.archive':'applications.update';
 if(!resourceOwners[table])return null;
 if(table==='profiles')return method==='DELETE'?null:'client.records.edit';
 return method==='POST'?'client.records.add':method==='DELETE'?'client.records.archive':'client.records.edit';
}
// Fail closed for unclassified legacy routes. Client-role/legacy owner calls do not enter here.
export async function authorizeOfficeRequest(req:Request,principal:ManagedPrincipal){
 const path=req.originalUrl.split('?')[0],read=['GET','HEAD'].includes(req.method);
 if(path==='/api/database/query'||path==='/api/office-admin/access')return;
 if(path==='/api/office-admin/success-stories'&&read)return;
 if(!path.startsWith('/api/admin/'))throw Error('Office Admin cannot use client or owner APIs');
 if(path==='/api/admin/dashboard'&&read)return;
 // This existing handler reads resume_scores through the client-scoped data adapter.
 if(path==='/api/admin/resume-scores'&&read)return;
 if(['/api/admin/services','/api/admin/pricing-plans'].includes(path)&&read)return;
 if(path.startsWith('/api/admin/conversations')){
  if(!read&&!path.endsWith('/seen'))throw Error('Message management is not granted by view permission');
  const id=path.split('/')[4];if(id)await requireClient(decodeURIComponent(id),'messages.view',principal);return;
 }
 if(path==='/api/admin/tracker/client-data'&&read){const clientId=String(req.query.clientId||'');await requireClient(clientId,'client.view',principal);await requireClient(clientId,'applications.view',principal);return;}
 if(path.startsWith('/api/admin/personal-info')&&req.method==='DELETE')throw Error('Account deletion is not an Office Admin capability');
 if(path==='/api/admin/personal-info'||path==='/api/admin/questionnaires')return;
 const tracker=/^\/api\/admin\/tracker\/(applications|jobs|saved-jobs|scores|interviews|contacts|cover-letters|follow-ups|cold-emails)(?:\/([^/]+))?$/.exec(path);
 if(tracker){
  const resource=tracker[1],id=tracker[2]?decodeURIComponent(tracker[2]):undefined;
  if(resource==='applications'&&read&&!(await allowedUsers('applications.view',principal))?.length)throw Error('View applications permission required');
  if(resource==='jobs'&&!read)throw Error('Shared catalogue changes require owner');
  if(resource==='contacts'&&!(await managementDb().query("select to_regclass('public.recruiter_contacts') as relation")).rows[0].relation)throw Error('Scoped contacts storage unavailable');
  if(resource==='cover-letters'&&id)await requireClient(id,read?'client.view':'client.records.archive',principal);
  // This legacy endpoint writes directly through pg, outside the common adapter.
  // Validate every target BEFORE any saved-job or application mutation.
  if(resource==='saved-jobs'&&!read){
   await requireClient(String(req.body?.userId||''),'jobs.manage',principal);
   if(req.body?.applicationId!==undefined){
    const row=(await managementDb().query('select user_id,job_id from public.applications where id=$1',[req.body.applicationId])).rows[0];
    if(!row||row.user_id!==req.body.userId||row.job_id!==req.body.jobId)throw Error('Saved job/application ownership mismatch');
    await requireClient(row.user_id,String(req.body.status).toLowerCase()==='saved'?'client.records.archive':'applications.update',principal);
   }
  }
  // Direct-SQL fallbacks cannot bypass the same record ownership checks.
  if(!read&&resource==='contacts'){
   for(const contact of (Array.isArray(req.body?.contacts)?req.body.contacts:[req.body?.contact]).filter(Boolean)){
    await requireClient(String(contact.client_id||''),contact.id?'client.records.edit':'client.records.add',principal);
    if(contact.id){const row=(await managementDb().query('select client_id from public.recruiter_contacts where id=$1',[contact.id])).rows[0];if(!row||row.client_id!==contact.client_id)throw Error('Contact ownership mismatch');}
   }
  }
  return;
 }
 if(path==='/api/admin/sheet-sync/records'||path==='/api/admin/client-accounts')return;
 throw Error('This capability is owner-only or has no client-scoped permission');
}

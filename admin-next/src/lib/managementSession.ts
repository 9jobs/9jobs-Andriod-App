import { managementBackend } from "./superAdminApi";
export type ManagementKind="owner"|"office";
export const managementLoginPath=(kind:ManagementKind)=>kind==="owner"?"/super-admin/login":"/admin/login";
export const managementLandingPath=(kind:ManagementKind)=>kind==="owner"?"/super-admin/permissions":"/admin/panel";
export class ManagementSessionError extends Error {constructor(public status:number,message:string){super(message);}}
export async function exchangeManagementSession(kind:ManagementKind,token:string|null,userId:string|null|undefined,fetcher:typeof fetch=fetch){
 if(!token||!userId)throw new ManagementSessionError(401,"Please sign in to continue.");
 let response:Response;
 try{response=await fetcher(`${managementBackend}/api/${kind==='owner'?'super-admin':'office-admin'}/session`,{method:'POST',headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:AbortSignal.timeout(15000)});}
 catch{throw new ManagementSessionError(503,"Login service is unavailable. Please start the local management server and retry.");}
 const payload=await response.json().catch(()=>null);
 if(!response.ok)throw new ManagementSessionError(response.status,payload?.error||"This account does not have access.");
 if(payload?.access?.kind!==kind||payload?.user?.userId!==userId||payload?.user?.role!=='admin'||typeof payload?.token!=='string'||!payload.token)throw new ManagementSessionError(403,"This account does not have the requested access.");
 return payload;
}
export function saveManagementEntry(kind:ManagementKind,token:string,storage:Pick<Storage,'setItem'|'removeItem'>){
 storage.removeItem('admin_preview_authenticated');
 if(kind==='office'){storage.setItem('9jobs_office_mode','true');storage.setItem('admin_auth_token',token);}
 else{storage.removeItem('9jobs_office_mode');storage.removeItem('admin_auth_token');}
}
export function isLockedLogin(error:any){return error?.errors?.some((item:any)=>/locked/.test(item.code||''))||/account is locked/i.test(error?.errors?.[0]?.longMessage||error?.message||'');}

export function isAlreadySignedIn(error:any){return error?.errors?.some((item:any)=>['session_exists','already_signed_in','identifier_already_signed_in','form_identifier_already_signed_in'].includes(item.code)||/already signed in/i.test(item.longMessage||item.message||''))||/already signed in/i.test(error?.message||'');}
export function findActiveLoginSession<T extends {id:string;status:string;user:{id:string;primaryEmailAddress?:{emailAddress:string}|null}|null}>(sessions:readonly T[],email?:string,sessionId?:string|null):T|undefined{
 const identifier=email?.trim().toLowerCase();
 return sessions.find(session=>session.status==='active'&&!!session.user&&(identifier?session.user.primaryEmailAddress?.emailAddress.toLowerCase()===identifier:session.id===sessionId));
}

// A response from an old/unmounted login page must never redirect a newer role page.
export function isManagementLoginLocation(kind:ManagementKind,pathname:string){return pathname.replace(/\/$/,'')===managementLoginPath(kind);}

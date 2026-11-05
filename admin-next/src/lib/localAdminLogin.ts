// Local development recovery only. No credentials are forwarded across pages.
export async function resolveLocalAdminLoginRedirect(backendUrl:string,officeMode=false,fetcher:typeof fetch=fetch):Promise<string|null>{
 let configured:URL;
 try{configured=new URL(backendUrl);}catch{return null;}
 if(configured.protocol!=='http:'||!['localhost','127.0.0.1'].includes(configured.hostname))return null;
 const managementBackend='http://127.0.0.1:3110';
 const destination=`http://127.0.0.1:3001/${officeMode?'admin':'super-admin'}/login`;
 const healthy=async(origin:string)=>{
  try{const response=await fetcher(origin+'/health',{cache:'no-store',signal:AbortSignal.timeout(2500)});return response.ok&&(await response.json()).status==='healthy';}catch{return false;}
 };
 const dedicated=configured.port==='3110';
 if(!officeMode&&!dedicated&&await healthy(configured.origin))return null;
 if(await healthy(managementBackend))return destination;
 throw Error('Local backend is not running. Start backend/scripts/start-super-admin-local.cjs, then retry sign in.');
}

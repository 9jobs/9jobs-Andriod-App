export const managementBackend=process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/,'')||'http://127.0.0.1:3110';
export async function managementRequest(getToken:()=>Promise<string|null>,path:string,method='GET',body?:unknown){
 const session=await getToken();if(!session)throw Error('Sign in with your approved Clerk account.');
 const exchange=await fetch(`${managementBackend}/api/super-admin/session`,{method:'POST',headers:{Authorization:`Bearer ${session}`},cache:'no-store'});
 const account=await exchange.json();if(!exchange.ok)throw Error(account.error||'Protected owner required');
 const response=await fetch(`${managementBackend}/api/super-admin${path}`,{method,headers:{Authorization:`Bearer ${account.token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 const payload=await response.json();if(!response.ok)throw Error(payload.error||'Management request failed');return payload;
}

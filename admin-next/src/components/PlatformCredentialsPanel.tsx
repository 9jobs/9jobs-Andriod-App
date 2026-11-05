"use client";
import { useCallback, useEffect, useRef, useState } from "react";
type Submission={id:string;clientName:string;accountEmail:string;platform:string;loginEmail:string;submittedAt:string};
export function PlatformCredentialsPanel({backendUrl,getToken}:{backendUrl:string;getToken:()=>Promise<string|null>}){
 const tokenGetter=useRef(getToken);tokenGetter.current=getToken;
 const [rows,setRows]=useState<Submission[]>([]),[error,setError]=useState("");
 const [revealed,setRevealed]=useState<{id:string;password:string}|null>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const revealSequence=useRef(0);
 const hide=()=>{revealSequence.current++;setRevealed(null);if(timer.current)clearTimeout(timer.current);timer.current=null;};
 const load=useCallback(async()=>{
  try{
   const token=await tokenGetter.current();if(!token)throw new Error();
   const r=await fetch(`${backendUrl}/api/admin/platform-credentials`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
   if(r.status===403){
    setRows([]);revealSequence.current++;setRevealed(null);
    setError("Platform credentials are restricted to authorized owners. Assigned client information is available below.");return;
   }
   if(!r.ok)throw new Error();
   setRows((await r.json()).submissions);setError("");
  }catch{setRows([]);revealSequence.current++;setRevealed(null);setError("Unable to load platform credentials. Please retry or contact your Super Admin.");}
 },[backendUrl]);
 useEffect(()=>{void load();const interval=setInterval(()=>void load(),30000);return()=>{revealSequence.current++;clearInterval(interval);if(timer.current)clearTimeout(timer.current);};},[load]);
 useEffect(()=>{
  const hideOnBlur=()=>{revealSequence.current++;setRevealed(null);};
  window.addEventListener("blur",hideOnBlur);document.addEventListener("visibilitychange",hideOnBlur);
  return()=>{window.removeEventListener("blur",hideOnBlur);document.removeEventListener("visibilitychange",hideOnBlur);};
 },[]);
 async function reveal(id:string){
  if(revealed?.id===id){hide();return;}
  hide();
  const sequence=revealSequence.current;
  try{
   const token=await tokenGetter.current();if(!token)throw new Error();
   const r=await fetch(`${backendUrl}/api/admin/platform-credentials/${encodeURIComponent(id)}/reveal`,{method:"POST",headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
   if(!r.ok)throw new Error();
   const result=await r.json();
   if(sequence!==revealSequence.current)return;
   setRevealed({id,password:result.password});
   timer.current=setTimeout(()=>setRevealed(null),30000);
  }catch{setError("Credential access was not authorized or is temporarily unavailable.");}
 }
 return <div className="card" style={{marginBottom:20}}>
  <div className="controls-row"><div><h3>Client Platform Credentials</h3><p>LinkedIn and SEEK submissions. Password access is recorded and hides after 30 seconds.</p></div><button className="btn btn-secondary" onClick={()=>void load()}>Refresh</button></div>
  {!!error&&<p role="alert">{error}</p>}
  <div className="table-responsive"><table className="table"><thead><tr><th>Client</th><th>Platform</th><th>Login Email</th><th>Password</th><th>Submitted</th></tr></thead><tbody>
   {rows.map(row=><tr key={row.id}><td><strong>{row.clientName}</strong><br/>{row.accountEmail}</td><td>{row.platform}</td><td>{row.loginEmail}</td><td><span>{revealed?.id===row.id?revealed.password:"••••••••"}</span> <button className="btn btn-secondary btn-sm" onClick={()=>void reveal(row.id)}>{revealed?.id===row.id?"Hide":"Reveal"}</button></td><td>{new Date(row.submittedAt).toLocaleString()}</td></tr>)}
   {!rows.length&&!error&&<tr><td colSpan={5}>No credential submissions yet.</td></tr>}
  </tbody></table></div>
 </div>;
}

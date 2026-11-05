"use client";
import {useEffect,useRef,useState} from 'react';
import {useAuth,useClerk,useSignIn,useUser} from '@clerk/clerk-react';
import {beginManagementVerification,prepareManagementChallenge,verifyManagementChallenge,type LoginAttempt,type LoginChallenge,type ManagementSignIn} from '../../lib/managementVerification';
import {exchangeManagementSession,saveManagementEntry,managementLandingPath,ManagementSessionError,isLockedLogin,isAlreadySignedIn,findActiveLoginSession,managementLoginPath,isManagementLoginLocation} from '../../lib/managementSession';
import {RobotWelcome} from '../RobotWelcome';
import {Eye,EyeOff} from 'lucide-react';
import './management.css';
import './office-login.css';

export function ManagementLogin({kind}:{kind:'owner'|'office'}){
 const {signIn,setActive,isLoaded}=useSignIn(),clerk=useClerk(),{getToken,isLoaded:authLoaded,sessionId}=useAuth(),{user,isLoaded:userLoaded}=useUser();
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[code,setCode]=useState('');
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[checking,setChecking]=useState(true),[locked,setLocked]=useState(false);
 const [challenge,setChallenge]=useState<LoginChallenge|null>(null),[recovery,setRecovery]=useState<'email'|'code'|null>(null);
 const [passwordFocused,setPasswordFocused]=useState(false),[showPassword,setShowPassword]=useState(false);
 const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const role=kind==='owner'?'Super Admin':'Office Admin';
 function fail(failure:any){if(isLockedLogin(failure))setLocked(true);setError(failure?.errors?.[0]?.longMessage||failure?.errors?.[0]?.message||failure?.message||'Unable to sign in. Please retry.');}
 async function finish(sessionId?:string,canContinue:()=>boolean=()=>mounted.current){
  const active=sessionId?clerk.client?.sessions.find(session=>session.id===sessionId):clerk.session;
  const token=active?await active.getToken():sessionId?null:await getToken();
  const payload=await exchangeManagementSession(kind,token,active?.user?.id||clerk.user?.id||user?.id);
  if(!canContinue()||!isManagementLoginLocation(kind,window.location.pathname))return;
  saveManagementEntry(kind,payload.token,localStorage);
  window.location.replace(managementLandingPath(kind));
 }
 useEffect(()=>{
  let active=true;
  if(!isLoaded||!authLoaded||!userLoaded)return;
  if(!user){setChecking(false);return;}
  if(busy){setChecking(false);return;}
  setChecking(true);
  void finish(undefined,()=>active&&mounted.current).catch(failure=>{if(!active)return;if(failure instanceof ManagementSessionError&&[401,403].includes(failure.status))setNotice(`Sign in with your approved ${role} account.`);else fail(failure);}).finally(()=>{if(active)setChecking(false);});
  return()=>{active=false;};
 },[isLoaded,authLoaded,userLoaded,user?.id,sessionId,kind]);
 async function resumeSignedInAccount(refresh=false){
  if(refresh)await clerk.client?.reload();
  const existing=findActiveLoginSession(clerk.client?.sessions||[],email,sessionId);
  if(!existing)return false;
  await clerk.setActive({session:existing.id});
  await finish(existing.id);
  return true;
 }
 async function advance(attempt:LoginAttempt,resource:ManagementSignIn){
  if(attempt.status==='complete'&&attempt.createdSessionId){
   if(!setActive)throw Error('Authentication is loading.');
   setChallenge(null);setRecovery(null);setPassword('');setConfirmation('');setCode('');
   await setActive({session:attempt.createdSessionId});await finish(attempt.createdSessionId);return;
  }
  setChallenge(await beginManagementVerification(resource,attempt));setRecovery(null);setPassword('');setCode('');
 }
 async function submit(event:React.FormEvent){
  event.preventDefault();if(busy||checking)return;setError('');setNotice('');setBusy(true);
  try{
   if(!isLoaded||!signIn||!setActive)throw Error('Authentication is loading.');
   if(recovery==='code'){
    if(password!==confirmation)throw Error('Passwords do not match.');
    const result=await signIn.attemptFirstFactor({strategy:'reset_password_email_code',code:code.trim(),password});
    setLocked(false);await advance(result,signIn);return;
   }
   if(challenge){await advance(await verifyManagementChallenge(signIn,challenge,code),signIn);return;}
   if(recovery==='email'){
    if(clerk.session){await clerk.signOut({redirectUrl:managementLoginPath(kind)});return;}
    const resource=clerk.client?.signIn||signIn;
    await resource.create({strategy:'reset_password_email_code',identifier:email.trim()});
    setRecovery('code');setCode('');setNotice('A reset code was sent to your registered email.');return;
   }
   if(locked)return;
   if(await resumeSignedInAccount())return;
   if(clerk.session){await clerk.signOut({redirectUrl:managementLoginPath(kind)});return;}
   const resource=clerk.client?.signIn||signIn;
   await advance(await resource.create({identifier:email.trim(),password}),resource);
  }catch(failure){
   if(isAlreadySignedIn(failure)){
    try{if(!await resumeSignedInAccount(true))throw Error('Your signed-in session could not be restored. Refresh this page and sign in again.');}catch(resumeFailure){fail(resumeFailure);}
   }else fail(failure);
  }finally{setBusy(false);}
 }
 async function resend(){if(!signIn||!challenge)return;setBusy(true);setError('');try{await prepareManagementChallenge(signIn,challenge);setCode('');setNotice('A new code was sent.');}catch(failure){fail(failure);}finally{setBusy(false);}}
 function back(){setChallenge(null);setRecovery(null);setCode('');setPassword('');setConfirmation('');setError('');setNotice('');}
 const verification=!!challenge;
 const instruction=challenge?.strategy==='totp'?'Enter the code from your authenticator app.':challenge?.strategy==='backup_code'?'Enter an unused backup code.':`Enter the code sent ${challenge?.destination?'to '+challenge.destination:challenge?.strategy==='phone_code'?'to your phone':'to your email'}.`;
 const content=<>
  {kind==='office'?<><div className="auth-login-brand"><span className="auth-brand-badge">9JOBS</span><span>9Jobs<span className="auth-brand-admin"> OFFICE ADMIN</span></span></div><span className="auth-form-eyebrow">YOUR WORKSPACE AWAITS</span></>:<><span className="sa-brand">9<span>JOBS</span></span><p className="sa-eyebrow">{role.toUpperCase()}</p></>}
  <h1>{recovery?'Reset password':verification?'Verify sign in':kind==='office'?'Welcome back':`${role} login`}</h1>
  <p>{recovery?'Reset your password using your registered email.':verification?instruction:kind==='owner'?'Manage your team, clients and permissions.':'Sign in to open your Admin Panel.'}</p>
  {checking?<p role="status">Checking your session…</p>:<form onSubmit={submit}>
   {!verification&&recovery!=='code'&&<label>Email<input type="email" autoComplete="username" value={email} onChange={event=>setEmail(event.target.value)} required disabled={busy}/></label>}
   {(verification||recovery==='code')&&<label>{challenge?.strategy==='backup_code'?'Backup code':recovery?'Reset code':'Verification code'}<input value={code} onChange={event=>setCode(event.target.value)} inputMode={challenge?.strategy==='backup_code'?'text':'numeric'} autoComplete="one-time-code" required disabled={busy} autoFocus/></label>}
   {!verification&&recovery!=='email'&&<label>{recovery?'New password':'Password'}<div className={kind==='office'?'auth-password-field':undefined}><input type={kind==='office'&&showPassword?'text':'password'} autoComplete={recovery?'new-password':'current-password'} value={password} onChange={event=>setPassword(event.target.value)} onFocus={()=>setPasswordFocused(true)} onBlur={()=>setPasswordFocused(false)} required disabled={busy}/>{kind==='office'&&<button type="button" className="auth-password-toggle" aria-label={showPassword?'Hide password':'Show password'} aria-pressed={showPassword} onClick={()=>setShowPassword(value=>!value)}>{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button>}</div></label>}
   {recovery==='code'&&<label>Confirm new password<input type="password" autoComplete="new-password" value={confirmation} onChange={event=>setConfirmation(event.target.value)} required disabled={busy}/></label>}
   {error&&<p className="sa-error" role="alert">{error}</p>}{notice&&<p className="sa-notice" role="status">{notice}</p>}
   <button type="submit" disabled={busy||!isLoaded||(!recovery&&locked)}>{busy?'Please wait…':recovery==='email'?'Send reset code':recovery==='code'?'Reset password and sign in':verification?'Verify and sign in':kind==='office'?'Sign in to your workspace':'Sign in'}</button>
  </form>}
  {!checking&&!verification&&!recovery&&<button className="sa-secondary" disabled={busy} onClick={()=>{back();setRecovery('email');}}>Forgot password?</button>}
  {verification&&['email_code','phone_code'].includes(challenge!.strategy)&&<button className="sa-secondary" disabled={busy} onClick={()=>void resend()}>Resend code</button>}
  {(verification||recovery)&&<button className="sa-secondary" disabled={busy} onClick={back}>Back to login</button>}
  {user&&<button type="button" className="sa-secondary" disabled={busy||checking} onClick={()=>void clerk.signOut({redirectUrl:managementLoginPath(kind)})}>Use another account</button>}
  <a href={kind==='owner'?'/admin/login':'/super-admin/login'}>{kind==='owner'?'Office Admin login':'Super Admin login'}</a>
  {kind==='office'&&<span className="auth-form-footer">Your career, elevated.</span>}
 </>;
 return kind==='office'?<main className="auth-overlay office-management-login"><div className="auth-card auth-split-card"><RobotWelcome passwordFocused={passwordFocused}/><section className="auth-form-panel">{content}</section></div></main>:<main className="sa-root sa-login"><section className="sa-login-card">{content}</section></main>;
}

"use client";
import {useRouter} from 'next/navigation';
import { useAuth } from '@clerk/clerk-react';
import { useEffect,useState,useCallback } from 'react';
import { managementRequest } from '../../lib/superAdminApi';
import {exchangeManagementSession,ManagementSessionError} from '../../lib/managementSession';
import { ManagementViews } from './ManagementViews';
import './management.css';
export function ManagementShell({section}:{section:'admins'|'clients'|'permissions'}){
 const router=useRouter();const {getToken,isLoaded,isSignedIn,userId}=useAuth();const [allowed,setAllowed]=useState(false),[error,setError]=useState('');
 const api=useCallback((path:string,method?:string,body?:unknown)=>managementRequest(()=>getToken(),path,method,body),[getToken]);
 useEffect(()=>{let active=true;if(!isLoaded)return;setAllowed(false);setError('');if(!isSignedIn){router.replace('/super-admin/login');return;}void getToken().then(token=>exchangeManagementSession('owner',token,userId)).then(()=>{if(active)setAllowed(true);}).catch(e=>{if(active){if(e instanceof ManagementSessionError&&[401,403].includes(e.status))router.replace('/super-admin/login');else setError(e.message);}});return()=>{active=false;};},[getToken,isLoaded,isSignedIn,userId,router]);
 if(!isLoaded||!isSignedIn||(!allowed&&!error))return <main className="sa-root"><p role="status">Opening Super Admin…</p></main>;
 return <main className="sa-root"><header className="sa-header"><span className="sa-brand">9<span>JOBS</span> <small>SUPER ADMIN</small></span><a href="/super-admin/login">Account</a></header><nav className="sa-nav" aria-label="Super Admin management">{[['admins','Manage Admins'],['clients','Manage Clients'],['permissions','Manage Permissions']].map(([key,label])=><a key={key} href={`/super-admin/${key}`} aria-current={section===key?'page':undefined}>{label}</a>)}</nav>{error?<section className="sa-panel"><p className="sa-error" role="alert">{error}</p><a href="/super-admin/login">Super Admin login</a></section>:allowed?<ManagementViews section={section} api={api} />:<p>Verifying protected owner access…</p>}</main>;
}

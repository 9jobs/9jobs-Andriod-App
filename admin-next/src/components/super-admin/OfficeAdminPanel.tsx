"use client";
import dynamic from 'next/dynamic';
import {useAuth} from '@clerk/clerk-react';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {exchangeManagementSession,saveManagementEntry,ManagementSessionError} from '../../lib/managementSession';
import './management.css';
const ExistingAdminPanel=dynamic(()=>import('../../App'),{ssr:false});
export function OfficeAdminPanel(){
 const {getToken,isLoaded,isSignedIn,userId}=useAuth(),router=useRouter();
 const [allowed,setAllowed]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;setAllowed(false);setError('');if(!isLoaded)return;if(!isSignedIn){router.replace('/admin/login');return;}
  void (async()=>{try{const payload=await exchangeManagementSession('office',await getToken(),userId);if(!active)return;saveManagementEntry('office',payload.token,localStorage);setAllowed(true);}catch(failure){if(!active)return;if(failure instanceof ManagementSessionError&&[401,403].includes(failure.status))router.replace('/admin/login');else setError(failure instanceof Error?failure.message:'Unable to verify access.');}})();
  return()=>{active=false;};
 },[getToken,isLoaded,isSignedIn,userId,router]);
 if(!allowed||!isSignedIn)return <main className="sa-root">{error?<><p className="sa-error" role="alert">{error}</p><a href="/admin/login">Office Admin login</a></>:<p role="status">Opening your Admin Panel…</p>}</main>;
 return <ExistingAdminPanel/>;
}

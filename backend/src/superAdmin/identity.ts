import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyClerkSession } from '../middleware/sheetIdentity';
import { lookupVerifiedAccount } from '../services/verifiedAccount';
import { claimApprovedOfficeAccess } from './emailApproval';
import { enabled, resolveAccess, type Access } from './store';

export async function clerkIdentity(token:string){
 const principal=await verifyClerkSession(token);
 const claims=jwt.decode(token) as jwt.JwtPayload;
 const account=await lookupVerifiedAccount(principal.userId);
 if(typeof claims.sid!=='string'||typeof claims.iss!=='string'||claims.iss!==process.env.CLERK_ISSUER)throw Error('Verified Clerk identity required');
 return {...account,issuer:claims.iss,sid:claims.sid};
}
export async function activeClerkSession(sid:string,userId:string){
 if(!process.env.CLERK_SECRET_KEY)throw Error('Clerk development verification not configured');
 const response=await fetch(`https://api.clerk.com/v1/sessions/${encodeURIComponent(sid)}`,{headers:{Authorization:`Bearer ${process.env.CLERK_SECRET_KEY}`},signal:AbortSignal.timeout(10000),redirect:'error'});
 if(!response.ok)throw Error('Session verification unavailable');const session=await response.json() as any;
 if(session.user_id!==userId||session.id!==sid||session.status!=='active'||session.expire_at<=Date.now())throw Error('Inactive Clerk session');
}
export async function verifyManagedClaims(claims:jwt.JwtPayload):Promise<Access>{
 if(!enabled()||typeof claims.management_issuer!=='string'||typeof claims.clerk_sid!=='string')throw Error('Managed identity required');
 const access=await resolveAccess(claims.userId,claims.management_issuer);
 if(!access||access.kind!==claims.management_kind)throw Error('Management access revoked');
 await activeClerkSession(claims.clerk_sid,claims.userId);
 return access;
}
export async function sessionExchange(req:Request,res:Response,kind:'owner'|'office'){
 res.setHeader('Cache-Control','no-store');
 if(!enabled())return res.status(404).json({error:'Management is not enabled'});
 try{const raw=req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];if(!raw)return res.status(401).json({error:'Sign in with Clerk first'});
 const account=await clerkIdentity(raw);let access=await resolveAccess(account.userId,account.issuer);
 if(!access&&kind==='office'){await claimApprovedOfficeAccess(account);access=await resolveAccess(account.userId,account.issuer);}
 if(!access||access.kind!==kind)return res.status(403).json({error:kind==='owner'?'Super Admin identity is unbound or this account is not the protected owner.':'This employee account is not approved and active.'});
 const secret=process.env.JWT_SECRET;if(!secret||secret.length<32)throw Error('Token configuration missing');
 const user={userId:account.userId,email:account.email,fullName:account.fullName,role:'admin'};
 const token=jwt.sign({...user,identity_verified:true,auth_method:'clerk',management_kind:kind,management_issuer:account.issuer,clerk_sid:account.sid},secret,{algorithm:'HS256',issuer:'9jobs-backend',audience:'9jobs-api',expiresIn:'15m'});
 return res.json({token,user,access:{kind,version:access.version}});
 }catch{return res.status(401).json({error:'A verified active Clerk development session is required.'});}
}
export async function ownerOnly(req:Request & {management?:Access},res:Response,next:NextFunction){
 try{const raw=req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];if(!raw)throw Error('Missing token');
 const claims=jwt.verify(raw,process.env.JWT_SECRET!,{algorithms:['HS256'],issuer:'9jobs-backend',audience:'9jobs-api'}) as jwt.JwtPayload;
 if(claims.identity_verified!==true||claims.management_kind!=='owner')return res.status(403).json({error:'Protected owner required'});
 const access=await verifyManagedClaims(claims);if(access.kind!=='owner')throw Error('Owner required');req.management=access;next();
 }catch{return res.status(403).json({error:'Protected owner access required'});}
}

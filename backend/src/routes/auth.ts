import { Router } from "express";
import jwt from "jsonwebtoken";
import { enabled, managementDb } from "../superAdmin/store";
import { timingSafeEqual } from "node:crypto";
import { verifyClerkSession } from "../middleware/sheetIdentity";
import { lookupVerifiedAccount, persistVerifiedAccount } from "../services/verifiedAccount";
import { sheetDb } from "../services/sheetStore";

function equal(a:string,b:string) { const x=Buffer.from(a),y=Buffer.from(b); return x.length===y.length && timingSafeEqual(x,y); }
export function createAuthRouter(database = sheetDb) {
 const router = Router();
 router.post("/token", async(req,res)=>{
  const secret=process.env.JWT_SECRET;
  if (!secret || secret.length < 32) return res.status(503).json({error:"Authentication is not configured"});
  try {
   const session=req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
   let user:{userId:string;role:string;email:string;fullName:string};
   if (session) {
    const principal=await verifyClerkSession(session);
    if(enabled() && (await managementDb().query("select 1 from admin_management.office_admins where clerk_user_id=$1",[principal.userId])).rowCount)return res.status(403).json({error:"Use the separate Office Admin login."});
    const account=await lookupVerifiedAccount(principal.userId);
    if ((req.body?.role === "admin" || principal.role === "admin") && (principal.role !== "admin" || account.email !== "9jobsapplicationservice@gmail.com")) return res.status(403).json({error:"Only the approved 9Jobs admin email can access this panel."});
    await persistVerifiedAccount(account,database(),principal.role);
    user={...account,role:principal.role};
   } else {
    // Preserve password-admin login using server-side configuration only.
    const email=String(req.body?.email || "").trim().toLowerCase();
    const expectedEmail=process.env.ADMIN_LOGIN_EMAIL?.trim().toLowerCase();
    const password=process.env.ADMIN_LOGIN_PASSWORD;
    if (expectedEmail !== "9jobsapplicationservice@gmail.com" || !password || !email || !equal(email,expectedEmail) || !equal(String(req.body?.password || ""),password)) return res.status(401).json({error:"Verified login required"});
    user={userId:"admin",role:"admin",email:expectedEmail,fullName:"9Jobs Administrator"};
   }
   const token=jwt.sign({...user,identity_verified:true,auth_method:session?"clerk":"password"},secret,{algorithm:"HS256",issuer:"9jobs-backend",audience:"9jobs-api",expiresIn:"1h"});
   res.setHeader("Cache-Control","no-store");
   return res.json({token,user});
  } catch {return res.status(401).json({error:"Verified account login required"});}
 });
 return router;
}
export default createAuthRouter();

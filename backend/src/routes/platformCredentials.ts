import { Router } from "express";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { credentialDb, initializeCredentialVault, openCredentials, savePlatformCredentials } from "../services/platformCredentials";
import { randomUUID } from "node:crypto";
const router=Router();
router.use(["/mobile/platform-credentials","/admin/platform-credentials"],(_req,res,next)=>{
 res.setHeader("Cache-Control","no-store");res.setHeader("Pragma","no-cache");next();
});
function allowedAdmin(req:AuthenticatedRequest){
 return req.user?.role==="admin"&&(process.env.SHEET_ADMIN_USER_IDS||"").split(",").includes(req.user.userId);
}
router.post("/mobile/platform-credentials",authMiddleware,async(req:AuthenticatedRequest,res)=>{
 try{
  await initializeCredentialVault();
  const saved=await savePlatformCredentials(req.user!.userId,req.body);
  if(!saved)return res.status(400).json({error:"Select a platform, enter a valid email and password, and confirm consent."});
  return res.status(201).json({success:true,submission:saved});
 }catch{return res.status(503).json({error:"Secure credential submission is unavailable. Please try again later."});}
});
router.get("/admin/platform-credentials",authMiddleware,async(req:AuthenticatedRequest,res)=>{
 if(!allowedAdmin(req))return res.status(403).json({error:"Administrator access required"});
 try{
  await initializeCredentialVault();
  const result=await credentialDb().query(`select s.*,a.full_name,a.email as account_email from credential_vault.submissions s
   join sheet_sync.verified_accounts a on a.user_id=s.user_id order by s.submitted_at desc`);
  return res.json({submissions:result.rows.map(row=>({id:row.id,userId:row.user_id,clientName:row.full_name,accountEmail:row.account_email,platform:row.platform,
   loginEmail:openCredentials(row.ciphertext,`${row.id}:${row.user_id}:${row.platform}`).email,submittedAt:row.submitted_at}))});
 }catch{return res.status(503).json({error:"Credential listing is unavailable."});}
});
router.post("/admin/platform-credentials/:id/reveal",authMiddleware,async(req:AuthenticatedRequest,res)=>{
 if(!allowedAdmin(req))return res.status(403).json({error:"Administrator access required"});
 if(!/^[a-f0-9-]{36}$/.test(req.params.id))return res.status(400).json({error:"Invalid submission"});
 try{
  const db=credentialDb();const result=await db.query("select * from credential_vault.submissions where id=$1",[req.params.id]);
  const row=result.rows[0];if(!row)return res.status(404).json({error:"Submission not found"});
  const value=openCredentials(row.ciphertext,`${row.id}:${row.user_id}:${row.platform}`);
  await db.query("insert into credential_vault.access_audit(id,submission_id,admin_id) values($1,$2,$3)",[randomUUID(),row.id,req.user!.userId]);
  return res.json({password:value.password});
 }catch{return res.status(503).json({error:"Credential access is unavailable."});}
});
export default router;

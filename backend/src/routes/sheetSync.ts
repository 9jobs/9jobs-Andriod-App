import { Router } from "express";
import { sheetIdentity, SheetRequest } from "../middleware/sheetIdentity";
import { readSheetJobs, sheetDb, sheetEnabled, sheetVersion, SHEET_ID } from "../services/sheetStore";
import { lookupVerifiedAccount, persistVerifiedAccount } from "../services/verifiedAccount";
import { approveClientEmails,reviewClientEmails } from "../services/clientEmailAssociations";
import { requestLocalSheetRefresh } from "../services/localSyncFreshness";
export function createSheetRouter(database: typeof sheetDb = sheetDb) {
const router = Router();
router.use((req,res,next)=>sheetEnabled() ? next() : next("router"));
router.use("/mobile/sheet-records",sheetIdentity,async(req:SheetRequest,res,next)=>{
  try {if(req.sheetPrincipal!.role==="client")await persistVerifiedAccount(await lookupVerifiedAccount(req.sheetPrincipal!.userId),database());next();}
  catch {return res.status(503).json({error:"Verified account mapping is temporarily unavailable"});}
});
router.get("/mobile/sheet-records/version",sheetIdentity,async(req:SheetRequest,res)=>{
  try {
    res.setHeader("Cache-Control","private, no-store");
    return res.json(await sheetVersion(req.sheetPrincipal!.userId,database()));
  } catch {return res.status(503).json({error:"Sheet version is temporarily unavailable"});}
});
router.get(["/admin/sheet-sync/records","/mobile/sheet-records"],sheetIdentity,async(req:SheetRequest,res)=>{
  const adminPath=req.path.startsWith("/admin/");
  if(adminPath && req.sheetPrincipal?.role!=="admin") return res.status(403).json({error:"Administrator access required"});
  const limit=Number(req.query.limit ?? 200),offset=Number(req.query.offset ?? 0);
  if(!Number.isInteger(limit)||limit<1||limit>1000||!Number.isInteger(offset)||offset<0) return res.status(400).json({error:"Invalid pagination"});
  try {
    res.setHeader("Cache-Control","private, no-store");
    await requestLocalSheetRefresh(database());
    return res.json(await readSheetJobs({admin:adminPath,userId:req.sheetPrincipal!.userId,query:typeof req.query.q==="string" ? req.query.q : "",limit,offset,snapshotId:typeof req.query.snapshotId==="string" ? req.query.snapshotId : undefined},database()));
  } catch {return res.status(503).json({error:"Sheet records are temporarily unavailable"});}
});
router.get("/admin/sheet-sync/status",sheetIdentity,async(req:SheetRequest,res)=>{
  if(req.sheetPrincipal?.role!=="admin")return res.status(403).json({error:"Administrator access required"});
  try {
    const result=await database().query("select s.id,s.imported_at,s.record_count,s.candidate_count,s.source_completed,s.diagnostics,h.checked_at from sheet_sync.head h join sheet_sync.snapshots s on s.id=h.snapshot_id where h.source_id=$1",[`${SHEET_ID}:review`]);
    return res.json({snapshot:result.rows[0]||null});
  }catch{return res.status(503).json({error:"Sheet import is not configured"});}
});
router.get("/admin/client-accounts",sheetIdentity,async(req:SheetRequest,res)=>{
 if(req.sheetPrincipal?.role!=="admin")return res.status(403).json({error:"Administrator access required"});
 try {
  res.setHeader("Cache-Control","private, no-store");
  const result=await database().query(`select d.user_id,d.full_name,d.email,d.email_verified,d.registration_status,d.registered_at,v.last_authenticated_at,
   case when d.email_verified then d.email else null end as verified_email,
   a.client_id,case when a.user_id is null then 'pending' when a.revoked_at is not null then 'revoked' else 'linked' end as mapping_status,
   activity.source_activity
   from sheet_sync.account_directory d left join sheet_sync.verified_accounts v on v.user_id=d.user_id left join sheet_sync.client_accounts a on a.user_id=d.user_id
   left join lateral (
    select jsonb_build_object('records',count(*),'emailsSent',count(*) filter(where lower(trim(r.fields->>9))='sent'),
      'messagesSent',count(*) filter(where lower(trim(r.fields->>10))='sent'),
      'messagesShared',count(*) filter(where lower(trim(r.fields->>10))='shared'),
      'contactsAdded',count(distinct lower(regexp_replace(trim(r.fields->>8),'\\s+',' ','g'))) filter(where trim(r.fields->>8)<>'' and trim(r.fields->>8)!~'^[.\\-–—]+$')) as source_activity
    from sheet_sync.clients c join sheet_sync.head h on h.source_id=c.source_spreadsheet_id
    join sheet_sync.client_record_owners o on o.snapshot_id=h.snapshot_id and o.client_id=c.client_id
    join sheet_sync.records r on r.id=o.record_id where c.client_id=a.client_id and a.revoked_at is null
   ) activity on true order by d.registered_at desc limit 1000`);
  return res.json({users:result.rows});
 }catch{return res.status(503).json({error:"Verified account listing unavailable"});}
});
router.get("/admin/sheet-sync/automation",sheetIdentity,async(req:SheetRequest,res)=>{
 if(req.sheetPrincipal?.role!=="admin")return res.status(403).json({error:"Administrator access required"});
 try{
  res.setHeader('Cache-Control','private, no-store');
  const status=await database().query('select * from sheet_sync.automation_status where source_id=$1',[SHEET_ID]);
  const clients=await database().query(`select c.*,s.record_count,s.last_success_at from sheet_sync.clients c left join sheet_sync.candidate_sync_state s using(client_id) where c.source_spreadsheet_id=$1 order by c.source_sheet_id`,[SHEET_ID]);
  return res.json({status:status.rows[0]||null,clients:clients.rows,masterToDuplicateVerified:false});
 }catch{return res.status(503).json({error:'Automation status unavailable'});}
});
router.post('/admin/client-email-associations',sheetIdentity,async(req:SheetRequest,res)=>{
 if(req.sheetPrincipal?.role!=="admin")return res.status(403).json({error:"Administrator access required"});
 try{
  const rows=req.body?.associations;
  if(req.body?.approve===true)return res.json(await approveClientEmails(rows,req.sheetPrincipal.userId,String(req.body?.reviewDigest||''),database()));
  return res.json(await reviewClientEmails(rows,database()));
 }catch{return res.status(409).json({error:'Invalid, changed or conflicting associations; existing mappings preserved'});}
});
return router;
}
export default createSheetRouter();

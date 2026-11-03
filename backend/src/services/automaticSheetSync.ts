import {createHash,randomUUID} from "node:crypto";
import type {Pool} from "pg";
import {assertDevelopmentDatabase} from "../lib/database";
import {SHEET_ID,prepareSheetRows,clientRegistrySchema} from "./sheetStore";
import {sourceDateCandidates} from "./sheetApplications";
const {acceptsValidation,acceptsIndependentValidation}=require('../../scripts/sheet-source-consistency.cjs');
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export function assertIsolatedSyncTarget(){
 assertDevelopmentDatabase();
}
export async function initializeAutomaticSync(db:Pool){
 assertIsolatedSyncTarget();await db.query(clientRegistrySchema);
 await db.query(`insert into sheet_sync.automation_status(source_id,state) values($1,'pending') on conflict(source_id) do nothing`,[SHEET_ID]);
}
export function discoverCandidates(metadata:any,sample:any,indexLinks:any){
 if(metadata.spreadsheetId!==SHEET_ID||!acceptsValidation(sample)&&!acceptsIndependentValidation(sample))throw new Error('Fresh consistent Duplicate snapshot required');
 const grid=indexLinks.sheets?.find((s:any)=>s.properties.title==='Candidate_Index');
 if(!grid)throw new Error('Candidate index link evidence missing');
 const linkRows=(grid.data||[]).flatMap((b:any)=>b.rowData||[]);
 const grouped=new Map<string,any[]>();
 for(const row of sample.allJobs.values.slice(1)){
  if(!row.some((v:any)=>String(v??'').trim()))continue;
  const label=String(row[0]).trim();if(!grouped.has(label))grouped.set(label,[]);grouped.get(label)!.push(row);
 }
 const seen=new Set<string>(),candidates:any[]=[],reviews:any[]=[];
 const labels=new Map<string,number>();for(const r of sample.candidateIndex.values.slice(1)){const n=String(r[0]||'').trim();if(n)labels.set(n,(labels.get(n)||0)+1);}
 for(let i=1;i<sample.candidateIndex.values.length;i++){
  const row=sample.candidateIndex.values[i],name=String(row[0]||'');if(!name.trim())continue;
  try{
   if(labels.get(name.trim())!==1)throw new Error('ambiguous_candidate_label');
   const link=linkRows[i]?.values?.[0]?.hyperlink||'';
   if(!link)throw new Error('missing_index_link');
   const u=new URL(link,`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`);
   const match=/^#gid=(\d+)$/.exec(u.hash),gid=match?.[1];
   if(u.protocol!=='https:'||u.hostname!=='docs.google.com'||u.pathname!==`/spreadsheets/d/${SHEET_ID}/edit`||!gid||seen.has(gid))throw new Error('ambiguous_index_link');
   const tab=metadata.sheets.filter((s:any)=>String(s.properties.sheetId)===gid);
   if(tab.length!==1||tab[0].properties.title!==name||['All_Jobs','Candidate_Index','Client_Registry'].includes(name))throw new Error('source_identity_mismatch');
   const rows=grouped.get(name.trim())||[],count=Number(String(row[1]).replace(/,/g,''));
   if(!Number.isSafeInteger(count)||count<0||rows.length!==count)throw new Error('count_mismatch');
   seen.add(gid);candidates.push({sheetId:gid,name,count,values:[sample.allJobs.values[0],...rows],fingerprint:hash(['view-date-evidence-v2',gid,name,rows.map((r:any)=>JSON.stringify(r)).sort()])});
  }catch{reviews.push({indexRow:i+1,reason:'candidate_identity_requires_review'});}
 }
 for(const tab of metadata.sheets)if(!seen.has(String(tab.properties.sheetId))&&!['All_Jobs','Candidate_Index','Client_Registry'].includes(tab.properties.title))reviews.push({sourceSheetId:String(tab.properties.sheetId),reason:'unindexed_or_ambiguous_tab_requires_review'});
 for(const [label,rows] of grouped)if(!labels.has(label))reviews.push({reason:'unindexed_job_label_requires_review',recordCount:rows.length});
 return {candidates,reviews};
}
export function validateCandidateView(candidate:any,view:any){
 const sheets=view.sheets||[],sheet=sheets.find((s:any)=>String(s.properties.sheetId)===candidate.sheetId);
 if(!sheet||sheet.properties.title!==candidate.name)throw new Error('Candidate tab identity changed');
 const grid=(sheet.data||[]).flatMap((b:any)=>b.rowData||[]);
 if(grid[0]?.values?.[9]?.formattedValue!=='__9JOBS_AUTO_CANDIDATE_VIEW__')throw new Error('Candidate marker missing; review classification');
 const jobs:any[]=[];let date='';
 for(const row of grid){
  const cells=row.values||[],text=(i:number)=>String(cells[i]?.formattedValue||'');
  // Preserve the source's historical date label verbatim; unsupported dates do not invent an application timestamp.
  if(text(1)==='Position'&&text(2)==='Company'){date=text(0);continue;}
  if(!/^\d+$/.test(text(0))||!text(1)||!text(2))continue;
  jobs.push([candidate.name,date,text(0),text(1),text(2),cells[2]?.hyperlink||'',cells[3]?.hyperlink||'',text(4),text(5),text(6),text(7)]);
 }
 // Legacy views render literal "link" and unsupported URI schemes as plain Link cells.
 // Only HTTP(S) working URLs can be compared to view hyperlinks. All original raw values
 // (including mailto/literal placeholders) are still stored unchanged from All_Jobs.
 const key=(r:any[])=>JSON.stringify(Array.from({length:11},(_,i)=>{
  const value=String(r[i]??'').trim();return i===1||(i===5||i===6)&&!/^https?:\/\//i.test(value)?'':value;
 }));
 if(jobs.length!==candidate.values.length-1)throw new Error('Candidate view and All_Jobs differ');
 const groups=new Map<string,any[]>();for(const r of jobs){const k=key(r);if(!groups.has(k))groups.set(k,[]);groups.get(k)!.push(r);}
 const evidence=candidate.values.slice(1).map((r:any[])=>{
  const matches=groups.get(key(r))||[],date=String(r[1]||'').trim(),dates=sourceDateCandidates(date);
  let i=matches.findIndex(x=>String(x[1]).trim()===date);
  if(i<0)i=matches.findIndex(x=>{const other=sourceDateCandidates(String(x[1]).trim());return (dates.length===1||other.length===1)&&dates.some(d=>other.includes(d));});
  if(i<0)throw new Error('Candidate view and All_Jobs differ');
  const row=matches.splice(i,1)[0],viewDate=String(row[1]).trim(),other=sourceDateCandidates(viewDate),intersection=dates.filter(d=>other.includes(d));
  return {resolved_date:intersection.length===1?intersection[0]:null,view_date:viewDate,date_resolution_status:intersection.length===1?'corroborated':'ambiguous_or_unknown'};
 });
 return prepareSheetRows(candidate.values).map((r,i)=>({...r,...evidence[i],id:hash([SHEET_ID,candidate.sheetId,r.id,r.source_row])}));
}

export async function publishAutomaticCandidates(plans:any[],sourceDigest:string,reviews:any[],db:Pool,sourceConfirmedAt=Date.now()){
 assertIsolatedSyncTarget();const c=await db.connect();
 try{
  await c.query('begin');await c.query("set local statement_timeout='120s'");await c.query('select pg_advisory_xact_lock(91035,65)');
  if((await c.query('select current_database() as name')).rows[0].name!==new URL(process.env.DATABASE_URL!).pathname.slice(1))throw new Error('Wrong local database');
  const head=(await c.query('select snapshot_id from sheet_sync.head where source_id=$1',[SHEET_ID])).rows[0]?.snapshot_id;
  const priorTime=head?(await c.query('select diagnostics from sheet_sync.snapshots where id=$1',[head])).rows[0]?.diagnostics?.sourceConfirmedAt:0;
  if(priorTime&&sourceConfirmedAt<priorTime)throw new Error('Older source cannot replace newer generation');
  const existing=(await c.query(`select c.*,s.fingerprint,s.record_count from sheet_sync.clients c left join sheet_sync.candidate_sync_state s using(client_id) where c.source_spreadsheet_id=$1`,[SHEET_ID])).rows;
  const bySheet=new Map(existing.map(r=>[r.source_sheet_id,r]));
  const old=head?(await c.query(`select m.record_id as id,m.source_row,o.client_id as owner,a.resolved_date from sheet_sync.snapshot_records m left join sheet_sync.client_record_owners o on o.snapshot_id=m.snapshot_id and o.record_id=m.record_id left join sheet_sync.record_annotations a on a.record_id=m.record_id where m.snapshot_id=$1 order by m.ordinal,m.record_id`,[head])).rows:[];
  const counts=new Map<string,number>();for(const r of old)counts.set(r.owner,(counts.get(r.owner)||0)+1);
  const changed:any[]=[],unchanged:any[]=[],held=[...reviews];
  for(const p of plans){
   const e=bySheet.get(p.sheetId);
   if(!e&&existing.some(r=>r.candidate_name===p.name&&!plans.some(other=>other.sheetId===r.source_sheet_id))){held.push({sourceSheetId:p.sheetId,reason:'possible_recreated_tab_requires_identity_review'});continue;}
   if(e&&p.count<(counts.get(e.client_id)||0)){held.push({sourceSheetId:p.sheetId,reason:'count_reduction_held'});continue;}
   if(!p.rows){if(e&&e.fingerprint===p.fingerprint)unchanged.push({...p,clientId:e.client_id});else held.push({sourceSheetId:p.sheetId,reason:'unvalidated_source_held'});continue;}
   const id=e?.client_id||'9JOBS-CL-'+randomUUID();
   await c.query(`insert into sheet_sync.clients(client_id,source_spreadsheet_id,source_sheet_id,candidate_name,created_at,last_seen_at) values($1,$2,$3,$4,now(),now()) on conflict(source_spreadsheet_id,source_sheet_id) do update set candidate_name=excluded.candidate_name,last_seen_at=now()`,[id,SHEET_ID,p.sheetId,p.name]);
   changed.push({...p,clientId:id});
  }
  const changedIds=new Set(changed.map(p=>p.clientId));
  const added=changed.flatMap(p=>p.rows.map((r:any)=>({...r,owner:p.clientId})));
  const combined=[...old.filter(r=>!changedIds.has(r.owner)),...added];
  const snapshot=hash(['automatic-duplicate-tabs-v2',combined.map(r=>[r.id,r.owner,r.source_row,r.resolved_date||null]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])))]);
  const exists=(await c.query('select 1 from sheet_sync.snapshots where id=$1',[snapshot])).rowCount;
  // Do not rebuild global membership for an unchanged source.
  let published=head;
  if(changed.length){
   published=snapshot;
   if(!exists){
    await c.query(`insert into sheet_sync.snapshots(id,source_id,record_count,candidate_count,diagnostics,source_completed) values($1,$2,$3,$4,$5,true)`,[snapshot,SHEET_ID,combined.length,new Set(combined.map(r=>r.owner).filter(Boolean)).size,JSON.stringify({policy:'validated-duplicate-tab-v1',sourceDigest,sourceConfirmedAt,held,previousSnapshot:head,originalMasterIdentityAvailable:false})]);
    for(let i=0;i<added.length;i+=500)await c.query(`insert into sheet_sync.records(id,candidate_label,fields) select id,candidate_label,fields from jsonb_to_recordset($1::jsonb) as r(id text,candidate_label text,fields jsonb) on conflict(id) do nothing`,[JSON.stringify(added.slice(i,i+500))]);
    for(let i=0;i<combined.length;i+=500){
     const batch=JSON.stringify(combined.slice(i,i+500).map((r,offset)=>({...r,ordinal:i+offset})));
     await c.query(`insert into sheet_sync.snapshot_records(snapshot_id,record_id,source_row,ordinal) select $1,id,source_row,ordinal from jsonb_to_recordset($2::jsonb) as r(id text,source_row text,ordinal integer)`,[snapshot,batch]);
     await c.query(`insert into sheet_sync.client_record_owners(snapshot_id,record_id,client_id) select $1,id,owner from jsonb_to_recordset($2::jsonb) as r(id text,owner text) where owner is not null`,[snapshot,batch]);
    }
   }
   for(let i=0;i<added.length;i+=500){
    const batch=added.slice(i,i+500),result=await c.query(`insert into sheet_sync.record_annotations(record_id,resolved_date,view_date,date_resolution_status)
     select id,resolved_date,view_date,date_resolution_status from jsonb_to_recordset($1::jsonb) as r(id text,resolved_date text,view_date text,date_resolution_status text)
     on conflict(record_id) do update set resolved_date=excluded.resolved_date,view_date=excluded.view_date,date_resolution_status=excluded.date_resolution_status
     where record_annotations.resolved_date is null or record_annotations.resolved_date=excluded.resolved_date returning record_id`,[JSON.stringify(batch)]);
    if(result.rowCount!==batch.length)throw new Error('Conflicting date evidence requires review');
   }
   for(const key of [SHEET_ID,SHEET_ID+':review'])await c.query(`insert into sheet_sync.head(source_id,snapshot_id) values($1,$2) on conflict(source_id) do update set snapshot_id=excluded.snapshot_id,checked_at=now()`,[key,snapshot]);
  }
  for(const p of [...changed,...unchanged])await c.query(`insert into sheet_sync.candidate_sync_state(client_id,fingerprint,record_count,last_success_at,source_title) values($1,$2,$3,now(),$4) on conflict(client_id) do update set fingerprint=excluded.fingerprint,record_count=excluded.record_count,last_success_at=now(),source_title=excluded.source_title`,[p.clientId,p.fingerprint,p.count,p.name]);
  if(unchanged.length)await c.query('update sheet_sync.clients set last_seen_at=now() where client_id=any($1::text[])',[unchanged.map(p=>p.clientId)]);
  for(const e of existing)if(!plans.some(p=>p.sheetId===e.source_sheet_id))held.push({sourceSheetId:e.source_sheet_id,reason:'source_missing_or_held'});
  const result={changed:changed.length,unchanged:unchanged.length,held,sourceCandidates:plans.length,total:combined.length,snapshot:published};
  await c.query(`insert into sheet_sync.sync_events(source_id,event_type,details) values($1,'sync_committed',$2)`,[SHEET_ID,JSON.stringify(result)]);
  await c.query('commit');return result;
 }catch(e){await c.query('rollback');throw e;}finally{c.release();}
}

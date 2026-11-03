// Read-only Google access; writes are pinned to the existing isolated localhost DB.
const fs=require('node:fs'),path=require('node:path');
const {runtimeConfig:localConfig}=require('./localhost-runtime-config.cjs');
const {createReadOnlyClient,DUPLICATE_SPREADSHEET_ID}=require('./inspect-duplicate-sheet.cjs');
const {readConsistentSource,acceptsValidation,acceptsIndependentValidation}=require('./sheet-source-consistency.cjs');

function refreshApproval(source,mapping){
 if(!mapping.approved_by || !mapping.email_verified || mapping.registration_status!=='verified' || mapping.revoked_at || mapping.source_spreadsheet_id!==DUPLICATE_SPREADSHEET_ID)throw new Error('Approved verified mapping required');
 if(!acceptsValidation(source.sample))throw new Error('Fresh reconciled source required');
 const tabs=source.metadata.sheets.filter(s=>String(s.properties.sheetId)===String(mapping.source_sheet_id));
 if(tabs.length!==1)throw new Error('Stable source tab missing');
 const name=tabs[0].properties.title;
 if(['All_Jobs','Candidate_Index','Client_Registry'].includes(name))throw new Error('Candidate tab required');
 const index=source.sample.candidateIndex.values.slice(1).filter(r=>r[0]===name);
 if(index.length!==1)throw new Error('Unique candidate index entry required');
 const count=Number(String(index[0][1]).replace(/,/g,''));
 if(!Number.isSafeInteger(count)||count<Number(mapping.current_count))throw new Error('Count reduction held for review; last good snapshot retained');
 return {approved:true,approvedBy:mapping.approved_by,userId:mapping.user_id,email:mapping.email,candidate:name,
  sourceSpreadsheetId:mapping.source_spreadsheet_id,sourceSheetId:String(mapping.source_sheet_id),clientId:mapping.client_id,sourceRecords:count,refreshOnly:true};
}

async function refreshOnce(db,context={}){
 const {discoverCandidates,validateCandidateView,publishAutomaticCandidates,assertIsolatedSyncTarget}=require('../src/services/automaticSheetSync');
 const {readSample,digestSource}=require('./sheet-source-consistency.cjs');
 assertIsolatedSyncTarget();
 const privateConfig=require('dotenv').parse(fs.readFileSync(path.resolve(__dirname,'../.env.sheets.local')));
 if(privateConfig.GOOGLE_DUPLICATE_SPREADSHEET_ID!==DUPLICATE_SPREADSHEET_ID)throw new Error('Duplicate target mismatch');
 const credentials=JSON.parse(fs.readFileSync(privateConfig.GOOGLE_SHEETS_SERVICE_ACCOUNT_FILE,'utf8'));
 // Globally paced GETs and bounded requestJson retries stay below the 60/min user quota.
 const spacing=Math.max(1100,Math.min(5000,Number(process.env.LOCAL_SHEET_READ_SPACING_MS)||1200));
 let queue=Promise.resolve(),last=0;
 const limitedFetch=(url,options)=>{const next=queue.then(async()=>{const delay=spacing-(Date.now()-last);if(delay>0)await new Promise(r=>setTimeout(r,delay));last=Date.now();return fetch(url,options);});queue=next.catch(()=>{});return next;};
 const dependencies={fetch:limitedFetch};
 const base=await createReadOnlyClient({spreadsheetId:DUPLICATE_SPREADSHEET_ID,credentials},dependencies);
 const metadata=await base.metadata();
 const ids=metadata.sheets.filter(s=>!['All_Jobs','Candidate_Index','Client_Registry'].includes(s.properties.title)).map(s=>String(s.properties.sheetId));
 const client=await createReadOnlyClient({spreadsheetId:DUPLICATE_SPREADSHEET_ID,credentials,candidateSheetIds:ids},dependencies);
 const sample=await readConsistentSource(client,{independentCandidates:true});
 if(!acceptsIndependentValidation(sample))throw new Error('Changing or incomplete source; retry next cycle');
 const links=await client.candidateIndexLinks();
 const {candidates,reviews}=discoverCandidates(metadata,sample,links);
 const known=(await db.query(`select c.source_sheet_id,s.fingerprint from sheet_sync.clients c join sheet_sync.candidate_sync_state s using(client_id) where c.source_spreadsheet_id=$1`,[DUPLICATE_SPREADSHEET_ID])).rows;
 const fingerprints=new Map(known.map(r=>[r.source_sheet_id,r.fingerprint]));
 const changed=candidates.filter(c=>fingerprints.get(c.sheetId)!==c.fingerprint),plans=candidates.filter(c=>fingerprints.get(c.sheetId)===c.fingerprint);
 for(let offset=0;offset<changed.length;offset+=10){
  const batch=changed.slice(offset,offset+10),view=await client.candidateViews(batch.map(c=>c.sheetId));
  for(const candidate of batch){
   try{plans.push({...candidate,rows:validateCandidateView(candidate,view)});}
   catch{reviews.push({sourceSheetId:candidate.sheetId,reason:'view_reconciliation_requires_review'});}
  }
 }
 const final=await readSample(client),finalLinks=await client.candidateIndexLinks(),finalMetadata=await client.metadata();
 const stableMetadata=value=>JSON.stringify(value.sheets.map(s=>[String(s.properties.sheetId),s.properties.title]).sort());
 if(!acceptsIndependentValidation(sample)||digestSource(final.allJobs,final.candidateIndex)!==sample.sourceValidation.digest||JSON.stringify(finalLinks)!==JSON.stringify(links)||stableMetadata(metadata)!==stableMetadata(finalMetadata))throw new Error('Source changed during candidate reads; last committed data retained');
 if(context.assertLease)await context.assertLease();
 return publishAutomaticCandidates(plans,sample.sourceValidation.digest,reviews,db,sample.sourceValidation.confirmedAt);
}

function startApprovedLocalRefresh(){
 const {config,root}=localConfig();Object.assign(process.env,config);
 const {createDatabasePool}=require('../src/lib/database');
 const db=createDatabasePool();let stopped=false,timer,lock,lockLost=false,running=false;
 db.on('error',()=>{}); // No upstream error objects or credentials in logs.
 const statusFile=path.join(root,'.work/localhost-e2e/approved-refresh-status.json');
 const status=value=>{const temporary=statusFile+'.'+process.pid+'.tmp';fs.writeFileSync(temporary,JSON.stringify({...value,at:new Date().toISOString()},null,2));fs.renameSync(temporary,statusFile);};
 const intervalSeconds=Number(process.env.LOCAL_SHEET_SYNC_INTERVAL_SECONDS||900);
 if(!Number.isInteger(intervalSeconds)||intervalSeconds<600||intervalSeconds>86400)throw new Error('Local sync interval must be 600–86400 seconds');
 let due=0;
 async function cycle(){
  if(stopped||running)return;running=true;
  try{
   const {initializeAutomaticSync}=require('../src/services/automaticSheetSync');
   if(!lock)await initializeAutomaticSync(db);
   if(lockLost&&lock){lock.release(true);lock=null;lockLost=false;}
   if(!lock){lock=await db.connect();lock.on('error',()=>{lockLost=true;});const result=await lock.query('select pg_try_advisory_lock(91035,66) as locked');if(!result.rows[0].locked){lock.release();lock=null;return;}}
   // Check the held session before each refresh. No overlapping cycles or duplicate workers.
   await lock.query('select 1');
   const signal=(await db.query('select * from sheet_sync.automation_status where source_id=$1',[DUPLICATE_SPREADSHEET_ID])).rows[0];
   const requested=signal.refresh_requested_at&&(!signal.completed_request_at||signal.refresh_requested_at>signal.completed_request_at);
   if(Date.now()<due&&!(requested&&signal.consecutive_failures===0))return;
   const started=new Date();
   await db.query(`update sheet_sync.automation_status set state='running',last_attempt_at=$2 where source_id=$1`,[DUPLICATE_SPREADSHEET_ID,started]);
   const result=await refreshOnce(db,{assertLease:async()=>{if(lockLost||!lock)throw new Error('Worker lease lost');await lock.query('select 1');}}),state=result.held.length?'review_pending':'healthy';
   await db.query(`update sheet_sync.automation_status set state=$2,last_success_at=now(),completed_request_at=$3,consecutive_failures=0,candidate_count=$4,record_count=$5,details=$6 where source_id=$1`,[DUPLICATE_SPREADSHEET_ID,state,started,result.sourceCandidates,result.total,JSON.stringify(result)]);
   status({state,intervalSeconds,durationMs:Date.now()-started.getTime(),...result});due=started.getTime()+intervalSeconds*1000;
  }catch(error){
   const known=['Changing or incomplete source; retry next cycle','Source changed during candidate reads; last committed data retained','Conflicting date evidence requires review','Older source cannot replace newer generation','Worker lease lost'];
   const reason=known.includes(error?.message)?error.message:(/^[A-Z0-9]{5}$/.test(error?.code||'')?'database_'+error.code:'source_read_or_reconciliation_failed');
   const result=await db.query(`update sheet_sync.automation_status set state='retry_pending',consecutive_failures=consecutive_failures+1,details=jsonb_build_object('reason',$2::text) where source_id=$1 returning consecutive_failures`,[DUPLICATE_SPREADSHEET_ID,reason]).catch(()=>({rows:[]}));
   const failures=result.rows[0]?.consecutive_failures||1;due=Date.now()+Math.min(intervalSeconds*1000,30000*2**Math.min(failures-1,6));
   await db.query(`insert into sheet_sync.sync_events(source_id,event_type,details) values($1,'sync_failed',$2)`,[DUPLICATE_SPREADSHEET_ID,JSON.stringify({reason,retryAt:new Date(due).toISOString()})]).catch(()=>{});
   status({state:'retry_pending',nextRetryAt:new Date(due).toISOString(),message:'Last committed data retained. Check protected sync health.'});
  }
  finally{running=false;if(!stopped)timer=setTimeout(cycle,15000);}
 }
 void cycle();
 return async()=>{stopped=true;clearTimeout(timer);if(lock){await lock.query('select pg_advisory_unlock(91035,66)').catch(()=>{});lock.release();}await db.end();};
}
module.exports={refreshApproval,refreshOnce,startApprovedLocalRefresh};
if(require.main===module){const {config}=localConfig();Object.assign(process.env,config);require('ts-node/register');startApprovedLocalRefresh();}

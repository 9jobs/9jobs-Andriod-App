// Local management add-on: read ONLY the Duplicate Sheet; mirror linked stable IDs.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {Pool}=require('pg'),dotenv=require('dotenv');
const root=path.resolve(__dirname,'../..');
const {base,backup}=require('./super-admin-backup.cjs');
const {createReadOnlyClient,DUPLICATE_SPREADSHEET_ID}=require('./inspect-duplicate-sheet.cjs');
const {readConsistentSource,readSample,digestSource,acceptsIndependentValidation}=require('./sheet-source-consistency.cjs');
function selectLinkedCandidates(candidates,links){
 const known=new Map();for(const link of links){assert.equal(link.source_spreadsheet_id,DUPLICATE_SPREADSHEET_ID);assert.ok(link.client_id);assert.match(String(link.source_sheet_id),/^\d+$/);assert.ok(!known.has(String(link.source_sheet_id)),'Conflicting source IDs');known.set(String(link.source_sheet_id),link);}
 return candidates.filter(candidate=>known.has(String(candidate.sheetId)));
}
async function cycle(db){
 const {discoverCandidates,validateCandidateView,publishAutomaticCandidates}=require('../src/services/automaticSheetSync');
 const links=(await db.query(`select c.client_id,c.source_spreadsheet_id,c.source_sheet_id from admin_management.managed_clients m
 join admin_management.client_identity_links l on l.client_id=m.id
 join sheet_sync.clients c on c.client_id=l.permanent_client_id
 join sheet_sync.client_accounts a on a.client_id=c.client_id and a.user_id=l.clerk_user_id and a.revoked_at is null
 where m.status='active' order by c.client_id`)).rows;
 if(!links.length)return {state:'no_linked_clients',total:0};
 const cfg=dotenv.parse(fs.readFileSync(path.join(root,'backend/.env.sheets.local')));
 assert.equal(cfg.GOOGLE_DUPLICATE_SPREADSHEET_ID,DUPLICATE_SPREADSHEET_ID);
 const credentials=JSON.parse(fs.readFileSync(cfg.GOOGLE_SHEETS_SERVICE_ACCOUNT_FILE,'utf8'));
 let queued=Promise.resolve(),last=0;
 const pacedFetch=(url,options)=>{const next=queued.then(async()=>{const delay=1200-(Date.now()-last);if(delay>0)await new Promise(r=>setTimeout(r,delay));last=Date.now();return fetch(url,options);});queued=next.catch(()=>{});return next;};
 const client=await createReadOnlyClient({spreadsheetId:DUPLICATE_SPREADSHEET_ID,credentials,candidateSheetIds:links.map(l=>String(l.source_sheet_id))},{fetch:pacedFetch});
 const metadata=await client.metadata();const sample=await readConsistentSource(client,{independentCandidates:true});
 assert.ok(acceptsIndependentValidation(sample),'Changing source; previous snapshot retained');
 const indexLinks=await client.candidateIndexLinks();
 const discovered=discoverCandidates(metadata,sample,indexLinks);
 const candidates=selectLinkedCandidates(discovered.candidates,links),plans=[],held=[];
 for(const link of links)if(!candidates.some(c=>String(c.sheetId)===String(link.source_sheet_id)))held.push({sourceSheetId:String(link.source_sheet_id),reason:'linked_source_requires_review'});
 for(let offset=0;offset<candidates.length;offset+=10){const batch=candidates.slice(offset,offset+10),view=await client.candidateViews(batch.map(c=>c.sheetId));for(const candidate of batch){try{plans.push({...candidate,rows:validateCandidateView(candidate,view)});}catch{held.push({sourceSheetId:candidate.sheetId,reason:'candidate_view_requires_review'});}}}
 const final=await readSample(client),finalLinks=await client.candidateIndexLinks(),finalMetadata=await client.metadata();
 const stableMetadata=value=>JSON.stringify(value.sheets.map(s=>[String(s.properties.sheetId),s.properties.title]).sort());
 assert.equal(digestSource(final.allJobs,final.candidateIndex),sample.sourceValidation.digest,'Source changed during reads');
 assert.deepEqual(finalLinks,indexLinks,'Candidate source links changed');assert.equal(stableMetadata(finalMetadata),stableMetadata(metadata));
 // Recheck existing IDs immediately before publication. Never invent source/client mappings.
 const current=(await db.query('select client_id,source_sheet_id from sheet_sync.clients where client_id=any($1::text[])',[links.map(l=>l.client_id)])).rows;
 for(const link of links)assert.ok(current.some(c=>c.client_id===link.client_id&&c.source_sheet_id===link.source_sheet_id));
 const result=await publishAutomaticCandidates(plans,sample.sourceValidation.digest,held,db,sample.sourceValidation.confirmedAt);
 return {...result,state:result.held.length?'review_pending':'healthy',linkedClients:links.length};
}
async function main(){
 const state=JSON.parse(fs.readFileSync(path.join(root,'.work/super-admin-local/runtime.json')));
 assert.match(state.database,/^9jobs_local_e2e_sa_[a-f0-9]{12}$/);
 const url=`postgresql://client_id_test@127.0.0.1:55439/${state.database}`;
 // Never inherit a cloud database or runtime selection from the original app.
 Object.assign(process.env,{DATABASE_URL:url,LOCAL_DATABASE_MODE:'isolated-e2e',DATABASE_PERSISTENCE:'postgres-only',SUPER_ADMIN_ENABLED:'true'});
 require('ts-node/register');
 const db=new Pool({...base,database:state.database,max:3});
 const actual=(await db.query('select current_database() name,host(inet_server_addr()) host,inet_server_port() port')).rows[0];assert.deepEqual(actual,{name:state.database,host:'127.0.0.1',port:55439});
 const snapshot=await backup(state.database);assert.ok(snapshot.verified);console.log('Management sync: recoverable local backup verified.');
 await require('../src/services/automaticSheetSync').initializeAutomaticSync(db);
 const lease=await db.connect();const locked=(await lease.query('select pg_try_advisory_lock(91035,67) locked')).rows[0].locked;
 if(!locked){lease.release();await db.end();console.log('Management sync worker already running.');return;}
 let stopping=false,timer;
 const statusFile=path.join(root,'.work/super-admin-local/sheet-sync-status.json');
 const status=value=>{const record={...value,database:state.database,at:new Date().toISOString(),readOnlyGoogle:true};fs.writeFileSync(statusFile,JSON.stringify(record,null,2));console.log(JSON.stringify(record));};
 const stop=async()=>{stopping=true;clearTimeout(timer);await lease.query('select pg_advisory_unlock(91035,67)').catch(()=>{});lease.release();await db.end();};
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>void stop());
 const prior=(await db.query('select last_success_at from sheet_sync.automation_status where source_id=$1',[DUPLICATE_SPREADSHEET_ID])).rows[0];
 let due=process.argv.includes('--watch')&&prior?.last_success_at?new Date(prior.last_success_at).getTime()+900000:0;
 async function tick(){
  try{
   const signal=(await db.query('select refresh_requested_at,completed_request_at from sheet_sync.automation_status where source_id=$1',[DUPLICATE_SPREADSHEET_ID])).rows[0];
   const requested=signal?.refresh_requested_at&&(!signal.completed_request_at||signal.refresh_requested_at>signal.completed_request_at);
   if(Date.now()<due&&!requested)return;
   const started=new Date();await db.query("update sheet_sync.automation_status set state='running',last_attempt_at=$2 where source_id=$1",[DUPLICATE_SPREADSHEET_ID,started]);
   const result=await cycle(db);
   await db.query("update sheet_sync.automation_status set state=$2,last_success_at=now(),completed_request_at=$3,consecutive_failures=0,record_count=$4,details=$5 where source_id=$1",[DUPLICATE_SPREADSHEET_ID,result.state,started,result.total,JSON.stringify(result)]);
   due=Date.now()+900000;status(result);
  }catch(error){due=Date.now()+60000;await db.query("update sheet_sync.automation_status set state='retry_pending',completed_request_at=refresh_requested_at,consecutive_failures=consecutive_failures+1,details=$2 where source_id=$1",[DUPLICATE_SPREADSHEET_ID,JSON.stringify({reason:'source_read_or_reconciliation_failed'})]).catch(()=>{});status({state:'retry_pending',reason:'source_read_or_reconciliation_failed',previousSnapshotPreserved:true});if(!process.argv.includes('--watch'))process.exitCode=1;}
  finally{if(process.argv.includes('--watch')&&!stopping)timer=setTimeout(tick,15000);else await stop();}
 }
 await tick();
}
module.exports={selectLinkedCandidates};
if(require.main===module)main().catch(()=>{console.error('Management sheet sync stopped safely; no cloud/Sheet writes or production fallback.');process.exitCode=1;});

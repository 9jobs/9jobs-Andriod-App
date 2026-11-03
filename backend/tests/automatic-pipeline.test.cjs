const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {Pool,Client}=require('pg');const {sourceFixture}=require('./helpers/automatic-source-fixture.cjs');
process.env.LOCAL_DATABASE_MODE='isolated-e2e';require('ts-node/register');
const {initializeAutomaticSync,discoverCandidates,validateCandidateView,publishAutomaticCandidates}=require('../src/services/automaticSheetSync');
const {SHEET_ID,readSheetJobs}=require('../src/services/sheetStore');
const {persistVerifiedAccount}=require('../src/services/verifiedAccount');
const {reviewClientEmails,approveClientEmails}=require('../src/services/clientEmailAssociations');
const {requestLocalSheetRefresh}=require('../src/services/localSyncFreshness');

test('read-only source identity uses exact linked tab IDs and independent view reconciliation, never duplicate labels',()=>{
 const f=sourceFixture(),d=discoverCandidates(f.metadata,f.sample,f.links);assert.equal(d.candidates.length,2);
 for(const c of d.candidates)assert.equal(validateCandidateView(c,f.views).length,c.count);
 const relative=sourceFixture();relative.links.sheets[0].data[0].rowData[1].values[0].hyperlink='#gid=123';
 assert.equal(discoverCandidates(relative.metadata,relative.sample,relative.links).candidates.length,2);
 const historic=sourceFixture();historic.sample.allJobs.values[1][1]='28/01/2025';historic.sample.allJobs.values[2][1]='28/01/2025';
 historic.sample.sourceValidation.digest=require('../scripts/sheet-source-consistency.cjs').digestSource(historic.sample.allJobs,historic.sample.candidateIndex);
 historic.views.sheets[0].data[0].rowData[1].values[0].formattedValue='28/01/2025';
 assert.equal(validateCandidateView(discoverCandidates(historic.metadata,historic.sample,historic.links).candidates[0],historic.views).length,2);
 const legacy=sourceFixture();legacy.sample.allJobs.values[1][6]='link';legacy.views.sheets[0].data[0].rowData[2].values[3].hyperlink=undefined;
 legacy.sample.sourceValidation.digest=require('../scripts/sheet-source-consistency.cjs').digestSource(legacy.sample.allJobs,legacy.sample.candidateIndex);
 assert.equal(validateCandidateView(discoverCandidates(legacy.metadata,legacy.sample,legacy.links).candidates[0],legacy.views)[0].fields[6],'link');
 const wrongLink=sourceFixture();wrongLink.views.sheets[0].data[0].rowData[2].values[3].hyperlink='https://example.invalid/wrong';
 assert.throws(()=>validateCandidateView(discoverCandidates(wrongLink.metadata,wrongLink.sample,wrongLink.links).candidates[0],wrongLink.views),/differ/);
 f.links.sheets[0].data[0].rowData[1].values[0].hyperlink=`https://docs.google.com/spreadsheets/d/other/edit#gid=123`;
 const held=discoverCandidates(f.metadata,f.sample,f.links);assert.equal(held.candidates.length,1);assert.ok(held.reviews.some(r=>r.reason==='candidate_identity_requires_review'));
 const same=sourceFixture([{gid:'123',name:'Alex',count:1},{gid:'456',name:'Alex',count:1}]);
 assert.throws(()=>discoverCandidates(same.metadata,same.sample,same.links),/consistent/);
 const mixed=sourceFixture([{gid:'123',name:'Alex',count:1},{gid:'456',name:'Alex',count:1},{gid:'789',name:'Unambiguous',count:1}]);
 mixed.sample.sourceValidation.policy=require('../scripts/sheet-source-consistency.cjs').INDEPENDENT_POLICY;
 const independent=discoverCandidates(mixed.metadata,mixed.sample,mixed.links);
 assert.equal(independent.candidates.length,1);assert.equal(independent.candidates[0].sheetId,'789');assert.ok(independent.reviews.length>=2);
 const ambiguous=sourceFixture();ambiguous.sample.allJobs.values[1][1]='08/05/2026';ambiguous.sample.allJobs.values[2][1]='08/05/2026';
 ambiguous.sample.sourceValidation.digest=require('../scripts/sheet-source-consistency.cjs').digestSource(ambiguous.sample.allJobs,ambiguous.sample.candidateIndex);
 ambiguous.views.sheets[0].data[0].rowData[1].values[0].formattedValue='5-Aug-2026';
 const resolved=validateCandidateView(discoverCandidates(ambiguous.metadata,ambiguous.sample,ambiguous.links).candidates[0],ambiguous.views);
 assert.equal(resolved[0].resolved_date,'2026-08-05');assert.equal(resolved[0].fields[1],'08/05/2026');
 const broken=sourceFixture(),candidate=discoverCandidates(broken.metadata,broken.sample,broken.links).candidates[0];
 broken.views.sheets[0].data[0].rowData[0].values[9].formattedValue='helper';assert.throws(()=>validateCandidateView(candidate,broken.views),/marker/);
});

test('500-client SQL generation and cached repeat create one ID per source, one active row per job and no extra snapshot',async()=>{
 const database='9jobs_local_e2e_scale_'+crypto.randomBytes(6).toString('hex');
 const config={host:'127.0.0.1',port:55439,user:'client_id_test',database:'postgres',ssl:false};
 const root=new Client(config);await root.connect();await root.query('create database "'+database+'"');await root.end();
 process.env.DATABASE_URL='postgresql://client_id_test@127.0.0.1:55439/'+database;
 const db=new Pool({...config,database});try{
  await initializeAutomaticSync(db);
  const f=sourceFixture(Array.from({length:500},(_,i)=>({gid:String(1000+i),name:'Source tab '+i,count:1})));
  const d=discoverCandidates(f.metadata,f.sample,f.links),plans=d.candidates.map(c=>({...c,rows:validateCandidateView(c,f.views)}));
  const first=await publishAutomaticCandidates(plans,f.sample.sourceValidation.digest,[],db);
  const before=(await db.query('select client_id,source_sheet_id from sheet_sync.clients order by source_sheet_id')).rows;
  const second=await publishAutomaticCandidates(plans.map(({rows,...p})=>p),f.sample.sourceValidation.digest,[],db);
  assert.equal(second.unchanged,500);assert.equal(second.changed,0);assert.equal(second.snapshot,first.snapshot);
  assert.equal(before.length,500);assert.equal(new Set(before.map(c=>c.client_id)).size,500);
  assert.deepEqual((await db.query('select client_id,source_sheet_id from sheet_sync.clients order by source_sheet_id')).rows,before);
  assert.equal((await db.query('select count(*)::int as n from sheet_sync.snapshots')).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int as n from sheet_sync.records')).rows[0].n,500);
 }finally{await db.end();}
});

test('500 linked source identities are discovered without account lookups or name ownership matching',()=>{
 const f=sourceFixture(Array.from({length:500},(_,i)=>({gid:String(1000+i),name:'Source tab '+i,count:1})));
 const d=discoverCandidates(f.metadata,f.sample,f.links);assert.equal(d.candidates.length,500);assert.equal(d.reviews.length,0);
 assert.equal(new Set(d.candidates.map(c=>c.sheetId)).size,500);
 for(const c of d.candidates)assert.equal(validateCandidateView(c,f.views).length,1);
});

test('isolated SQL pipeline: new IDs, growth, duplicate display names, approvals, repeat verified login, restart, rollback and freshness',async()=>{
 const database='9jobs_local_e2e_auto_'+crypto.randomBytes(6).toString('hex');
 const config={host:'127.0.0.1',port:55439,user:'client_id_test',database:'postgres',ssl:false};
 const root=new Client(config);await root.connect();await root.query('create database "'+database+'"');await root.end();
 process.env.DATABASE_URL='postgresql://client_id_test@127.0.0.1:55439/'+database;
 const db=new Pool({...config,database});
 const publish=async(f,connection=db)=>{const d=discoverCandidates(f.metadata,f.sample,f.links);return publishAutomaticCandidates(d.candidates.map(c=>({...c,rows:validateCandidateView(c,f.views)})),f.sample.sourceValidation.digest,d.reviews,connection);};
 try{
  await initializeAutomaticSync(db);
  await db.query(`create table public.profiles(id text primary key,full_name text not null,email text unique not null,role text not null default 'client',account_status text default 'active')`);
  const f=sourceFixture(),first=await publish(f),clients=(await db.query('select * from sheet_sync.clients order by source_sheet_id')).rows;
  assert.equal(clients.length,2);assert.notEqual(clients[0].client_id,clients[1].client_id);assert.equal(first.total,3);
  assert.equal((await publish(f)).snapshot,first.snapshot);assert.equal((await db.query('select count(*)::int as n from sheet_sync.records')).rows[0].n,3);
  const rows=[{email:'a@example.invalid',clientId:clients[0].client_id},{email:'b@example.invalid',clientId:clients[1].client_id}];
  const plan=await reviewClientEmails(rows,db);assert.equal(plan.conflicts.length,0);
  const sourcePlan=await reviewClientEmails([{email:'a@example.invalid',sourceSpreadsheetId:SHEET_ID,sourceSheetId:'123'}],db);assert.equal(sourcePlan.rows[0].clientId,clients[0].client_id);
  await assert.rejects(approveClientEmails(rows,'verified-admin','wrong',db),/Review/);
  await approveClientEmails(rows,'verified-admin',plan.digest,db);await approveClientEmails(rows,'verified-admin',plan.digest,db);
  // Trusted-account service inputs are isolated fixtures, not claims of real Clerk sessions.
  const a={userId:'fixture-a',email:'a@example.invalid',fullName:'Alex'},b={userId:'fixture-b',email:'b@example.invalid',fullName:'Alex'};
  await persistVerifiedAccount(a,db);await persistVerifiedAccount(b,db);await persistVerifiedAccount(a,db);
  assert.equal((await db.query('select count(*)::int as n from sheet_sync.client_accounts')).rows[0].n,2);
  const ownA=await readSheetJobs({userId:a.userId,limit:1000,offset:0},db),ownB=await readSheetJobs({userId:b.userId,limit:1000,offset:0},db);
  assert.equal(ownA.total,2);assert.equal(ownB.total,1);assert.ok(ownA.jobs.every(j=>j.source_fields.Candidate==='Alex [A]'));
  assert.equal((await readSheetJobs({userId:a.userId,query:'Alex [B]',limit:1000,offset:0},db)).total,0);
  await persistVerifiedAccount({userId:'unknown',email:'unknown@example.invalid',fullName:'Alex'},db);
  assert.equal((await readSheetJobs({userId:'unknown',limit:1000,offset:0},db)).total,0);
  const conflict=await reviewClientEmails([{email:'a@example.invalid',clientId:clients[1].client_id}],db);assert.equal(conflict.conflicts.length,1);
  const old=(await db.query('select source_sheet_id,client_id from sheet_sync.clients order by source_sheet_id')).rows;
  const grown=sourceFixture([{gid:'123',name:'Alex renamed',count:3},{gid:'456',name:'Alex [B]',count:1},{gid:'789',name:'New zero-job client',count:0}]);
  const updated=await publish(grown);assert.equal(updated.total,4);
  assert.deepEqual((await db.query('select source_sheet_id,client_id from sheet_sync.clients where source_sheet_id<>\'789\' order by source_sheet_id')).rows,old);
  assert.equal((await db.query('select count(*)::int as n from sheet_sync.clients')).rows[0].n,3);
  assert.equal((await readSheetJobs({userId:b.userId,limit:1000,offset:0},db)).total,1);
  const reduced=await publish(sourceFixture());assert.ok(reduced.held.some(h=>h.reason==='count_reduction_held'));assert.equal(reduced.total,4);
  assert.equal((await readSheetJobs({userId:a.userId,limit:1000,offset:0},db)).total,3);
  const head=JSON.stringify((await db.query('select * from sheet_sync.head order by source_id')).rows);
  const failing={connect:async()=>{const c=await db.connect();return {release:()=>c.release(),query:async(q,p)=>{if(q==='commit')throw new Error('Injected crash');return c.query(q,p);}};}};
  await assert.rejects(publish(sourceFixture([{gid:'123',name:'Alex renamed',count:4},{gid:'456',name:'Alex [B]',count:1}]),failing),/Injected/);
  assert.equal(JSON.stringify((await db.query('select * from sheet_sync.head order by source_id')).rows),head);
  await initializeAutomaticSync(db);await persistVerifiedAccount(a,db);assert.equal((await readSheetJobs({userId:a.userId,limit:1000,offset:0},db)).total,3);
  await db.query("update sheet_sync.client_accounts set revoked_at=now() where user_id='fixture-a'");await persistVerifiedAccount(a,db);assert.equal((await readSheetJobs({userId:a.userId,limit:1000,offset:0},db)).total,0);
  process.env.LOCAL_AUTOMATIC_SHEET_SYNC='true';await requestLocalSheetRefresh(db);
  let state=(await db.query('select * from sheet_sync.automation_status where source_id=$1',[SHEET_ID])).rows[0];assert.ok(state.refresh_requested_at);
  await db.query('update sheet_sync.automation_status set last_success_at=now(),completed_request_at=now() where source_id=$1',[SHEET_ID]);await requestLocalSheetRefresh(db);
  assert.equal(String((await db.query('select refresh_requested_at from sheet_sync.automation_status where source_id=$1',[SHEET_ID])).rows[0].refresh_requested_at),String(state.refresh_requested_at));
 }finally{delete process.env.LOCAL_AUTOMATIC_SHEET_SYNC;await db.end();}
});

// New disposable localhost database; never uses private config, Google or Clerk credentials.
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {Client,Pool}=require('pg');
const {EXPECTED_HEADERS,DUPLICATE_SPREADSHEET_ID:sourceId}=require('../scripts/inspect-duplicate-sheet.cjs');
const {digestSource,POLICY,QUIET_MS}=require('../scripts/sheet-source-consistency.cjs');
const {refreshApproval}=require('../scripts/refresh-approved-local-clients.cjs');
function source(count=1,name='Fixture Candidate'){
 const rows=Array.from({length:count},(_,i)=>[name,'1-Sep-2026',String(i+1),'Role '+i,'Company','','https://example.invalid/'+i,'Applied','Contact '+i,'Sent','Sent',String(10+i)]);
 const allJobs={values:[EXPECTED_HEADERS,...rows]},candidateIndex={values:[['Candidate (click name)','Total Jobs'],[name,String(count)]]},now=Date.now();
 return {spreadsheetId:sourceId,fetchedAt:new Date().toISOString(),metadata:{sheets:[{properties:{sheetId:123,title:name}}]},
  sample:{allJobs,candidateIndex,sourceValidation:{consistent:true,policy:POLICY,quietMs:QUIET_MS,observedAt:now-QUIET_MS,confirmedAt:now,digest:digestSource(allJobs,candidateIndex)}},
  views:[{sheets:[{properties:{sheetId:123,title:name},data:[{rowData:[{values:[{formattedValue:'1-Sep-2026'}]},...rows.map(r=>({values:[{formattedValue:r[2]},{formattedValue:r[3]},{formattedValue:r[4]},{formattedValue:'Link',hyperlink:r[6]},...r.slice(7,11).map(v=>({formattedValue:v}))]}))]}]}]}]};
}
test('real isolated database: growth, retry, rename, stable ID, retained history and other owners, revoked fail-closed',async()=>{
 const database='9jobs_local_e2e_refresh_'+crypto.randomBytes(6).toString('hex');
 const config={host:'127.0.0.1',port:55439,user:'client_id_test',database:'postgres',ssl:false,connectionTimeoutMillis:5000};
 const root=new Client(config);await root.connect();await root.query('create database "'+database+'"');await root.end();
 process.env.LOCAL_DATABASE_MODE='isolated-e2e';process.env.DATABASE_URL='postgresql://client_id_test@127.0.0.1:55439/'+database;
 require('ts-node/register');
 const {clientRegistrySchema,readSheetJobs}=require('../src/services/sheetStore');
 const {importLocalCandidate}=require('../src/services/localCandidateImport');
 const {readSheetActivity}=require('../src/services/sheetApplications');
 const db=new Pool({...config,database});
 try{
  await db.query(clientRegistrySchema);
  await db.query(`insert into sheet_sync.verified_accounts(user_id,email,full_name,verified_at) values('fixture-subject','fixture@example.invalid','Fixture',now());
   insert into sheet_sync.account_directory(user_id,email,full_name,email_verified,registration_status,registered_at) values('fixture-subject','fixture@example.invalid','Fixture',true,'verified',now());`);
  const approval={approved:true,approvedBy:'isolated-test-operator',userId:'fixture-subject',email:'fixture@example.invalid',candidate:'Fixture Candidate',sourceSpreadsheetId:sourceId,sourceSheetId:'123',clientId:'9JOBS-CL-00000000-0000-4000-8000-000000000001',sourceRecords:1};
  const first=await importLocalCandidate(source(),approval,db);
  await db.query(`insert into sheet_sync.client_accounts(user_id,client_id,approved_by) values($1,$2,'isolated-test-operator')`,[approval.userId,approval.clientId]);
  // Another candidate's active record and relationship must survive refreshes.
  await db.query(`insert into sheet_sync.records(id,candidate_label,fields) values('unrelated','Other','["untouched"]')`);
  const otherId='9JOBS-CL-00000000-0000-4000-8000-000000000002';
  await db.query(`insert into sheet_sync.clients(client_id,source_spreadsheet_id,source_sheet_id,candidate_name,created_at,last_seen_at) values($1,$2,'456','Other',now(),now())`,[otherId,sourceId]);
  await db.query(`insert into sheet_sync.snapshot_records(snapshot_id,record_id,source_row,ordinal) values($1,'unrelated','99',1)`,[first.snapshot]);
  await db.query(`insert into sheet_sync.client_record_owners(snapshot_id,record_id,client_id) values($1,'unrelated',$2)`,[first.snapshot,otherId]);
  await db.query(`update sheet_sync.snapshots set record_count=2,candidate_count=2 where id=$1`,[first.snapshot]);
  const mapping={approved_by:approval.approvedBy,email_verified:true,registration_status:'verified',source_spreadsheet_id:sourceId,source_sheet_id:'123',current_count:1,client_id:approval.clientId,user_id:approval.userId,email:approval.email};
  let next=source(2);const grown=await importLocalCandidate(next,refreshApproval(next,mapping),db);
  assert.equal(grown.records,2);assert.equal(grown.clientId,first.clientId);
  const repeat=await importLocalCandidate(next,refreshApproval(next,mapping),db);assert.equal(repeat.unchanged,true);assert.equal(repeat.snapshot,grown.snapshot);
  mapping.current_count=2;next=source(2,'Renamed Fixture');
  const renamed=await importLocalCandidate(next,refreshApproval(next,mapping),db);assert.equal(renamed.clientId,first.clientId);
  assert.equal((await db.query('select count(*)::int as n from sheet_sync.clients')).rows[0].n,2);
  assert.equal((await db.query('select count(*)::int as n from sheet_sync.snapshot_records where snapshot_id=$1',[first.snapshot])).rows[0].n,2);
  assert.deepEqual((await db.query("select fields from sheet_sync.records where id='unrelated'")).rows[0].fields,['untouched']);
  assert.equal((await db.query(`select o.client_id from sheet_sync.head h join sheet_sync.client_record_owners o on o.snapshot_id=h.snapshot_id where h.source_id=$1 and o.record_id='unrelated'`,[sourceId])).rows[0].client_id,otherId);
  assert.equal((await readSheetJobs({userId:approval.userId,limit:1000,offset:0},db)).total,2);
  assert.equal((await readSheetJobs({userId:'unlinked',limit:1000,offset:0},db)).total,0);
  assert.deepEqual((await readSheetActivity(approval.userId,db)).sourceActivity,{records:2,emailsSent:2,contactsAdded:2,messagesSent:2,messagesShared:0});
  const heads=async()=>JSON.stringify((await db.query('select * from sheet_sync.head order by source_id')).rows);
  let before=await heads();assert.throws(()=>refreshApproval(source(1,'Renamed Fixture'),mapping),/reduction/);assert.equal(await heads(),before);
  // Inject a transaction failure after head updates; rollback must retain the last good data.
  const failing={connect:async()=>{const c=await db.connect();return {release:()=>c.release(),query:async(q,p)=>{if(q==='commit')throw new Error('Injected failure');return c.query(q,p);}};}};
  next=source(3,'Renamed Fixture');await assert.rejects(importLocalCandidate(next,refreshApproval(next,mapping),failing),/Injected failure/);assert.equal(await heads(),before);
  await db.query("update sheet_sync.client_accounts set revoked_at=now() where user_id=$1",[approval.userId]);
  await assert.rejects(importLocalCandidate(next,refreshApproval(next,mapping),db),/Active approved/);assert.equal(await heads(),before);
 }finally{await db.end();}
});

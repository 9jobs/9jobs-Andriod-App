const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const jwt=require('jsonwebtoken');
const dotenv=require('dotenv');

test('legacy name-based cloud pipeline (superseded by client-registry-local.test.cjs)',{skip:process.env.LEGACY_SHEET_PIPELINE_TEST_ENABLED!=='true'},async()=>{
 const configuration=dotenv.parse(await fs.readFile(path.resolve(__dirname,'../.env.sheets-test.local')));
 assert.equal(new URL(configuration.DATABASE_URL).hostname,'ep-raspy-dream-a7pxtepd-pooler.ap-southeast-2.aws.neon.tech');
 Object.assign(process.env,configuration);
 process.env.CLERK_ISSUER='https://sheet-test.example.invalid';
 process.env.CLERK_AUTHORIZED_PARTIES='http://localhost:3001';
 require('ts-node/register');
 const {createDatabasePool}=require('../src/lib/database');
 const {sheetSchema,importSheetExport,readSheetJobs,SHEET_ID}=require('../src/services/sheetStore');
 const {EXPECTED_HEADERS}=require('../scripts/inspect-duplicate-sheet.cjs');
 const {createSheetRouter}=require('../src/routes/sheetSync');
 const {approveSheetEmail,resolveSheetEmail}=require('../src/services/sheetEmailMapping');
 const previousClerkSecret=process.env.CLERK_SECRET_KEY;
 delete process.env.CLERK_SECRET_KEY;
 const pool=createDatabasePool();
 const schema='sheet_validation_'+crypto.randomBytes(6).toString('hex');
 const rewrite=sql=>sql.replace(/\bsheet_sync\b/g,schema);
 const isolated={query:(sql,args)=>pool.query(rewrite(sql),args),connect:async()=>{
  const client=await pool.connect();return{query:(sql,args)=>client.query(rewrite(sql),args),release:()=>client.release()};
 }};
 const file=path.resolve(__dirname,'../../.work/duplicate-sheet-data/test-fixture-'+schema+'.json');
 const source={spreadsheetId:SHEET_ID,allJobs:{values:[EXPECTED_HEADERS,
  ['Fixture A','28/01/2025','1','Analyst','Company A','','https://example.invalid/a','','','','','6'],
  ['Fixture B','29/01/2025','1','Engineer','Company B','','https://example.invalid/b','','','','','7'],
 ]},candidateIndex:{values:[['Candidate (click name)','Total Jobs'],['Fixture A','1'],['Fixture B','1']]}};
 const {privateKey,publicKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
 const jwk=publicKey.export({format:'jwk'});jwk.kid='sheet-unit';jwk.alg='RS256';
 const originalFetch=global.fetch;
 global.fetch=async(url,options)=>String(url)==='https://sheet-test.example.invalid/.well-known/jwks.json'?Response.json({keys:[jwk]}):originalFetch(url,options);
 const token=userId=>jwt.sign({sid:'test-session',azp:'http://localhost:3001'},privateKey,{algorithm:'RS256',keyid:'sheet-unit',issuer:process.env.CLERK_ISSUER,subject:userId,expiresIn:300});
 let server;
 try{
  await isolated.query(sheetSchema);
  await fs.writeFile(file,JSON.stringify(source));
  const first=await importSheetExport(file,isolated,true);
  const again=await importSheetExport(file,isolated,true);
  assert.equal(again.unchanged,true);assert.equal(first.snapshotId,again.snapshotId);
  assert.equal((await isolated.query('select count(*)::int as n from sheet_sync.records')).rows[0].n,2);
  source.allJobs.values=[EXPECTED_HEADERS,...source.allJobs.values.slice(1).reverse()];
  await fs.writeFile(file,JSON.stringify(source));
  assert.equal((await importSheetExport(file,isolated,true)).snapshotId,first.snapshotId);
  const approval=await approveSheetEmail('fixture-a@example.invalid','Fixture A','isolated-test',isolated);
  assert.equal(approval.approval.resolved_user_id,null);
  let lookedUp=false;
  assert.equal(await resolveSheetEmail('fixture-a',isolated,async()=>{lookedUp=true;throw new Error('Must not fetch without a server credential')}),false);
  assert.equal(lookedUp,false);
  process.env.CLERK_SECRET_KEY='synthetic-key-for-injected-test-transport';
  const identity=(id,verified)=>Response.json({id,primary_email_address_id:'email-one',email_addresses:[{id:'email-one',email_address:'fixture-a@example.invalid',verification:{status:verified?'verified':'unverified'}}]});
  assert.equal(await resolveSheetEmail('fixture-a',isolated,async()=>identity('fixture-a',false)),false);
  assert.equal((await readSheetJobs({userId:'fixture-a'},isolated)).total,0);
  assert.equal(await resolveSheetEmail('fixture-a',isolated,async()=>identity('different-subject',true)),false);
  assert.equal(await resolveSheetEmail('fixture-a',isolated,async()=>identity('fixture-a',true)),true);
  assert.equal(await resolveSheetEmail('fixture-other',isolated,async()=>identity('fixture-other',true)),false);
  assert.equal((await readSheetJobs({userId:'fixture-other'},isolated)).total,0);
  delete process.env.CLERK_SECRET_KEY;
  await isolated.query("insert into sheet_sync.candidate_mappings(user_id,candidate_label,approved_by) values('fixture-b','Fixture B','isolated-test')");
  const express=require('express');const app=express();app.use('/api',createSheetRouter(()=>isolated));
  server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}/api`;
  for(const [id,title]of [['fixture-a','Analyst'],['fixture-b','Engineer']]){
   const response=await originalFetch(`${base}/mobile/sheet-records?userId=fixture-b&candidate=Fixture%20B`,{headers:{Authorization:'Bearer '+token(id)}});
   assert.equal(response.status,200);const body=await response.json();assert.equal(body.total,1);assert.equal(body.jobs[0].title,title);
   assert.equal(body.jobs[0].match_score,null);assert.equal(body.jobs[0].status,undefined);
   assert.equal(Object.keys(body.jobs[0].source_fields).length,12);
  }
  const unmapped=await originalFetch(`${base}/mobile/sheet-records`,{headers:{Authorization:'Bearer '+token('unmapped')}});
  assert.equal((await unmapped.json()).total,0);
  for(const auth of [undefined,'Bearer '+jwt.sign({userId:'fixture-a',role:'client'},configuration.JWT_SECRET)]){
   const response=await originalFetch(`${base}/mobile/sheet-records`,{headers:auth?{Authorization:auth}:{}});assert.equal(response.status,401);
  }
  assert.equal((await originalFetch(`${base}/admin/sheet-sync/records`,{headers:{Authorization:'Bearer '+token('fixture-a')}})).status,403);
  assert.equal((await originalFetch(`${base}/mobile/sheet-records?limit=50000`,{headers:{Authorization:'Bearer '+token('fixture-a')}})).status,400);
  const wrongIssuer=jwt.sign({sid:'test-session'},privateKey,{algorithm:'RS256',keyid:'sheet-unit',issuer:'https://other.invalid',subject:'fixture-a',expiresIn:300});
  assert.equal((await originalFetch(`${base}/mobile/sheet-records`,{headers:{Authorization:'Bearer '+wrongIssuer}})).status,401);
  const wrongOrigin=jwt.sign({sid:'test-session',azp:'https://other.invalid'},privateKey,{algorithm:'RS256',keyid:'sheet-unit',issuer:process.env.CLERK_ISSUER,subject:'fixture-a',expiresIn:300});
  assert.equal((await originalFetch(`${base}/mobile/sheet-records`,{headers:{Authorization:'Bearer '+wrongOrigin}})).status,401);
  // Field update and new source row: new snapshot, immutable prior history, no status invention.
  source.allJobs.values[1][3]='Updated engineer';
  source.allJobs.values.push(['Fixture A','30/01/2025','2','New role','Company A','','https://example.invalid/new','','','','','8']);
  source.candidateIndex.values[1][1]='2';
  await fs.writeFile(file,JSON.stringify(source));
  const updated=await importSheetExport(file,isolated,true);assert.equal(updated.records,3);assert.notEqual(updated.snapshotId,first.snapshotId);
  assert.equal((await readSheetJobs({userId:'fixture-a'},isolated)).total,2);
  assert.equal((await readSheetJobs({userId:'fixture-b'},isolated)).jobs[0].title,'Updated engineer');
  assert.equal((await readSheetJobs({admin:true,query:'Company B'},isolated)).total,1);
  assert.equal((await readSheetJobs({userId:'fixture-a',snapshotId:first.snapshotId},isolated)).total,1);
  const before=(await isolated.query('select count(*)::int as n from sheet_sync.records')).rows[0].n;
  const validSource=JSON.stringify(source);
  source.allJobs.values=[EXPECTED_HEADERS];await fs.writeFile(file,JSON.stringify(source));
  await assert.rejects(importSheetExport(file,isolated,true),/empty/);
  assert.equal((await readSheetJobs({userId:'fixture-a'},isolated)).total,2);
  assert.equal((await isolated.query('select count(*)::int as n from sheet_sync.records')).rows[0].n,before);
  await fs.writeFile(file,validSource);
  const locker=await pool.connect();
  try {
   await locker.query('begin');await locker.query('select pg_advisory_xact_lock(91035,65)');
   await assert.rejects(importSheetExport(file,isolated,true),/Another sheet import/);
  } finally {await locker.query('rollback');locker.release();}
  // Mapping revocation is checked at read time, including a pinned old snapshot.
  await isolated.query("update sheet_sync.candidate_mappings set revoked_at=now() where user_id='fixture-a'");
  assert.equal((await readSheetJobs({userId:'fixture-a',snapshotId:first.snapshotId},isolated)).total,0);
  process.env.CLERK_SECRET_KEY='synthetic-key-for-injected-test-transport';
  assert.equal(await resolveSheetEmail('fixture-a',isolated,async()=>{throw new Error('Revoked mappings must not be automatically re-enabled')}),false);
  delete process.env.CLERK_SECRET_KEY;
  // No destructive cleanup: keep this separate, synthetic validation schema for inspection.
  console.log('PASS: actual PostgreSQL import/update/failure tests and HTTP two-principal isolation; synthetic fixtures stayed in a separate validation schema');
 }finally{
  global.fetch=originalFetch;
  if(previousClerkSecret===undefined)delete process.env.CLERK_SECRET_KEY;else process.env.CLERK_SECRET_KEY=previousClerkSecret;
  if(server)await new Promise(resolve=>{server.close(resolve);server.closeAllConnections()});
  await fs.rm(file,{force:true});await pool.end();
 }
});

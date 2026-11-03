// ONLY localhost PostgreSQL. Does not read dotenv credentials or connect to cloud.
const {test}=require('node:test');const assert=require('node:assert/strict');
const crypto=require('node:crypto');const fs=require('node:fs/promises');const path=require('node:path');
const {Pool,Client}=require('pg');const jwt=require('jsonwebtoken');
const {fixture}=require('./helpers/apps-script-fixture.cjs');const {readClientGeneration}=require('../scripts/client-generation.cjs');
test('isolated PostgreSQL and HTTP: baseline preservation, verified registration, permanent ownership and adversarial requests',async()=>{
 const database='client_ids_'+crypto.randomBytes(6).toString('hex');
 const config={host:'127.0.0.1',port:55439,user:'client_id_test',database:'postgres',ssl:false,connectionTimeoutMillis:5000};
 const root=new Client(config);await root.connect();await root.query('create database "'+database+'"');await root.end();
 const db=new Pool({...config,database});
 const priorFetch=global.fetch;
 const issuer='https://client-id-test.example.invalid';
 process.env.CLERK_ISSUER=issuer;process.env.CLERK_SECRET_KEY='fixture-only-not-a-real-key';
 process.env.JWT_SECRET=crypto.randomBytes(32).toString('hex');process.env.CLERK_AUTHORIZED_PARTIES='http://localhost:3001';
 process.env.SHEET_ADMIN_USER_IDS='verified-admin';process.env.SHEET_INTEGRATION_ENABLED='true';
 const {privateKey,publicKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});const key=publicKey.export({format:'jwk'});key.kid=crypto.randomUUID();
 const users={a:{first_name:'Actual',last_name:'Account A',email:'a@example.invalid'},b:{first_name:'Actual',last_name:'Account B',email:'b@example.invalid'},pending:{first_name:'Registered',last_name:'Unlinked',email:'pending@example.invalid'},'verified-admin':{first_name:'Verified',last_name:'Admin',email:'admin@example.invalid'}};
 let revoked=false,unverified=false,unavailable=false;
 global.fetch=async(url,options)=>{
  const address=String(url);
  if(address.startsWith('http://127.0.0.1:'))return priorFetch(url,options);
  if(unavailable)throw new Error('Injected identity service outage');
  if(address===issuer+'/.well-known/jwks.json')return Response.json({keys:[key]});
  if(address.startsWith('https://api.clerk.com/v1/sessions/')){
   const sid=decodeURIComponent(address.split('/').at(-1));return Response.json({id:sid,user_id:sid.replace(/^sid-/,''),status:revoked?'revoked':'active',expire_at:Date.now()+600000});
  }
  if(address.startsWith('https://api.clerk.com/v1/users/')){
   const id=decodeURIComponent(address.split('/').at(-1)),u=users[id];if(!u)return new Response(null,{status:404});
   return Response.json({id,first_name:u.first_name,last_name:u.last_name,primary_email_address_id:'primary',email_addresses:[{id:'primary',email_address:u.email,verification:{status:unverified?'unverified':'verified'}}]});
  }
  throw new Error('UNEXPECTED NETWORK DESTINATION');
 };
 require('ts-node/register');
 const {clientRegistrySchema,importSheetExport,readSheetJobs,sheetVersion,validateClientExport}=require('../src/services/sheetStore');
 const {approveClientAccount,parseRegistry}=require('../src/services/clientRegistry');
 const {hydrateVerifiedProfiles,backfillClerkAccounts}=require('../src/services/verifiedAccount');
 const {createAuthRouter}=require('../src/routes/auth');const {createSheetRouter}=require('../src/routes/sheetSync');
 const {authMiddleware}=require('../src/middleware/auth');
 const dir=path.resolve(__dirname,'../../.work/client-id-validation',database);await fs.mkdir(dir,{recursive:true});
 const file=path.join(dir,'synthetic-export.json');
 let server;
 try {
  await db.query(`create table public.profiles(id text primary key,full_name text not null,email text unique not null,role text not null default 'client',account_status text not null default 'active',subscription_plan text not null default 'free')`);
  await db.query(clientRegistrySchema);await db.query(clientRegistrySchema); // Additive migration is repeatable.
  const f=fixture();f.complete();const source=await readClientGeneration(f.client);await fs.writeFile(file,JSON.stringify(source));
  const first=await importSheetExport(file,db,true);assert.equal(first.records,35122);assert.equal(first.candidates,65);
  const again=await importSheetExport(file,db,true);assert.equal(again.unchanged,true);assert.equal(again.snapshotId,first.snapshotId);
  assert.equal((await db.query('select count(*)::int as n from sheet_sync.clients')).rows[0].n,65);
  assert.equal((await db.query('select count(*)::int as n from sheet_sync.records')).rows[0].n,35122);
  const ids=source.registry.values.slice(1).map(r=>r[0]);
  f.master.sheets[0].name='Same Name';f.master.sheets[1].name='Same Name';
  f.master.sheets[1].data[3][1]=f.master.sheets[0].data[3][1]; // Identical content must retain distinct source occurrences.
  f.complete();
  const renamed=await readClientGeneration(f.client);await fs.writeFile(file,JSON.stringify(renamed));const second=await importSheetExport(file,db,true);
  assert.equal(second.records,35122);assert.equal((await db.query('select client_id from sheet_sync.clients where source_sheet_id=$1',['1'])).rows[0].client_id,ids[0]);
  assert.equal((await db.query('select count(*)::int as n from sheet_sync.snapshot_records where snapshot_id=$1',[first.snapshotId])).rows[0].n,35122);
  const express=require('express');const app=express();app.use(express.json());app.use('/api/auth',createAuthRouter(()=>db));app.use('/api',createSheetRouter(()=>db));app.get('/protected',authMiddleware,(req,res)=>res.json(req.user));
  server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base='http://127.0.0.1:'+server.address().port;
  const token=(id,opts={})=>jwt.sign({sid:'sid-'+id,azp:'http://localhost:3001'},privateKey,{algorithm:'RS256',keyid:key.kid,issuer,subject:id,expiresIn:300,...opts});
  const exchange=(id,body={})=>global.fetch(base+'/api/auth/token',{method:'POST',headers:{Authorization:'Bearer '+token(id),'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await global.fetch(base+'/api/auth/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:'a',email:'admin@example.invalid',role:'admin'})})).status,401);
  const a=await exchange('a',{userId:'b',email:'b@example.invalid',fullName:'Forged',clientId:ids[1],role:'admin'});assert.equal(a.status,200);const aBody=await a.json();assert.equal(aBody.user.userId,'a');assert.equal(aBody.user.email,'a@example.invalid');assert.equal(aBody.user.fullName,'Actual Account A');assert.equal(aBody.user.role,'client');
  assert.equal((await global.fetch(base+'/protected',{headers:{Authorization:'Bearer '+aBody.token}})).status,200);
  const forged=jwt.sign({userId:'a',role:'admin'},process.env.JWT_SECRET);assert.equal((await global.fetch(base+'/protected',{headers:{Authorization:'Bearer '+forged}})).status,401);
  await db.query("update profiles set subscription_plan='pro' where id='a'");await exchange('a');assert.equal((await db.query("select subscription_plan from profiles where id='a'")).rows[0].subscription_plan,'pro');
  await exchange('b');await exchange('pending');
  await exchange('verified-admin');assert.equal((await db.query("select role from profiles where id='verified-admin'")).rows[0].role,'admin');
  const backfill=await backfillClerkAccounts(db,async()=>Response.json([{id:'unverified-registration',first_name:'Actual',last_name:'Unverified',created_at:Date.now()-60000,primary_email_address_id:'p',email_addresses:[{id:'p',email_address:'unverified@example.invalid',verification:{status:'unverified'}}]}]));
  assert.equal(backfill.pending,1);await assert.rejects(approveClientAccount('unverified-registration',ids[2],'operator',db),/verified/);
  const get=(id,suffix='')=>global.fetch(base+'/api/mobile/sheet-records'+suffix,{headers:{Authorization:'Bearer '+token(id)}});
  assert.equal((await (await get('pending')).json()).total,0);assert.equal((await sheetVersion('pending',db)).version,null);
  await assert.rejects(approveClientAccount('not-verified',ids[0],'operator',db),/verified/);
  await approveClientAccount('a',ids[0],'operator',db);await approveClientAccount('b',ids[1],'operator',db);
  await assert.rejects(approveClientAccount('pending',ids[0],'operator',db));
  await assert.rejects(approveClientAccount('a',ids[2],'operator',db),/overwritten/);
  for(const [user,id,sheet]of [['a',ids[0],'1'],['b',ids[1],'2']]){
   const response=await get(user,'?userId=pending&clientId='+ids[2]+'&candidate=Same%20Name&limit=1000');assert.equal(response.status,200);const body=await response.json();
   const expected=renamed.provenance.filter(p=>p===sheet).length;assert.equal(body.total,expected);assert.equal(body.jobs.length,expected);
   assert.ok(body.jobs.every(job=>job.user_name==='Same Name'));
   const otherIds=new Set((await readSheetJobs({userId:user==='a'?'b':'a',limit:1000},db)).jobs.map(j=>j.id));assert.ok(body.jobs.every(j=>!otherIds.has(j.id)));
  }
  assert.ok((await sheetVersion('a',db)).version);
  const listing=await global.fetch(base+'/api/admin/client-accounts',{headers:{Authorization:'Bearer '+token('verified-admin')}});assert.equal(listing.status,200);const adminRows=(await listing.json()).users;
  assert.equal(adminRows.find(r=>r.user_id==='a').full_name,'Actual Account A');assert.equal(adminRows.find(r=>r.user_id==='pending').mapping_status,'pending');
  assert.equal(adminRows.find(r=>r.user_id==='unverified-registration').verified_email,null);assert.equal(adminRows.find(r=>r.user_id==='unverified-registration').registration_status,'pending_verification');
  const hydrated=await hydrateVerifiedProfiles([{id:'a',full_name:'Forged profile name',email:'forged@example.invalid',subscription_plan:'pro'}],db);assert.equal(hydrated[0].full_name,'Actual Account A');assert.equal(hydrated[0].email,'a@example.invalid');assert.equal(hydrated[0].subscription_plan,'pro');
  assert.equal((await global.fetch(base+'/api/admin/client-accounts',{headers:{Authorization:'Bearer '+token('a')}})).status,403);
  const associations=[{email:'pending@example.invalid',clientId:ids[2]}];
  const approveRequest=(id,body)=>global.fetch(base+'/api/admin/client-email-associations',{method:'POST',headers:{Authorization:'Bearer '+token(id),'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await approveRequest('a',{associations})).status,403);
  assert.equal((await global.fetch(base+'/api/admin/client-email-associations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({associations})})).status,401);
  const reviewResponse=await approveRequest('verified-admin',{associations});assert.equal(reviewResponse.status,200);const review=await reviewResponse.json();assert.equal(review.conflicts.length,0);
  assert.equal((await approveRequest('verified-admin',{associations,approve:true,reviewDigest:'forged'})).status,409);
  assert.equal((await approveRequest('verified-admin',{associations,approve:true,reviewDigest:review.digest})).status,200);
  assert.equal((await exchange('pending',{email:'forged@example.invalid',clientId:ids[1]})).status,200);
  assert.equal((await db.query("select client_id from sheet_sync.client_accounts where user_id='pending'")).rows[0].client_id,ids[2]);
  assert.ok((await (await get('pending')).json()).total>0);
  assert.equal((await exchange('pending')).status,200);assert.equal((await db.query("select client_id from sheet_sync.client_accounts where user_id='pending'")).rows[0].client_id,ids[2]);
  assert.equal((await global.fetch(base+'/api/admin/sheet-sync/automation',{headers:{Authorization:'Bearer '+token('verified-admin')}})).status,200);
  assert.equal((await global.fetch(base+'/api/admin/sheet-sync/automation',{headers:{Authorization:'Bearer '+token('a')}})).status,403);
  unverified=true;assert.equal((await exchange('pending')).status,401);assert.equal((await get('a')).status,503);unverified=false;
  revoked=true;assert.equal((await get('a')).status,401);revoked=false;
  assert.equal((await global.fetch(base+'/api/mobile/sheet-records',{headers:{Authorization:'Bearer '+token('a',{issuer:'https://wrong.invalid'})}})).status,401);
  const wrongSession=jwt.sign({sid:'sid-b',azp:'http://localhost:3001'},privateKey,{algorithm:'RS256',keyid:key.kid,issuer,subject:'a',expiresIn:300});assert.equal((await global.fetch(base+'/api/mobile/sheet-records',{headers:{Authorization:'Bearer '+wrongSession}})).status,401);
  unavailable=true;assert.equal((await get('a')).status,401);unavailable=false;
  await db.query("update sheet_sync.client_accounts set revoked_at=now() where user_id='a'");assert.equal((await (await get('a')).json()).total,0);assert.equal((await sheetVersion('a',db)).version,null);
  assert.equal((await (await get('a','?snapshotId='+first.snapshotId)).json()).total,0);
  await assert.rejects(approveClientAccount('a',ids[0],'operator',db));
  const tampered=structuredClone(renamed);tampered.provenance[0]='2';assert.throws(()=>validateClientExport(tampered,parseRegistry(tampered.registry.values)),/mismatch/);
  const conflicting=structuredClone(renamed);conflicting.registry.values[1][0]=conflicting.registry.values[2][0];assert.throws(()=>parseRegistry(conflicting.registry.values),/conflicting/);
  const reassign=structuredClone(renamed);reassign.registry.values[1][0]='9JOBS-CL-'+crypto.randomUUID();await fs.writeFile(file,JSON.stringify(reassign));await assert.rejects(importSheetExport(file,db,true));
  assert.equal((await db.query('select client_id from sheet_sync.clients where source_sheet_id=$1',['1'])).rows[0].client_id,ids[0]);
  const removed=f.master.sheets[2].data.pop();f.complete();await fs.writeFile(file,JSON.stringify(await readClientGeneration(f.client)));await assert.rejects(importSheetExport(file,db,true),/count decreased/);f.master.sheets[2].data.push(removed);
  const failed=structuredClone(renamed);failed.clientProtocol.state='WRITING';await fs.writeFile(file,JSON.stringify(failed));await assert.rejects(importSheetExport(file,db,true),/Completed/);
  await fs.writeFile(file,JSON.stringify(source));await assert.rejects(importSheetExport(file,db,true),/Older/);
  assert.equal((await db.query('select snapshot_id from sheet_sync.head where source_id=$1',[renamed.spreadsheetId])).rows[0].snapshot_id,second.snapshotId);
  // Simulate a crash midway through a fresh transaction. No client/head/record writes survive.
  await fs.writeFile(file,JSON.stringify(renamed));const broken={connect:async()=>{const c=await db.connect();return{release:()=>c.release(),query:(sql,args)=>sql.startsWith('insert into sheet_sync.clients')?Promise.reject(new Error('Injected failure')):c.query(sql,args)};}};
  await assert.rejects(importSheetExport(file,broken,true),/Injected/);
  const lock=await db.connect();await lock.query('begin');await lock.query('select pg_advisory_xact_lock(91035,65)');await assert.rejects(importSheetExport(file,db,true),/Another/);await lock.query('rollback');lock.release();
  assert.equal((await db.query('select count(*)::int as n from sheet_sync.snapshot_records where snapshot_id=$1',[first.snapshotId])).rows[0].n,35122);
  await fs.writeFile(path.join(dir,'evidence.json'),JSON.stringify({database,host:'127.0.0.1',baseline:35122,clients:65,stableIds:true,oldSnapshotRetained:true,twoSameNameClientsIsolated:true,verifiedRegistration:true,unlinkedDenied:true,revocationEnforced:true,cloudConnections:0},null,2));
 } finally {global.fetch=priorFetch;if(server)await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});await db.end();}
});

const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {Client}=require('pg');
const database='9jobs_local_e2e_credentials_'+crypto.randomBytes(4).toString('hex');
Object.assign(process.env,{LOCAL_DATABASE_MODE:'isolated-e2e',DATABASE_URL:`postgresql://client_id_test@127.0.0.1:55439/${database}`,PLATFORM_CREDENTIALS_KEY:'f'.repeat(64),JWT_SECRET:'fixture-secret-only-'.repeat(3),SHEET_ADMIN_USER_IDS:'fixture-admin'});
require('ts-node/register');
const express=require('express'),jwt=require('jsonwebtoken');
const {sealCredentials,openCredentials,credentialDb,initializeCredentialVault}=require('../src/services/platformCredentials');
const router=require('../src/routes/platformCredentials').default;
test('isolated credential submission, encryption, ownership, admin authorization and audited reveal',async()=>{
 const root=new Client({host:'127.0.0.1',port:55439,user:'client_id_test',database:'postgres'});
 await root.connect();await root.query(`create database "${database}"`);await root.end();
 const db=credentialDb();
 await db.query('create schema sheet_sync; create table sheet_sync.verified_accounts(user_id text primary key,full_name text,email text)');
 await db.query("insert into sheet_sync.verified_accounts values('fixture-a','Client A','a@example.invalid'),('fixture-b','Client B','b@example.invalid')");
 await initializeCredentialVault();
 const app=express();app.use(express.json());app.use('/api',router);
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 function token(subject,role='client'){return jwt.sign({userId:subject,role,identity_verified:true,email:subject+'@example.invalid'},process.env.JWT_SECRET,{issuer:'9jobs-backend',audience:'9jobs-api',expiresIn:'2m'});}
 async function call(path,subject,role='client',body){return fetch(`http://127.0.0.1:${server.address().port}/api${path}`,{method:body?'POST':'GET',headers:{...(subject?{Authorization:'Bearer '+token(subject,role)}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}
 try{
  assert.equal((await call('/admin/platform-credentials')).status,401);
  assert.equal((await call('/admin/platform-credentials','fixture-a')).status,403);
  const payload={platform:'LinkedIn',email:'platform@example.invalid',password:'dummy-test-password',consent:true,requestId:'fixture-request-001',userId:'fixture-b'};
  const first=await call('/mobile/platform-credentials','fixture-a','client',payload);
  assert.equal(first.status,201);assert.equal(first.headers.get('cache-control'),'no-store');
  const saved=await first.json();assert.equal(JSON.stringify(saved).includes(payload.password),false);
  assert.equal((await call('/mobile/platform-credentials','fixture-a','client',payload)).status,201);
  let result=await db.query('select * from credential_vault.submissions');
  assert.equal(result.rowCount,1);assert.equal(result.rows[0].user_id,'fixture-a');
  assert.equal(result.rows[0].ciphertext.includes(payload.password),false);assert.equal(result.rows[0].ciphertext.includes(payload.email),false);
  assert.throws(()=>openCredentials(result.rows[0].ciphertext,'wrong-owner'));
  const listing=await call('/admin/platform-credentials','fixture-admin','admin');assert.equal(listing.status,200);
  const rows=(await listing.json()).submissions;assert.equal(rows[0].clientName,'Client A');assert.equal(rows[0].loginEmail,payload.email);assert.equal(rows[0].password,undefined);
  assert.equal((await call(`/admin/platform-credentials/${saved.submission.id}/reveal`,'fixture-b','client',{})).status,403);
  const reveal=await call(`/admin/platform-credentials/${saved.submission.id}/reveal`,'fixture-admin','admin',{});
  assert.equal(reveal.status,200);assert.equal((await reveal.json()).password,payload.password);
  assert.equal((await db.query('select admin_id from credential_vault.access_audit')).rows[0].admin_id,'fixture-admin');
  assert.equal((await call('/admin/platform-credentials','unapproved-admin','admin')).status,403);
  assert.equal((await call('/mobile/platform-credentials','fixture-a','client',{...payload,consent:false})).status,400);
  const seek=await call('/mobile/platform-credentials','fixture-a','client',{...payload,platform:'SEEK',requestId:'fixture-request-002'});assert.equal(seek.status,201);
  assert.equal((await db.query('select count(*) from credential_vault.submissions')).rows[0].count,'2');
  console.log('Passed: separate fixture database; no existing accounts or jobs changed; database retained for inspection.');
 }finally{await new Promise(resolve=>server.close(resolve));await db.end();}
});

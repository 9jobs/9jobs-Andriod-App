const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Client } = require('pg');

test('serverless documents persist in isolated Postgres with immutable paths and scoped download links', async () => {
  const name = '9jobs_local_e2e_documents_' + crypto.randomBytes(6).toString('hex');
  const config = {host:'127.0.0.1',port:55439,user:'client_id_test',database:'postgres',ssl:false,connectionTimeoutMillis:5000};
  const root = new Client(config);
  await root.connect();
  await root.query(`create database "${name}"`);
  await root.end();
  process.env.LOCAL_DATABASE_MODE = 'isolated-e2e';
  process.env.DATABASE_URL = `postgresql://client_id_test@127.0.0.1:55439/${name}`;
  process.env.VERCEL = '1';
  process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
  require('ts-node/register');
  const docs = require('../src/services/questionnaireDocuments');
  assert.equal(docs.usesDatabaseDocuments(), true);
  const a = docs.documentPath('fixture-a', 'resume', 'Resume ,,,.pdf');
  const b = docs.documentPath('fixture-a', 'resume', 'Resume ,,,.pdf');
  assert.notEqual(a, b);
  assert.equal(docs.ownsDocumentPath('fixture-b', a), false);
  assert.equal(docs.ownsDocumentPath('fixture-a', 'fixture-a/resume/../../outside'), false);
  assert.equal(docs.ownsDocumentPath('fixture-a', 'fixture-a/resume/..'), false);
  assert.equal(docs.ownsDocumentPath('fixture-a', a, 'visa'), false);
  const bytes = Buffer.from('%PDF-1.4 isolated fixture');
  await Promise.all([docs.storeDocument('fixture-a', a, 'application/pdf', bytes),
    docs.storeDocument('fixture-a', a, 'application/pdf', bytes)]);
  assert.equal(await docs.hasDocument('fixture-a', a, 'resume'), true);
  assert.equal(await docs.hasDocument('fixture-b', a, 'resume'), false);
  assert.equal(await docs.hasDocument('fixture-a', b, 'resume'), false);
  await assert.rejects(docs.storeDocument('fixture-b', a, 'application/pdf', bytes), /Invalid document/);
  await assert.rejects(docs.storeDocument('fixture-a', a, 'text/html', bytes), /Invalid document/);
  await assert.rejects(docs.storeDocument('fixture-a', a, 'application/pdf', Buffer.alloc(0)), /Invalid document/);
  await assert.rejects(docs.storeDocument('fixture-a', a, 'application/pdf', Buffer.alloc(12*1024*1024+1)), /Invalid document/);
  await assert.rejects(docs.storeDocument('fixture-a', a, 'application/pdf', Buffer.from('replacement')), /already exists/);
  const pool = new Client({...config,database:name});
  await pool.connect();
  const result = await pool.query('select content from questionnaire_documents');
  assert.equal(result.rowCount, 1);
  assert.deepEqual(result.rows[0].content, bytes); // New connection: not memory/filesystem storage.
  await pool.end();
  const schema = require('node:fs').readFileSync(require('node:path').resolve(__dirname,'../../mobile/supabase/schema.sql'),'utf8');
  const setup = new Client({...config,database:name});await setup.connect();
  await setup.query(schema.slice(0,schema.indexOf('alter table profiles add column')));
  await setup.end();
  const store = require('../src/services/questionnaireStore');
  const row = {user_id:'fixture-a',full_name:'Fixture Candidate',contact_number:'123456789',working_rights:'Citizen',full_address:'Test address',date_of_birth:'1995-01-01',gender:'Other',expected_salary:'90000',notice_period:'Immediately',preferred_job_locations:['Remote'],work_types:['Full-time'],preferred_roles:['Developer'],resume_path:a,resume_name:'Resume.pdf',visa_type:'',visa_path:'',visa_name:'',completed_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  const saved = await store.saveStoredQuestionnaire('fixture-a','fixture-a@example.invalid',row);
  assert.equal(saved.resume_path,a);assert.ok(saved.completed_at);
  assert.equal((await store.readStoredQuestionnaires('fixture-a')).length,1);
  assert.equal((await store.readStoredQuestionnaires('fixture-b')).length,0);
  await store.saveStoredQuestionnaire('fixture-a','different@example.invalid',row);
  assert.equal((await store.readStoredQuestionnaires()).length,1);
  await assert.rejects(store.saveStoredQuestionnaire('fixture-b','fixture-b@example.invalid',{...row,user_id:'fixture-b'}),/ownership/);
  await assert.rejects(store.saveStoredQuestionnaire('fixture-a','fixture-a@example.invalid',{...row,resume_path:b}),/uploaded first/);
  await assert.rejects(store.saveStoredQuestionnaire('fixture-a','fixture-a@example.invalid',{...row,full_name:'Must rollback',date_of_birth:'invalid-date'}));
  const verify = new Client({...config,database:name});await verify.connect();
  assert.equal((await verify.query("select full_name,email,role from profiles where id='fixture-a'")).rows[0].full_name,'Fixture Candidate');
  assert.equal((await verify.query("select email from profiles where id='fixture-a'")).rows[0].email,'fixture-a@example.invalid');
  assert.equal((await verify.query("select count(*)::int as count from questionnaire_documents")).rows[0].count,1);
  await verify.end();
  const link = docs.signDocumentDownload(a);
  assert.equal(docs.verifyDocumentDownload(link), a);
  assert.throws(() => docs.verifyDocumentDownload(link + 'tamper'));
  const jwt = require('jsonwebtoken');
  assert.throws(() => docs.verifyDocumentDownload(jwt.sign({storagePath:a}, process.env.JWT_SECRET, {
    expiresIn:-1, audience:'questionnaire-document', issuer:'9jobs-backend'})));
  assert.throws(() => docs.verifyDocumentDownload(jwt.sign({storagePath:a}, process.env.JWT_SECRET, {
    audience:'9jobs-api', issuer:'9jobs-backend'})));
  // Exercise document capabilities, not a fabricated login session.
  const express = require('express');
  const app = express();
  app.use('/api', require('../src/routes/questionnaire').default);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/mobile/questionnaire/document`;
  try {
    const response = await fetch(base + '?token=' + encodeURIComponent(link));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.match(response.headers.get('content-disposition'), /^attachment;/);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    assert.equal((await fetch(base)).status, 403);
    assert.equal((await fetch(base + '?token=' + encodeURIComponent(link + 'tamper'))).status, 403);
  } finally {
    await new Promise(resolve => {server.close(resolve); server.closeAllConnections();});
  }
  console.log('Isolated database evidence: one immutable document; identical bytes retained across connections; no filesystem writes or live connections.');
});

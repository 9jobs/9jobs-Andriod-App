const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const path = require('node:path');
require('../dist/lib/env');
const jwt = require('jsonwebtoken');
const { createDatabasePool, isNeonDatabase } = require('../dist/lib/database');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  assert.ok(isNeonDatabase(), 'DATABASE_URL must point to Neon');
  const pool = createDatabasePool();
  const id = `neon-smoke-${randomUUID()}`;
  const messageId = randomUUID();
  const text = `Neon persistence check ${messageId}`;
  const secret = randomUUID();
  const token = jwt.sign({ userId: id, role: 'client', email: 'smoke@example.invalid' }, secret, { expiresIn: '5m' });
  const adminToken = jwt.sign({ userId: 'neon-smoke-admin', role: 'admin', email: 'admin@example.invalid' }, secret, { expiresIn: '5m' });
  let server;
  let output = '';
  async function start() {
    server = spawn(process.execPath, ['dist/server.js'], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, PORT: '0', JWT_SECRET: secret },
      stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    });
    // PORT=0 asks the OS for a free port; the server reports the bound port.
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { reject(new Error(`Backend startup timed out: ${output}`)); }, 60000);
      const onData = chunk => {
        output += chunk.toString();
        const match = output.match(/Backend server listening on 0\.0\.0\.0:(\d+)/);
        if (match) { clearTimeout(timeout); resolve(`http://127.0.0.1:${match[1]}`); }
      };
      server.stdout.on('data', onData);
      server.stderr.on('data', onData);
      server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Backend exited (${code}): ${output}`)); });
    });
  }
  async function stop() {
    if (!server || server.exitCode !== null) return;
    await new Promise(resolve => { server.once('exit', resolve); server.kill(); });
  }
  try {
    await pool.query('insert into conversations(id, client_id, chatbot_enabled) values($1,$1,false)', [id]);
    let base = await start();
    let response = await fetch(`${base}/health`);
    assert.equal(response.status, 200);
    console.log('PASS: backend starts; GET /health -> HTTP 200');
    response = await fetch(`${base}/api/chat/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, clientMessageId: messageId }), signal: AbortSignal.timeout(30000),
    });
    const body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(body.success, true);
    const stored = await pool.query('select text from messages where conversation_id=$1 and client_message_id=$2', [id, messageId]);
    assert.equal(stored.rowCount, 1);
    assert.equal(stored.rows[0].text, text);
    console.log('PASS: authenticated POST /api/chat/messages -> HTTP 200; exact message persisted in Neon');
    await stop();
    output = '';
    base = await start();
    response = await fetch(`${base}/api/chat/messages`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
    const history = await response.json();
    assert.equal(response.status, 200, JSON.stringify(history));
    assert.ok(history.some(message => message.client_message_id === messageId && message.text === text));
    console.log('PASS: after backend restart, authenticated GET /api/chat/messages reads the saved message from Neon');
    response = await fetch(`${base}/api/admin/conversations/${id}/messages/${messageId}`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `${text} edited` }),
    });
    assert.equal(response.status, 200, await response.text());
    const edited = await pool.query('select text from messages where conversation_id=$1', [id]);
    assert.equal(edited.rows[0].text, `${text} edited`);
    console.log('PASS: authenticated message edit persists in Neon');
    response = await fetch(`${base}/api/chat/messages/seen`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200);
    response = await fetch(`${base}/api/chat/messages/${messageId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200, await response.text());
    const deleted = await pool.query('select count(*)::int as count from messages where conversation_id=$1', [id]);
    assert.equal(deleted.rows[0].count, 0);
    console.log('PASS: seen and delete APIs persist in Neon');
    response = await fetch(`${base}/api/chat/messages/new`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200, await response.text());
    const welcome = await pool.query('select text from messages where conversation_id=$1', [id]);
    assert.equal(welcome.rowCount, 1);
    response = await fetch(`${base}/api/chat/messages/clear`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200, await response.text());
    const cleared = await pool.query('select count(*)::int as count from messages where conversation_id=$1', [id]);
    assert.equal(cleared.rows[0].count, 0);
    console.log('PASS: new-conversation and clear APIs persist in Neon');
    function databaseClient(authToken) {
      return createClient('https://retired-database.invalid', 'session-only', {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: async (input, init) => {
          const request = new Request(input, init); const url = new URL(request.url);
          return fetch(`${base}/api/database/query`, {
            method: 'POST', headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ table: url.pathname.split('/rest/v1/')[1], query: url.search.slice(1), method: request.method,
              accept: request.headers.get('accept'), prefer: request.headers.get('prefer'),
              body: ['GET','HEAD','DELETE'].includes(request.method) ? undefined : await request.json() }),
          });
        } },
      });
    }
    const admin = databaseClient(adminToken); const own = databaseClient(token);
    let query = await admin.from('profiles').upsert({ id, full_name: 'Migration Fixture', email: `${id}@example.invalid` }, { onConflict: 'id' }).select().single();
    assert.equal(query.error, null, JSON.stringify(query.error));
    query = await admin.from('jobs').upsert({ id, title: 'Migration fixture', company: 'Fixture', location: 'Remote', salary: '0', job_type: 'Full-time', posted_at: 'Today' }, { onConflict: 'id' }).select().single();
    assert.equal(query.error, null, JSON.stringify(query.error));
    query = await admin.from('applications').insert({ user_id: id, client_id: id, job_id: id, status: 'applied' }).select().single();
    assert.equal(query.error, null, JSON.stringify(query.error));
    query = await own.from('applications').select('*,jobs(*),profiles(full_name,email)').eq('user_id', id);
    assert.equal(query.error, null, JSON.stringify(query.error));
    assert.equal(query.data[0].jobs.id, id);
    assert.equal(query.data[0].profiles.full_name, 'Migration Fixture');
    query = await own.from('profiles').update({ headline: 'Stored in Neon' }).eq('id', id).select().single();
    assert.equal(query.error, null, JSON.stringify(query.error));
    assert.equal(query.data.headline, 'Stored in Neon');
    query = await admin.from('profiles').select('*', { count: 'exact', head: true }).eq('id', id);
    assert.equal(query.error, null, JSON.stringify(query.error));
    assert.equal(query.count, 1);
    query = await own.from('profiles').update({ role: 'admin' }).eq('id', id);
    assert.equal(query.error?.code, 'FORBIDDEN');
    query = await own.from('profiles').select('*').eq('id', 'some-other-user');
    assert.equal(query.error, null, JSON.stringify(query.error));
    assert.deepEqual(query.data, []);
    query = await own.from('website_admin_records').select('*');
    assert.equal(query.error?.code, 'FORBIDDEN');
    query = await admin.from('profiles').select('*').or(`id.eq.${id},email.eq.nonexistent@example.invalid`).in('id', [id]);
    assert.equal(query.error, null, JSON.stringify(query.error));
    assert.equal(query.data.length, 1);
    console.log('PASS: mobile/admin database bridge CRUD, joins, count, filters and user isolation; role escalation denied');
    response = await fetch(`${base}/api/mobile/snapshot`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(60000) });
    const snapshot = await response.json();
    assert.equal(response.status, 200, JSON.stringify(snapshot));
    assert.equal(snapshot.profile.id, id);
    assert.equal(snapshot.profile.headline, 'Stored in Neon');
    assert.ok(snapshot.applications.some(application => application.job_id === id));
    console.log('PASS: full mobile snapshot reads profile, jobs and application from Neon');
    const { pathToFileURL } = require('node:url');
    const { getNeonRecordClient } = await import(pathToFileURL(path.resolve(__dirname, '../../admin-next/website-admin/lib/storage/neon-client.js')));
    const website = getNeonRecordClient();
    query = await website.from('website_admin_records').upsert({ id, model: 'MigrationFixture', payload: { test: true } });
    assert.equal(query.error, null, query.error?.message);
    query = await website.from('website_admin_records').select('id,payload').eq('id', id).eq('model', 'MigrationFixture');
    assert.equal(query.error, null, query.error?.message);
    assert.equal(query.data[0].payload.test, true);
    query = await website.from('website_admin_records').delete().in('id', [id]);
    assert.equal(query.error, null, query.error?.message);
    console.log('PASS: website-admin JSON records write/read/delete directly in Neon');
    response = await fetch(`${base}/api/chat/messages`);
    assert.equal(response.status, 401);
    console.log('PASS: unauthenticated database API request -> HTTP 401');
  } finally {
    await stop();
    await pool.query('delete from conversations where id=$1', [id]);
    await pool.query('delete from profiles where id=$1', [id]);
    await pool.query('delete from jobs where id=$1', [id]);
    await pool.query('delete from website_admin_records where id=$1', [id]);
    await pool.end();
    console.log('Test fixtures removed from Neon');
  }
}
main().catch(error => { console.error('FAIL:', error.message); process.exitCode = 1; });

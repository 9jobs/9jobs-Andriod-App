// Start only the existing isolated cluster and backend. Never initialize/reset data.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const {spawn, execFileSync} = require('node:child_process');
const {localConfig} = require('./localhost-e2e-config.cjs');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function listening(port) {
 return new Promise(resolve => {
  const socket = net.connect({host:'127.0.0.1', port});
  socket.setTimeout(1000);
  socket.once('connect', () => {socket.destroy(); resolve(true);});
  for (const event of ['error','timeout']) socket.once(event, () => {socket.destroy(); resolve(false);});
 });
}
async function isolatedHealth() {
 try {
  const response = await fetch('http://127.0.0.1:3100/health', {signal:AbortSignal.timeout(1500)});
  return response.ok && (await response.json()).localTestEnvironment === true;
 } catch {return false;}
}
async function ensureLocalhostRuntime() {
 const {root, directory, config} = localConfig();
 if (await isolatedHealth()) return;
 if (await listening(3100)) throw new Error('Port 3100 is occupied by an unverified backend; it was not changed.');
 if (!await listening(55439)) {
  const data = path.join(root,'.work/client-id-postgres');
  const pgCtl = 'C:/Program Files/PostgreSQL/18/bin/pg_ctl.exe';
  if (!fs.existsSync(path.join(data,'PG_VERSION')) || !fs.existsSync(pgCtl))
   throw new Error('Existing isolated PostgreSQL cluster/tools missing; no database was created.');
  console.log('Starting existing isolated PostgreSQL on 127.0.0.1:55439...');
  try {
   execFileSync(pgCtl,['-D',data,'-l',path.join(directory,'postgres.log'),'-o','-h 127.0.0.1 -p 55439','-t','120','-w','start'],{windowsHide:true,stdio:'pipe',timeout:125000});
  } catch {
   if (!await listening(55439)) throw new Error('Isolated PostgreSQL could not start. Check .work/localhost-e2e/postgres.log; no reset was attempted.');
  }
 }
 // Verify the existing database before starting the backend, without migrations/fixtures.
 const {Client} = require('pg');
 for (let attempt=0; ; attempt++) {
  const database = new Client({connectionString:config.DATABASE_URL,connectionTimeoutMillis:5000});
  try {await database.connect(); await database.query('SELECT 1'); break;}
  catch (error) {
   if (error.code !== '57P03' || attempt>=119)
    throw new Error('Existing isolated test database is unavailable; no fallback or reset permitted.');
   await delay(1000); // PostgreSQL may be recovering safely after a computer restart.
  } finally {await database.end().catch(()=>{});}
 }
 console.log('Starting isolated localhost backend on http://127.0.0.1:3100...');
 const child = spawn(process.execPath,[path.join(__dirname,'start-localhost-e2e.cjs')],{
  cwd:path.join(root,'backend'),stdio:'inherit',windowsHide:true,
 });
 let failed = false;
 child.once('error',()=>{failed=true;});
 child.once('exit',()=>{failed=true;});
 for (let attempt=0; attempt<120; attempt++) {
  if (await isolatedHealth()) {console.log('Isolated localhost backend ready.'); return;}
  if (failed) throw new Error('Local backend startup failed; check the startup output above.');
  await delay(1000);
 }
 child.kill();
 throw new Error('Local backend readiness timed out; no production fallback permitted.');
}
module.exports={ensureLocalhostRuntime};

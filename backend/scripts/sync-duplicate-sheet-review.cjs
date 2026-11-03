// Long-running LOCAL/STAGING worker. Never publishes an unverified source refresh.
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const config=require('dotenv').parse(fs.readFileSync(path.resolve(__dirname,'../.env.sheets-test.local')));
if(config.SHEET_DATABASE_BRANCH!=='br-dawn-truth-a7n0s78z'||new URL(config.DATABASE_URL).hostname!=='ep-raspy-dream-a7pxtepd-pooler.ap-southeast-2.aws.neon.tech')throw new Error('Isolated test branch required');
Object.assign(process.env,config);
require('ts-node/register');
const {createDatabasePool}=require('../src/lib/database');
const pool=createDatabasePool();
function run(script,args=[]){return new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,[path.join(__dirname,script),...args],{stdio:'inherit',env:process.env,windowsHide:true});
 child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error('Source synchronization failed')));
});}
async function cycle(){
 const client=await pool.connect();
 try{
  await client.query('begin');
  const lock=await client.query('select pg_try_advisory_xact_lock(91035,66) as locked');
  if(!lock.rows[0].locked){await client.query('rollback');return;}
  await run('fetch-duplicate-sheet.cjs',['--consistent']);
  await run('import-duplicate-sheet.cjs');
  await client.query('commit');
  console.log('Sheet sync cycle succeeded. Only validated source snapshots can be accepted; client reads still require verified approved mappings.');
 }catch(error){await client.query('rollback');throw error;}
 finally{client.release();}
}
let stopping=false,timer;
async function tick(){
 try{await cycle();}
 catch{console.error('Sheet review sync failed; previous data preserved. Next retry in 60 seconds.');if(process.argv.includes('--watch')&&!stopping){timer=setTimeout(tick,60000);return;}process.exitCode=1;}
 if(process.argv.includes('--watch')&&!stopping)timer=setTimeout(tick,3600000);
 else await pool.end();
}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopping=true;clearTimeout(timer);void pool.end();});
if(process.argv.includes('--skip-initial')&&process.argv.includes('--watch')){
 console.log('Hourly local sheet review worker ready; first scheduled fetch in one hour.');timer=setTimeout(tick,3600000);
}else void tick();

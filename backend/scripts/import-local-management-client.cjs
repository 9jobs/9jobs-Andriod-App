// Copy one existing verified LOCAL identity into the isolated management mirror.
// Never writes to the source, Sheets, Clerk or a cloud database. Never links by name.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {Client}=require('pg'),dotenv=require('dotenv');
const {base,fingerprint}=require('./super-admin-backup.cjs');
async function main(){
 const [managedId,sourceTag,targetTag]=process.argv.slice(2);
 if(!/^[a-f0-9-]{36}$/i.test(managedId||'')||![sourceTag,targetTag].every(tag=>/^[a-f0-9]{12}$/.test(tag||'')))throw Error('Local client record and verified backup tags required');
 const root=path.resolve(__dirname,'../..');
 const state=JSON.parse(fs.readFileSync(path.join(root,'.work/super-admin-local/runtime.json')));
 const readBackup=tag=>JSON.parse(fs.readFileSync(path.join(root,'.work/super-admin-backups',tag,'verified.json')));
 const sourceBackup=readBackup(sourceTag),targetBackup=readBackup(targetTag);
 if(!/^9jobs_local_e2e_sa_[a-f0-9]{12}$/.test(state.database)||!sourceBackup.verified||!targetBackup.verified||targetBackup.source!==state.database||!/^9jobs_local_e2e_[a-f0-9]{12}$/.test(sourceBackup.source)||sourceBackup.source===state.database)throw Error('Verified separate LOCAL source and target required');
 assert.deepEqual(await fingerprint(state.database),targetBackup.tables,'Target changed since backup');
 const source=new Client({...base,database:sourceBackup.source,options:'-c default_transaction_read_only=on'});
 const target=new Client({...base,database:state.database});
 await source.connect();await target.connect();
 try {
  for(const [db,name] of [[source,sourceBackup.source],[target,state.database]]){
   const actual=(await db.query('select current_database() database,host(inet_server_addr()) host,inet_server_port() port')).rows[0];
   if(actual.database!==name||actual.host!=='127.0.0.1'||actual.port!==55439)throw Error('Actual local target mismatch');
  }
  const managed=(await target.query('select id,email,status from admin_management.managed_clients where id=$1',[managedId])).rows[0];
  if(!managed?.email||managed.status!=='active')throw Error('Active management client with an explicit email required');
  await source.query('begin isolation level repeatable read read only');
  const matches=(await source.query(`select a.user_id,a.client_id from sheet_sync.client_accounts a join sheet_sync.verified_accounts v on v.user_id=a.user_id
    where lower(v.email)=lower($1) and a.revoked_at is null`,[managed.email])).rows;
  if(matches.length!==1)throw Error('Exactly one existing verified source mapping must match the client email');
  const mapping=matches[0];
  const canonical=(await source.query('select * from sheet_sync.clients where client_id=$1',[mapping.client_id])).rows[0];
  const verified=(await source.query('select * from sheet_sync.verified_accounts where user_id=$1',[mapping.user_id])).rows[0];
  const account=(await source.query('select * from sheet_sync.client_accounts where user_id=$1',[mapping.user_id])).rows[0];
  const profile=(await source.query('select id,email,full_name,role from public.profiles where id=$1',[mapping.user_id])).rows[0];
  if(profile&&(profile.role!=='client'||profile.email.toLowerCase()!==managed.email.toLowerCase()))throw Error('Existing source profile identity conflict');
  const config=dotenv.parse(fs.readFileSync(path.join(root,'backend/.env.local-e2e')));
  if(!config.CLERK_SECRET_KEY?.startsWith('sk_test_'))throw Error('Development identity verification required');
  const response=await fetch('https://api.clerk.com/v1/users/'+encodeURIComponent(mapping.user_id),{headers:{Authorization:'Bearer '+config.CLERK_SECRET_KEY},redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Clerk Development client lookup failed');
  const user=await response.json(),primary=user.email_addresses?.find(email=>email.id===user.primary_email_address_id);
  if(user.id!==mapping.user_id||user.banned||user.locked||primary?.verification?.status!=='verified'||primary.email_address.toLowerCase()!==managed.email.toLowerCase())throw Error('Current verified Clerk identity does not match the source mapping');
  await target.query('begin');await target.query('select pg_advisory_xact_lock(91036,1)');
  const current=(await target.query('select email,status from admin_management.managed_clients where id=$1 for update',[managedId])).rows[0];
  if(current.email!==managed.email||current.status!=='active')throw Error('Management client changed during verification');
  const put=async(table,row,key)=>{
   const names=Object.keys(row);if(!/^[a-z_.]+$/.test(table)||names.some(name=>!/^[a-z_]+$/.test(name)))throw Error('Unexpected local schema');
   await target.query(`insert into ${table} (${names.map(name=>'"'+name+'"').join(',')}) values(${names.map((_,index)=>'$'+(index+1)).join(',')}) on conflict do nothing`,names.map(name=>row[name]));
   const found=(await target.query(`select * from ${table} where "${key}"=$1`,[row[key]])).rows[0];
   if(!found||names.some(name=>JSON.stringify(found[name])!==JSON.stringify(row[name])))throw Error('Existing local identity conflicts; no records overwritten');
  };
  await put('sheet_sync.clients',canonical,'client_id');
  await put('sheet_sync.verified_accounts',verified,'user_id');
  await put('sheet_sync.client_accounts',account,'user_id');
  await put('public.profiles',profile||{id:mapping.user_id,email:verified.email,full_name:verified.full_name,role:'client'},'id');
  await put('sheet_sync.account_directory',{user_id:mapping.user_id,full_name:verified.full_name,email:verified.email,email_verified:true,registration_status:'verified',registered_at:verified.registered_at},'user_id');
  await target.query('insert into admin_management.audit_events(actor,action,target,after_value) values($1,$2,$3,$4)',['local-operator:user-requested','client.source_metadata_import',managedId,JSON.stringify({sourceDatabase:sourceBackup.source,permanentClientId:mapping.client_id,clerkUserId:mapping.user_id})]);
  await target.query('commit');await source.query('rollback');
  const sourceAfter=await fingerprint(sourceBackup.source);assert.deepEqual(sourceAfter,sourceBackup.tables,'Original local source changed');
  const changed=new Set(['sheet_sync.clients','sheet_sync.verified_accounts','sheet_sync.client_accounts','sheet_sync.account_directory','public.profiles','admin_management.audit_events']);
  const unchanged=rows=>rows.filter(row=>!changed.has(row.schemaname+'.'+row.tablename));
  assert.deepEqual(unchanged(await fingerprint(state.database)),unchanged(targetBackup.tables));
  const receipt={managedId,sourceDatabase:sourceBackup.source,targetDatabase:state.database,permanentClientId:mapping.client_id,sourceUnchanged:true,existingIdsPreserved:true,autoLinked:false,verifiedAt:new Date().toISOString()};
  fs.writeFileSync(path.join(root,'.work/super-admin-local/client-source-import-verification.json'),JSON.stringify(receipt,null,2));
  console.log('Existing verified local client metadata copied; source unchanged. Owner must still confirm the identity link in the UI.');
 }catch(error){await target.query('rollback').catch(()=>{});await source.query('rollback').catch(()=>{});throw error;}
 finally{await source.end();await target.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});

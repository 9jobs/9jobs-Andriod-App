// Explicit one-client local repair. No cloud, Sheets, sync or identity changes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {Client}=require('pg');
const {base,backup,fingerprint}=require('./super-admin-backup.cjs');
async function main(){
 const [managedId,sourceName]=process.argv.slice(2);
 assert.match(managedId||'',/^[a-f0-9-]{36}$/i);
 assert.match(sourceName||'',/^9jobs_local_e2e_[a-f0-9]{12}$/);
 const root=path.resolve(__dirname,'../..'),targetName=JSON.parse(fs.readFileSync(path.join(root,'.work/super-admin-local/runtime.json'))).database;
 assert.match(targetName,/^9jobs_local_e2e_sa_[a-f0-9]{12}$/);assert.notEqual(sourceName,targetName);
 const source=new Client({...base,database:sourceName,options:'-c default_transaction_read_only=on'}),target=new Client({...base,database:targetName});
 await source.connect();await target.connect();
 let committed=false;
 try{
  for(const [db,name] of [[source,sourceName],[target,targetName]]){const actual=(await db.query('select current_database() name,host(inet_server_addr()) host,inet_server_port() port')).rows[0];assert.deepEqual(actual,{name,host:'127.0.0.1',port:55439});}
  const beforeSource=await fingerprint(sourceName);
  const snapshot=await backup(targetName);console.log(JSON.stringify({backupVerified:snapshot.verified,backupDirectory:snapshot.directory}));
  const beforeTarget=await fingerprint(targetName);
  await source.query('begin isolation level repeatable read read only');await target.query('begin');
  await target.query('select pg_advisory_xact_lock(91036,1)');
  const identity=(await target.query(`select m.email,l.permanent_client_id as client_id,a.user_id from admin_management.managed_clients m
    join admin_management.client_identity_links l on l.client_id=m.id
    join sheet_sync.client_accounts a on a.client_id=l.permanent_client_id and a.user_id=l.clerk_user_id
    where m.id=$1 and m.status='active' and a.revoked_at is null`,[managedId])).rows;
  assert.equal(identity.length,1,'One verified linked target identity required');const account=identity[0];
  const verified=(await source.query(`select a.user_id,v.email from sheet_sync.client_accounts a join sheet_sync.verified_accounts v on v.user_id=a.user_id where a.client_id=$1 and a.user_id=$2 and a.revoked_at is null`,[account.client_id,account.user_id])).rows;
  assert.equal(verified.length,1);assert.equal(verified[0].email.toLowerCase(),account.email.toLowerCase());
  const questionnaire=(await source.query('select row_to_json(q) data from public.candidate_questionnaires q where user_id=$1',[account.user_id])).rows[0]?.data;
  assert.ok(questionnaire?.completed_at,'Existing completed questionnaire required');
  const put=async(table,row,key)=>{const columns=Object.keys(row);assert.ok(columns.every(c=>/^[a-z_]+$/.test(c)));await target.query(`insert into public.${table} (${columns.join(',')}) values (${columns.map((_,i)=>'$'+(i+1)).join(',')}) on conflict do nothing`,columns.map(c=>row[c]));const found=(await target.query(`select row_to_json(t) data from public.${table} t where ${key}=$1`,[row[key]])).rows[0]?.data;const expected=JSON.parse(JSON.stringify(row));assert.deepEqual(found,expected,'Existing target record conflicts; no overwrite');};
  let documents=0;
  for(const field of ['resume_path','visa_path','enhanced_resume_path']){const storagePath=questionnaire[field];if(!storagePath)continue;assert.ok(storagePath.startsWith(account.user_id+'/'),'Document ownership mismatch');const record=(await source.query('select * from public.questionnaire_documents where storage_path=$1 and user_id=$2',[storagePath,account.user_id])).rows[0];assert.ok(record,'Source document missing');
   await target.query('insert into public.questionnaire_documents(storage_path,user_id,mime_type,content,created_at) values($1,$2,$3,$4,$5) on conflict do nothing',[record.storage_path,record.user_id,record.mime_type,record.content,record.created_at]);
   assert.equal((await target.query('select 1 from public.questionnaire_documents where storage_path=$1 and user_id=$2 and mime_type=$3 and content=$4',[record.storage_path,record.user_id,record.mime_type,record.content])).rowCount,1);documents++;
  }
  await put('candidate_questionnaires',questionnaire,'user_id');
  const unchanged=rows=>rows.filter(r=>!['public.candidate_questionnaires','public.questionnaire_documents'].includes(r.schemaname+'.'+r.tablename));
  // Compare target inside the transaction before commit; all other tables stay untouched.
  for(const table of unchanged(beforeTarget)){const current=(await target.query(`select count(*)::text count,md5(coalesce(string_agg(md5(row_to_json(t)::text),'' order by md5(row_to_json(t)::text)),'')) checksum from "${table.schemaname}"."${table.tablename}" t`)).rows[0];assert.equal(current.count,table.count);assert.equal(current.checksum,table.checksum);}
  await target.query('commit');committed=true;await source.query('rollback');
  assert.deepEqual(await fingerprint(sourceName),beforeSource,'Source database changed');
  const receipt={sourceDatabase:sourceName,targetDatabase:targetName,managedId,userId:account.user_id,completedQuestionnaires:1,documents,sourceUnchanged:true,otherTargetTablesUnchanged:true,backup:snapshot.directory,verifiedAt:new Date().toISOString()};
  fs.writeFileSync(path.join(root,'.work/super-admin-local/questionnaire-import-verification.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
 }catch(e){if(!committed)await target.query('rollback').catch(()=>{});await source.query('rollback').catch(()=>{});throw e;}finally{await source.end();await target.end();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});

// Only synthetic fixtures and 127.0.0.1:55439. No cloud credentials are read.
const fs=require('node:fs/promises'),path=require('node:path');const {Client,Pool}=require('pg');
const {localConfig}=require('./localhost-e2e-config.cjs');
async function main(){
 const {root,directory,state,config}=localConfig();Object.assign(process.env,config);
 const base={host:'127.0.0.1',port:55439,user:'client_id_test',ssl:false,connectionTimeoutMillis:5000};
 const control=new Client({...base,database:'postgres'});await control.connect();
 try{if(!(await control.query('select 1 from pg_database where datname=$1',[state.database])).rowCount)await control.query('create database "'+state.database+'"');}finally{await control.end();}
 const db=new Pool({...base,database:state.database});
 try{
  let schema=await fs.readFile(path.join(root,'mobile/supabase/schema.sql'),'utf8');schema=schema.slice(0,schema.indexOf('insert into system_settings'));
  // These are unnecessary for a fresh isolated schema; preserve all existing triggers on repeat setup.
  schema=schema.replace(/^drop trigger if exists[^;]+;\s*/gm,'').replace(/create trigger ([a-z_]+)\s+before[\s\S]+?execute function set_updated_at\(\);/g,'');
  await db.query(schema);
  await db.query(`alter table conversations add column if not exists chatbot_enabled boolean not null default true;
   alter table messages add column if not exists is_automated boolean not null default false;
   alter table messages add column if not exists sender_type text default 'client';
   create unique index if not exists messages_conversation_client_id on messages(conversation_id,client_message_id);
   create table if not exists cover_letters(id bigint generated always as identity primary key,user_id text unique references profiles(id),content text not null default '',created_at timestamptz default now(),updated_at timestamptz default now());
   create table if not exists website_admin_records(id text primary key,model text not null,payload jsonb not null default '{}',created_at timestamptz default now(),updated_at timestamptz default now());
   insert into system_settings(id) values(1) on conflict do nothing;`);
  require('ts-node/register');const {clientRegistrySchema,importSheetExport}=require('../src/services/sheetStore');await db.query(clientRegistrySchema);
  const file=path.join(directory,'fixture-export.json');
  let report;
  if(!await fs.access(file).then(()=>true,()=>false)){
   const {fixture}=require('../tests/helpers/apps-script-fixture.cjs');const {readClientGeneration}=require('./client-generation.cjs');
   const f=fixture();f.complete();const initial=await readClientGeneration(f.client);const ids=initial.registry.values.slice(1).map(r=>r[0]);
   await fs.writeFile(file,JSON.stringify(initial));const first=await importSheetExport(file,db,true);
   f.complete();const repeated=await readClientGeneration(f.client);
   if(JSON.stringify(ids)!==JSON.stringify(repeated.registry.values.slice(1).map(r=>r[0])))throw new Error('Registry identity changed');
   const model={masters:f.master.sheets.map(s=>({name:s.name,id:s.id,data:s.data})),duplicates:f.duplicate.sheets.map(s=>({name:s.name,id:s.id,data:s.data,maxRows:s.getMaxRows(),maxCols:s.getMaxColumns()})),values:f.values};
   await fs.writeFile(path.join(directory,'fixture-model.json'),JSON.stringify(model));
   report={clients:ids.length,records:first.records,stableRepeatIds:true,initialSnapshot:first.snapshotId};
   await fs.writeFile(path.join(directory,'id-results.json'),JSON.stringify(report,null,2));
  } else {await importSheetExport(file,db,true);report=JSON.parse(await fs.readFile(path.join(directory,'id-results.json'),'utf8'));}
  console.log(JSON.stringify({database:state.database,...report,host:'127.0.0.1',cloudWrites:0}));
 }finally{await db.end();}
}
main().catch(()=>{console.error('Localhost fixture setup failed; existing data retained');process.exitCode=1;});

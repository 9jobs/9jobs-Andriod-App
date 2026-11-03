// Restore only into this task's NEW, empty development database. Never merges/drops.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');const {Client}=require('pg');
const {localConfig}=require('./localhost-e2e-config.cjs');
const target={mode:'neon-development',projectId:'steep-hall-49133624',branchId:'br-restless-resonance-a7df53ga',host:'ep-soft-mud-a77dp1j6.ap-southeast-2.aws.neon.tech',database:'ninejobs_local_migrated'};
function quote(s){return '"'+s.replace(/"/g,'""')+'"';}
async function main(){
 const {root,config}=localConfig(),directory=path.join(root,'.work/neon-local');fs.mkdirSync(directory,{recursive:true});
 const proof=JSON.parse(fs.readFileSync(path.join(root,'.work/localhost-e2e/backups/0c62a772238f/verified-restore.json')));
 if(!proof.verified)throw new Error('Verified local restore required');
 const dump=path.join(root,'.work/localhost-e2e/backups/0c62a772238f/local.dump');
 const frozenUrl=new URL(config.DATABASE_URL);frozenUrl.pathname='/'+proof.restoredDatabase;
 const frozen=new Client({connectionString:frozenUrl.toString()});await frozen.connect();
 let timezone;
 try{
  timezone=(await frozen.query('show timezone')).rows[0].TimeZone;
  const all=(await frozen.query("select table_schema,table_name from information_schema.tables where table_type='BASE TABLE' and table_schema not like 'pg_%' and table_schema<>'information_schema' order by 1,2")).rows;
  proof.tables=[];
  for(const t of all){const values=(await frozen.query(`select count(*)::int as count,md5(coalesce(string_agg(md5(row_to_json(t)::text),'' order by md5(row_to_json(t)::text)),'')) as checksum from ${quote(t.table_schema)}.${quote(t.table_name)} t`)).rows[0];proof.tables.push({table:t.table_schema+'.'+t.table_name,...values});}
 }finally{await frozen.end();}
 const env=require('dotenv').parse(fs.readFileSync(path.join(root,'.env.local'))),url=new URL(env.DATABASE_URL);
 if(!url.hostname.endsWith('.neon.tech'))throw new Error('Existing Neon credential required');
 // Reuse the existing role credential inherited by the new branch; never retrieve/rotate it.
 url.hostname=target.host;url.pathname='/'+target.database;url.searchParams.set('sslmode','verify-full');
 const remote=new Client({connectionString:url.toString(),connectionTimeoutMillis:20000});await remote.connect();
 try{
  const existing=await remote.query("select count(*)::int as n from information_schema.tables where table_type='BASE TABLE' and table_schema not in ('pg_catalog','information_schema')");
  if(existing.rows[0].n!==0 && existing.rows[0].n!==proof.tables.length)throw new Error('Destination must be empty or an exact restored copy; no data is overwritten');
  if(existing.rows[0].n===0){
  const passwordFile=path.join(directory,'restore.pgpass');
  const caFile=path.join(directory,'trusted-roots.pem');fs.writeFileSync(caFile,require('node:tls').rootCertificates.join('\n'));
  const escape=s=>decodeURIComponent(s).replace(/\\/g,'\\\\').replace(/:/g,'\\:');
  fs.writeFileSync(passwordFile,`${target.host}:5432:${target.database}:${escape(url.username)}:${escape(url.password)}\n`,{flag:'wx',mode:0o600});
  try{
   try{execFileSync('C:/Program Files/PostgreSQL/18/bin/pg_restore.exe',['-h',target.host,'-p','5432','-U',decodeURIComponent(url.username),'-d',target.database,'--no-owner','--no-privileges','--single-transaction','--exit-on-error',dump],{windowsHide:true,stdio:'pipe',env:{...process.env,PGPASSFILE:passwordFile,PGSSLMODE:'verify-full',PGSSLROOTCERT:caFile},timeout:300000});}
   catch(error){const diagnostic=String(error.stderr||'restore_failed').replaceAll(decodeURIComponent(url.password),'[redacted]').replace(/postgres(?:ql)?:\/\/\S+/g,'[redacted]');fs.writeFileSync(path.join(directory,'restore-error.txt'),diagnostic);throw error;}
  }finally{fs.unlinkSync(passwordFile);}
  }
  const schemas=(await remote.query("select schema_name from information_schema.schemata where schema_name not in ('public','information_schema') and schema_name not like 'pg_%'")).rows;
  for(const {schema_name} of schemas)await remote.query('revoke all on schema '+quote(schema_name)+' from public');
  await remote.query("select set_config('TimeZone',$1,false)",[timezone]);
  const tables=[];
  for(const t of proof.tables){
   const [schema,name]=t.table.split('.');
   const actual=(await remote.query(`select count(*)::int as count,md5(coalesce(string_agg(md5(row_to_json(t)::text),'' order by md5(row_to_json(t)::text)),'')) as checksum from ${quote(schema)}.${quote(name)} t`)).rows[0];
   if(actual.count!==t.count||actual.checksum!==t.checksum)throw new Error('Neon restore checksum mismatch; activation refused');
   tables.push({table:t.table,...actual});
  }
  // Archive every existing fallback collection without modifying the local source.
  const legacyFile=path.join(root,'.work/localhost-e2e/local_db.json');
  const legacy=fs.existsSync(legacyFile)?JSON.parse(fs.readFileSync(legacyFile,'utf8')):{};
  fs.copyFileSync(legacyFile,path.join(directory,'legacy-backup.json'));
  fs.copyFileSync(path.join(root,'.work/localhost-e2e/platform-credentials.key'),path.join(directory,'platform-credentials.key.backup'));
  await remote.query('create schema if not exists legacy_store; revoke all on schema legacy_store from public; create table if not exists legacy_store.state(id integer primary key check(id=1),payload jsonb not null,updated_at timestamptz not null default now())');
  await remote.query('insert into legacy_store.state(id,payload) values(1,$1)',[JSON.stringify(legacy)]);
  const privateFile=path.join(root,'backend/.env.neon-local');
  fs.writeFileSync(privateFile,'# Private Neon DEVELOPMENT database. Never commit.\nDATABASE_URL='+url.toString()+'\n',{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(directory,'verified-migration.json'),JSON.stringify({...target,verified:true,tables,legacyCollections:Object.fromEntries(Object.entries(legacy).map(([k,v])=>[k,Array.isArray(v)?v.length:0])),dumpSha256:crypto.createHash('sha256').update(fs.readFileSync(dump)).digest('hex')},null,2),{flag:'wx'});
  // Activation is a separate final step after code checks.
  fs.writeFileSync(path.join(directory,'target.json'),JSON.stringify(target,null,2));
  console.log(JSON.stringify({verified:true,tables:tables.length,branch:target.branchId,database:target.database,activated:false}));
 }finally{await remote.end();}
}
main().catch(error=>{const diagnostic={code:error.code,reason:String(error.message||'').replace(/postgres(?:ql)?:\/\/\S+/g,'[redacted]')};fs.mkdirSync(path.resolve(__dirname,'../../.work/neon-local'),{recursive:true});fs.writeFileSync(path.resolve(__dirname,'../../.work/neon-local/migration-error.json'),JSON.stringify(diagnostic));console.error('Neon development migration stopped safely:',/^[A-Z0-9]{5}$/.test(error.code||'')?error.code:'check private migration state; no production fallback');process.exitCode=1;});

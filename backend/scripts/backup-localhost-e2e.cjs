// Local-only restorable backup rehearsal. No cloud target or credentials are accepted.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process'),{Client}=require('pg');
const {config,root,state}=require('./localhost-e2e-config.cjs').localConfig();Object.assign(process.env,config);
require('ts-node/register');require('../src/services/automaticSheetSync').assertIsolatedSyncTarget();
async function main(){
 const suffix=crypto.randomBytes(6).toString('hex'),directory=path.join(root,'.work/localhost-e2e/backups',suffix);fs.mkdirSync(directory,{recursive:true});
 const dump=path.join(directory,'local.dump'),restored='9jobs_local_e2e_restore_'+suffix,bin='C:/Program Files/PostgreSQL/18/bin';
 const base={host:'127.0.0.1',port:55439,user:'client_id_test',ssl:false};
 execFileSync(path.join(bin,'pg_dump.exe'),['-h','127.0.0.1','-p','55439','-U','client_id_test','-d',state.database,'-Fc','-f',dump],{windowsHide:true,stdio:'pipe'});
 const rootDb=new Client({...base,database:'postgres'});await rootDb.connect();await rootDb.query('create database "'+restored+'"');await rootDb.end();
 execFileSync(path.join(bin,'pg_restore.exe'),['-h','127.0.0.1','-p','55439','-U','client_id_test','-d',restored,'--exit-on-error',dump],{windowsHide:true,stdio:'pipe'});
 const before=new Client({...base,database:state.database}),after=new Client({...base,database:restored});await before.connect();await after.connect();
 try{
  const tables=(await before.query("select table_schema,table_name from information_schema.tables where table_type='BASE TABLE' and table_schema in ('public','sheet_sync') order by table_schema,table_name")).rows,proof=[];
  for(const t of tables){
   if(!/^[a-z_][a-z0-9_]*$/.test(t.table_schema)||!/^[a-z_][a-z0-9_]*$/.test(t.table_name))throw new Error('Unexpected table');
   const q=`select count(*)::int as count,md5(coalesce(string_agg(md5(row_to_json(t)::text),'' order by md5(row_to_json(t)::text)),'')) as checksum from "${t.table_schema}"."${t.table_name}" t`;
   const a=(await before.query(q)).rows[0],b=(await after.query(q)).rows[0];
   if(JSON.stringify(a)!==JSON.stringify(b))throw new Error('Restore mismatch');proof.push({table:t.table_schema+'.'+t.table_name,...a});
  }
  fs.writeFileSync(path.join(directory,'verified-restore.json'),JSON.stringify({restoredDatabase:restored,verified:true,tables:proof},null,2));
  console.log(JSON.stringify({verified:true,tables:proof.length,directory,restoredDatabase:restored}));
 }finally{await before.end();await after.end();}
}
main().catch(()=>{console.error('Local backup/restore verification failed; do not activate changes');process.exitCode=1;});

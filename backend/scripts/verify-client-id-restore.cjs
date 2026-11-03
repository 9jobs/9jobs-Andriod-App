// Local-only recovery rehearsal. Never reads DATABASE_URL or cloud credentials.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');const {Client}=require('pg');
async function main(){
 const database=process.argv[2];if(!/^client_ids_[a-f0-9]{12}$/.test(database||''))throw new Error('Explicit local validation database required');
 const config={host:'127.0.0.1',port:55439,user:'client_id_test',ssl:false,connectionTimeoutMillis:5000};
 const directory=path.resolve(__dirname,'../../.work/client-id-validation',database);await fs.mkdir(directory,{recursive:true});
 const suffix=crypto.randomBytes(6).toString('hex'),restore='client_ids_restore_'+suffix;
 const dump=path.join(directory,'backup-'+suffix+'.dump');const bin='C:/Program Files/PostgreSQL/18/bin';
 execFileSync(path.join(bin,'pg_dump.exe'),['-h','127.0.0.1','-p','55439','-U','client_id_test','-d',database,'-Fc','-f',dump],{windowsHide:true,stdio:'pipe'});
 const root=new Client({...config,database:'postgres'});await root.connect();try{await root.query('create database "'+restore+'"');}finally{await root.end();}
 execFileSync(path.join(bin,'pg_restore.exe'),['-h','127.0.0.1','-p','55439','-U','client_id_test','-d',restore,'--exit-on-error',dump],{windowsHide:true,stdio:'pipe'});
 const original=new Client({...config,database}),restored=new Client({...config,database:restore});await original.connect();await restored.connect();
 const evidence=[];
 try{
  const tables=(await original.query("select table_schema,table_name from information_schema.tables where table_schema in ('public','sheet_sync') and table_type='BASE TABLE' order by table_schema,table_name")).rows;
  for(const row of tables){
   if(!/^[a-z_][a-z0-9_]*$/.test(row.table_schema)||!/^[a-z_][a-z0-9_]*$/.test(row.table_name))throw new Error('Unexpected local table name');
   const table='"'+row.table_schema+'"."'+row.table_name+'"',fingerprints=[];
   for(const db of [original,restored]){const rows=(await db.query('select * from '+table)).rows;fingerprints.push({count:rows.length,sha256:crypto.createHash('sha256').update(rows.map(r=>JSON.stringify(r)).sort().join('\n')).digest('hex')});}
   if(JSON.stringify(fingerprints[0])!==JSON.stringify(fingerprints[1]))throw new Error('Restore mismatch');evidence.push({table,...fingerprints[0]});
  }
 }finally{await original.end();await restored.end();}
 const backup=path.resolve(__dirname,'../../.work/client-id-phase3-backup');
 const destination=path.resolve(__dirname,'../../.work/client-id-restored-code');
 const manifest=JSON.parse(await fs.readFile(path.join(backup,'manifest.json'),'utf8'));
 for(const item of manifest){
  const from=path.resolve(backup,item.Path),to=path.resolve(destination,item.Path);
  if(!from.startsWith(backup+path.sep)||!to.startsWith(destination+path.sep))throw new Error('Backup path outside local recovery directory');
  const content=await fs.readFile(from);const hash=crypto.createHash('sha256').update(content).digest('hex').toUpperCase();
  if(hash!==item.SHA256)throw new Error('Backup checksum mismatch');
  await fs.mkdir(path.dirname(to),{recursive:true});await fs.writeFile(to,content);
  if(crypto.createHash('sha256').update(await fs.readFile(to)).digest('hex').toUpperCase()!==hash)throw new Error('Code restore mismatch');
 }
 const cached=await fs.readFile(path.resolve(__dirname,'../../.work/duplicate-sheet-data/latest.json'));
 const cachedHash=crypto.createHash('sha256').update(cached).digest('hex');
 if(cachedHash!=='2d78fd5965b482b69604177c662ab83a1afed0bc30b3eb4381e404d0ec81c458')throw new Error('Cached baseline changed');
 const report={sourceDatabase:database,restoredDatabase:restore,host:'127.0.0.1',tables:evidence,restoredCodeFiles:manifest.length,cachedBaselineSha256:cachedHash,productionBackupVerified:false,liveWrites:0};
 await fs.writeFile(path.join(directory,'restore-evidence.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({restoredTables:evidence.length,restoredCodeFiles:manifest.length,allTableHashesMatch:true,cachedBaselineUnchanged:true,cloudConnections:0}));
}
if(require.main===module)main().catch(()=>{console.error('Local recovery rehearsal failed; existing databases and backups retained');process.exitCode=1;});

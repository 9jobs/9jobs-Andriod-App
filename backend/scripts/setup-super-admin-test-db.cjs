const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Client}=require('pg');
const {execFileSync}=require('node:child_process');
const {base,backup,checked}=require('./super-admin-backup.cjs');
async function setup(){
 const root=path.resolve(__dirname,'../..'),directory=path.join(root,'.work/super-admin-local');fs.mkdirSync(directory,{recursive:true});
 const stateFile=path.join(directory,'runtime.json');if(fs.existsSync(stateFile))throw Error('Isolated target already exists; no reset permitted');
 const c=new Client({...base,database:'postgres'});await c.connect();let database;
 try{const local=(await c.query("select datname from pg_database where datname ~ '^9jobs_local_e2e_[a-f0-9]{12}$'")).rows;for(const r of local)console.log('Existing local backup',await backup(r.datname));database=process.argv[2]||'9jobs_local_e2e_sa_'+crypto.randomBytes(6).toString('hex');checked(database);if(!/^9jobs_local_e2e_sa_[a-f0-9]{12}$/.test(database))throw Error('Isolated management target required');if(!process.argv[2])await c.query(`create database "${database}"`);}finally{await c.end();}
 console.log('Fresh target backup',await backup(database));
 const target=new Client({...base,database});await target.connect();try{const identity=(await target.query('select current_database() as database,host(inet_server_addr()) as address,inet_server_port() as port')).rows[0];if(identity.database!==database||identity.address!=='127.0.0.1'||identity.port!==55439)throw Error('Actual target mismatch');console.log('Verified target',identity);if((await target.query("select 1 from information_schema.tables where table_schema not in ('pg_catalog','information_schema')")).rowCount)throw Error('New empty database required; no reset permitted');const backups=path.join(root,'.work/super-admin-backups');const source=fs.readdirSync(backups).map(name=>path.join(backups,name)).find(dir=>{const file=path.join(dir,'verified.json');if(!fs.existsSync(file))return false;const value=JSON.parse(fs.readFileSync(file,'utf8'));return value.verified&&/^9jobs_local_e2e_[a-f0-9]{12}$/.test(value.source)&&value.tables?.length===44;});if(!source)throw Error('Verified local schema backup required');
 // Restore schema only: no source users, client IDs, jobs or other source rows copied.
 execFileSync('C:/Program Files/PostgreSQL/18/bin/pg_restore.exe',['-h',base.host,'-p',String(base.port),'-U',base.user,'-d',database,'--schema-only','--no-owner','--no-privileges','--exit-on-error',path.join(source,'local.dump')],{windowsHide:true,stdio:'pipe'});
 await target.query(fs.readFileSync(path.join(root,'backend/migrations/001_admin_management.sql'),'utf8'));
 await target.query(fs.readFileSync(path.join(root,'backend/migrations/002_admin_email_approval.sql'),'utf8'));}finally{await target.end();}
 fs.writeFileSync(stateFile,JSON.stringify({database,jwtSecret:crypto.randomBytes(48).toString('hex')},null,2),{flag:'wx'});console.log('Isolated management database ready; owner is UNBOUND.');
}
setup().catch(e=>{console.error(e.message);process.exitCode=1;});

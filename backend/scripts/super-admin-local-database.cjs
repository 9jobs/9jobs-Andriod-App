const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {Client}=require('pg');

async function ensureLocalManagementDatabase(root,database){
 if(!/^9jobs_local_e2e_sa_[a-f0-9]{12}$/.test(database))throw Error('Isolated management database required');
 const verify=async()=>{
  const db=new Client({host:'127.0.0.1',port:55439,user:'client_id_test',database,ssl:false,connectionTimeoutMillis:3000});
  try{
   await db.connect();
   const actual=(await db.query('select current_database() as database,host(inet_server_addr()) as address,inet_server_port() as port')).rows[0];
   if(actual.database!==database||actual.address!=='127.0.0.1'||actual.port!==55439)throw Error('Actual local management target mismatch');
   const ownerCount=(await db.query('select count(*)::int n from admin_management.owner_identity')).rows[0].n;
   if(ownerCount>1)throw Error('Only one protected owner is permitted');
  }finally{await db.end();}
 };
 const waitForRecovery=async()=>{
  const deadline=Date.now()+300000;let nextNotice=0;
  while(Date.now()<deadline){
   try{await verify();return;}catch(error){if(!['ECONNREFUSED','57P03'].includes(error.code))throw error;}
   if(Date.now()>=nextNotice){console.log('Waiting for existing local PostgreSQL recovery; no reset or data deletion.');nextNotice=Date.now()+15000;}
   await new Promise(resolve=>setTimeout(resolve,1000));
  }
  throw Error('Existing PostgreSQL is still recovering. Wait and rerun the local launcher; do not reset the database.');
 };
 try{await verify();return;}catch(error){if(error.code==='57P03'){await waitForRecovery();return;}if(error.code!=='ECONNREFUSED')throw error;}
 const cluster=path.resolve(root,'.work/client-id-postgres');
 if(!fs.existsSync(path.join(cluster,'PG_VERSION')))throw Error('Existing local PostgreSQL cluster missing. No new database or reset will be created.');
 const executable='C:/Program Files/PostgreSQL/18/bin/pg_ctl.exe';
 if(!fs.existsSync(executable))throw Error('Local PostgreSQL 18 is required.');
 let running=false;try{execFileSync(executable,['status','-D',cluster],{windowsHide:true,stdio:'pipe'});running=true;}catch(error){if(error.status!==3)throw error;}
 if(running){await waitForRecovery();return;}
 try{execFileSync(executable,['start','-D',cluster,'-o','-p 55439 -h 127.0.0.1','-l',path.join(root,'.work/super-admin-local/postgres-startup.log'),'-w','-t','20'],{windowsHide:true,stdio:'pipe'});}
 catch(error){if(!fs.existsSync(path.join(cluster,'postmaster.pid')))throw error;}
 await waitForRecovery();
 console.log('Existing local PostgreSQL started and management target verified. No schema or account reset.');
}
module.exports={ensureLocalManagementDatabase};

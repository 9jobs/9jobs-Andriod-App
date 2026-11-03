// One-time operator bulk approval only. Routine logins never run this command.
const fs=require('node:fs'),path=require('node:path');
const {config}=require('./localhost-e2e-config.cjs').localConfig();Object.assign(process.env,config);require('ts-node/register');
async function main(){
 const file=path.resolve(process.argv[2]||'');
 if(!file.startsWith(path.resolve(__dirname,'../../.work')+path.sep)||!file.endsWith('.json'))throw new Error('Private reviewed JSON inside .work required');
 const rows=JSON.parse(fs.readFileSync(file,'utf8'));
 const {assertIsolatedSyncTarget}=require('../src/services/automaticSheetSync');assertIsolatedSyncTarget();
 const {createDatabasePool}=require('../src/lib/database'),{reviewClientEmails,approveClientEmails}=require('../src/services/clientEmailAssociations');
 const db=createDatabasePool();try{
  const plan=await reviewClientEmails(rows,db),report=file+'.review.private.json';fs.writeFileSync(report,JSON.stringify(plan,null,2),{mode:0o600});
  if(process.argv.includes('--approve')){
   const i=process.argv.indexOf('--review-digest'),digest=i<0?'':process.argv[i+1];
   await approveClientEmails(rows,'localhost-operator-explicit-bulk-approval',digest,db);
  }
  console.log(JSON.stringify({associations:plan.rows.length,conflicts:plan.conflicts.length,reviewDigest:plan.digest,applied:process.argv.includes('--approve'),report}));
 }finally{await db.end();}
}
main().catch(()=>{console.error('Bulk onboarding rejected; review local conflicts. No existing mapping was overwritten.');process.exitCode=1;});

// Operator-only; never inherits cloud targets and never writes Google Sheets.
const fs=require('node:fs'),path=require('node:path');
const {localConfig}=require('./localhost-e2e-config.cjs');
const {config}=localConfig();Object.assign(process.env,config);
require('ts-node/register');
const {prepareLocalCandidate,importLocalCandidate}=require('../src/services/localCandidateImport');
const {createDatabasePool}=require('../src/lib/database');
const {approveClientAccount}=require('../src/services/clientRegistry');
async function main(){
 const directory=process.argv[2];if(!directory||!path.resolve(directory).startsWith(path.resolve(__dirname,'../../.work/mahir-local')+path.sep))throw new Error('Private reviewed candidate directory required');
 const source=JSON.parse(fs.readFileSync(path.join(directory,'source.private.json')));
 const approval=JSON.parse(fs.readFileSync(path.join(directory,'mapping-proposal.json')));
 const dry=prepareLocalCandidate(source,approval);
 if(!process.argv.includes('--apply')){console.log(JSON.stringify({dryRun:true,records:dry.rows.length,dates:dry.dates,links:dry.links,clientId:approval.clientId}));return;}
 const db=createDatabasePool();try{
  const result=await importLocalCandidate(source,approval,db);
  const existing=await db.query('select client_id,revoked_at from sheet_sync.client_accounts where user_id=$1',[approval.userId]);
  if(existing.rowCount){if(existing.rows[0].client_id!==approval.clientId||existing.rows[0].revoked_at)throw new Error('Existing account mapping cannot be overwritten');}
  else await approveClientAccount(approval.userId,approval.clientId,approval.approvedBy,db);
  fs.writeFileSync(path.join(directory,'import-result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,mappingApproved:true,localOnly:true}));
 }finally{await db.end();}
}
main().catch(e=>{console.error('Local candidate import rejected: '+e.message);process.exitCode=1;});

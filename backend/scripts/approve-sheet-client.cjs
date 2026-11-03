const fs=require('node:fs');const path=require('node:path');
const config=require('dotenv').parse(fs.readFileSync(path.resolve(__dirname,'../.env.sheets-test.local')));
if(config.SHEET_DATABASE_BRANCH!=='br-dawn-truth-a7n0s78z'||new URL(config.DATABASE_URL).hostname!=='ep-raspy-dream-a7pxtepd-pooler.ap-southeast-2.aws.neon.tech')throw new Error('Isolated test branch required');
Object.assign(process.env,config);require('ts-node/register');
const{createDatabasePool}=require('../src/lib/database');
const{sheetSchema}=require('../src/services/sheetStore');
const{approveSheetEmail}=require('../src/services/sheetEmailMapping');
const [email,candidate]=process.argv.slice(2);
if(!email||!candidate)throw new Error('Usage: node scripts/approve-sheet-client.cjs email "Exact approved candidate"');
(async()=>{const db=createDatabasePool();try{
 await db.query(sheetSchema);
 const result=await approveSheetEmail(email,candidate,'workspace-user-approved:2026-10-31',db);
 console.log(JSON.stringify({email:result.approval.email,candidate:result.approval.candidate_label,candidateRecords:result.candidateRecords,
  verifiedSubjectBound:Boolean(result.approval.resolved_user_id),status:result.approval.revoked_at?'revoked':result.approval.resolved_user_id?'bound':'awaiting_verified_clerk_account'},null,2));
}finally{await db.end()}})().catch(()=>{console.error('Client approval could not be saved; no account access was granted');process.exitCode=1});

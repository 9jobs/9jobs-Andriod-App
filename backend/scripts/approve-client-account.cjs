// Operator-only mapping. No name/email matching and no public claim endpoint.
const fs=require('node:fs/promises');
async function main(){
 if(process.env.CLIENT_ID_MAPPING_ENABLED!=='true' || !process.env.CLIENT_ID_MAPPING_APPROVAL_FILE)throw new Error('Explicit reviewed mapping file required');
 require('./client-operation-target.cjs').assertClientTarget();
 const approval=JSON.parse(await fs.readFile(process.env.CLIENT_ID_MAPPING_APPROVAL_FILE,'utf8'));
 if(approval.action!=='link' || typeof approval.userId!=='string' || typeof approval.clientId!=='string' || typeof approval.approvedBy!=='string')throw new Error('Invalid approval');
 require('ts-node/register');
 const {sheetDb}=require('../src/services/sheetStore');const {approveClientAccount}=require('../src/services/clientRegistry');
 const db=sheetDb();try{await approveClientAccount(approval.userId,approval.clientId,approval.approvedBy,db);console.log('Approved account mapped; no existing account or mapping was overwritten');}finally{await db.end();}
}
if(require.main===module)main().catch(()=>{console.error('Mapping rejected; verify account, registry identity and existing approvals');process.exitCode=1;});

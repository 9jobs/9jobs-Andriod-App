// Explicit operator-only account mirror; never assigns a Client ID.
async function main(){
 if(process.env.CLIENT_ID_ACCOUNT_BACKFILL_ENABLED!=='true')throw new Error('Account backfill is disabled');
 require('./client-operation-target.cjs').assertClientTarget();
 require('ts-node/register');const {sheetDb}=require('../src/services/sheetStore');const {backfillClerkAccounts}=require('../src/services/verifiedAccount');
 const db=sheetDb();try{console.log(JSON.stringify(await backfillClerkAccounts(db)));}finally{await db.end();}
}
if(require.main===module)main().catch(()=>{console.error('Account backfill stopped; earlier accounts preserved, identity conflicts require review');process.exitCode=1;});

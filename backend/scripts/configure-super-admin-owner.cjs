// Operator-only. No default/discovered identity is ever bound implicitly.
const {Client}=require('pg');const fs=require('node:fs'),path=require('node:path');
const {base,checked}=require('./super-admin-backup.cjs');
async function main(){
 if(!process.argv.includes('--confirmed-owner'))throw Error('Explicit owner User ID approval is required before running this operator command');
 const subject=process.argv[2],issuer=process.argv[3];if(!/^user_[a-zA-Z0-9]+$/.test(subject||'')||!/^https:\/\/[a-z0-9-]+\.clerk\.accounts\.dev$/.test(issuer||''))throw Error('Exact development Clerk User ID and issuer required');
 const state=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../.work/super-admin-local/runtime.json'),'utf8'));checked(state.database);
 if(!/^9jobs_local_e2e_sa_[a-f0-9]{12}$/.test(state.database))throw Error('Isolated management target required');
 // This verifies the supplied subject using existing development credentials; no account is created or edited.
 const config=require('dotenv').parse(fs.readFileSync(path.resolve(__dirname,'../.env.local-e2e')));
 const publicConfig=require('dotenv').parse(fs.readFileSync(path.resolve(__dirname,'../../admin-next/.env')));
 const publishable=publicConfig.VITE_CLERK_PUBLISHABLE_KEY||'';
 const configuredIssuer='https://'+Buffer.from(publishable.slice(8),'base64').toString().replace(/\$$/,'');
 if(!publishable.startsWith('pk_test_')||issuer!==configuredIssuer)throw Error('Issuer must match the existing development Clerk instance');
 if(!config.CLERK_SECRET_KEY?.startsWith('sk_test_'))throw Error('Development credentials required');
 const response=await fetch('https://api.clerk.com/v1/users/'+encodeURIComponent(subject),{headers:{Authorization:'Bearer '+config.CLERK_SECRET_KEY},redirect:'error',signal:AbortSignal.timeout(15000)});const user=await response.json();
 const primary=user.email_addresses?.find(e=>e.id===user.primary_email_address_id);if(!response.ok||user.id!==subject||user.banned||user.locked||primary?.verification?.status!=='verified')throw Error('Verified owner identity required');
 const domainsResponse=await fetch('https://api.clerk.com/v1/domains',{headers:{Authorization:'Bearer '+config.CLERK_SECRET_KEY},redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!domainsResponse.ok)throw Error('Development instance issuer verification failed');
 const domainPayload=await domainsResponse.json();const domains=Array.isArray(domainPayload)?domainPayload:domainPayload.data;
 if(!Array.isArray(domains)||!domains.some(domain=>domain.frontend_api_url===issuer&&!domain.is_satellite))throw Error('Clerk issuer does not belong to the verified development instance');
 const c=new Client({...base,database:state.database});await c.connect();try{const actual=(await c.query('select current_database() as database,host(inet_server_addr()) as address,inet_server_port() as port')).rows[0];if(actual.database!==state.database||actual.address!=='127.0.0.1'||actual.port!==55439)throw Error('Actual isolated database target mismatch');await c.query('begin');await c.query('select pg_advisory_xact_lock(91036,1)');if((await c.query('select 1 from admin_management.office_admins where clerk_user_id=$1',[subject])).rowCount)throw Error('Owner cannot be an Office Admin');await c.query('insert into admin_management.owner_identity(singleton,clerk_user_id,issuer) values(true,$1,$2)',[subject,issuer]);await c.query("insert into admin_management.audit_events(actor,action,target) values($1,'owner.bind',$1)",[subject]);await c.query('commit');console.log('Approved verified owner bound to isolated management database.');}catch(e){await c.query('rollback');throw e;}finally{await c.end();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});

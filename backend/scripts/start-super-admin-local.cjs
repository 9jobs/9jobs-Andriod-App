// Starts only the isolated management backend + existing Next app. No sync runners.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const dotenv=require('dotenv');
const root=path.resolve(__dirname,'../..');
const state=JSON.parse(fs.readFileSync(path.join(root,'.work/super-admin-local/runtime.json'),'utf8'));
if(!/^9jobs_local_e2e_sa_[a-f0-9]{12}$/.test(state.database))throw Error('Approved isolated target required');
const privateConfig=dotenv.parse(fs.readFileSync(path.join(root,'backend/.env.local-e2e')));
const publicConfig=dotenv.parse(fs.readFileSync(path.join(root,'admin-next/.env')));
const key=publicConfig.VITE_CLERK_PUBLISHABLE_KEY||'';
if(!key.startsWith('pk_test_')||privateConfig.CLERK_SECRET_KEY&&!privateConfig.CLERK_SECRET_KEY.startsWith('sk_test_'))throw Error('Development Clerk keys only');
const issuer='https://'+Buffer.from(key.slice(8),'base64').toString().replace(/\$$/,'');
const env={...process.env,NODE_ENV:'development',SUPER_ADMIN_ENABLED:'true',SUPER_ADMIN_EMAIL_APPROVAL_ENABLED:'true',LOCAL_DATABASE_MODE:'isolated-e2e',DATABASE_PERSISTENCE:'postgres-only',
 DATABASE_URL:`postgresql://client_id_test@127.0.0.1:55439/${state.database}`,JWT_SECRET:state.jwtSecret,PORT:'3110',
 CLERK_ISSUER:issuer,CLERK_SECRET_KEY:privateConfig.CLERK_SECRET_KEY||'',CLERK_AUTHORIZED_PARTIES:'http://localhost:3001,http://127.0.0.1:3001,http://localhost:3000,http://127.0.0.1:3000',
 SHEET_ADMIN_USER_IDS:'',ADMIN_LOGIN_PASSWORD:'',ADMIN_LOGIN_EMAIL:'',SHEET_INTEGRATION_ENABLED:'true',LOCAL_AUTOMATIC_SHEET_SYNC:'true',
 SUPABASE_URL:'http://127.0.0.1:3110',SUPABASE_KEY:'local-disabled-storage',SUPABASE_SERVICE_ROLE_KEY:'',
 STRIPE_SECRET_KEY:'',STRIPE_WEBHOOK_SECRET:'',GOOGLE_SERVICE_ACCOUNT_JSON:'',GOOGLE_APPLICATION_CREDENTIALS:'',
 VITE_BACKEND_URL:'http://127.0.0.1:3110',NEXT_PUBLIC_BACKEND_URL:'http://127.0.0.1:3110',VITE_CLERK_PUBLISHABLE_KEY:key,
 VITE_SUPABASE_URL:'http://127.0.0.1:3110',VITE_SUPABASE_ANON_KEY:'local-disabled-storage',NEXT_PUBLIC_SHEET_INTEGRATION_ENABLED:'true',SUPER_ADMIN_LOCAL_DIST:'true'};
async function start(){
 await require('./super-admin-local-database.cjs').ensureLocalManagementDatabase(root,state.database);
 if(process.argv.includes('--backend')){Object.assign(process.env,env);require('ts-node/register');require('../src/server');}
else {
 const children=[spawn(process.execPath,[path.join(root,'backend/scripts/super-admin-sheet-sync.cjs'),'--watch'],{cwd:path.join(root,'backend'),env,stdio:'inherit',windowsHide:true}),spawn(process.execPath,[__filename,'--backend'],{cwd:path.join(root,'backend'),env,stdio:'inherit',windowsHide:true}),spawn(process.execPath,[path.join(root,'admin-next/node_modules/next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port','3001'],{cwd:path.join(root,'admin-next'),env,stdio:'inherit',windowsHide:true})];
 console.log('Local management only: http://127.0.0.1:3001/super-admin/login — owner access is checked against the isolated database.');
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>children.forEach(child=>child.kill()));
}

}
start().catch(error=>{console.error('Local startup check:',error.code||error.message);console.error('Local management startup failed. Check the existing PostgreSQL cluster and local ports; no production fallback or database reset was performed.');process.exitCode=1;});

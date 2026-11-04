const fs=require('node:fs');const path=require('node:path');const dotenv=require('dotenv');const crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),directory=path.join(root,'.work/localhost-e2e');
function localConfig(){
 fs.mkdirSync(directory,{recursive:true});
 const file=path.join(root,'backend/.env.local-e2e');
 if(!fs.existsSync(file))fs.writeFileSync(file,'# Private Clerk DEVELOPMENT configuration only. Never commit.\nCLERK_SECRET_KEY=\nSHEET_ADMIN_USER_IDS=\n',{flag:'wx',mode:0o600});
 const privateConfig=dotenv.parse(fs.readFileSync(file));
 if(privateConfig.CLERK_SECRET_KEY && !privateConfig.CLERK_SECRET_KEY.startsWith('sk_test_'))throw new Error('Only an existing Clerk development secret is permitted');
 const stateFile=path.join(directory,'runtime.json');let state;
 if(fs.existsSync(stateFile))state=JSON.parse(fs.readFileSync(stateFile));
 else{state={database:'9jobs_local_e2e_'+crypto.randomBytes(6).toString('hex'),jwtSecret:crypto.randomBytes(48).toString('hex')};fs.writeFileSync(stateFile,JSON.stringify(state),{flag:'wx',mode:0o600});}
 if(!/^9jobs_local_e2e_[a-f0-9]{12}$/.test(state.database))throw new Error('Invalid isolated database');
 const mobile=dotenv.parse(fs.readFileSync(path.join(root,'mobile/.env')));
 const key=mobile.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY||'';if(!key.startsWith('pk_test_'))throw new Error('Clerk development publishable key required');
 const host=Buffer.from(key.slice(8),'base64').toString().replace(/\$$/,'');if(!/^[a-z0-9.-]+$/i.test(host))throw new Error('Invalid Clerk development issuer');
 const allowed=new Set(['CLERK_SECRET_KEY','SHEET_ADMIN_USER_IDS','ADMIN_LOGIN_EMAIL','ADMIN_LOGIN_PASSWORD','LOCAL_SHEET_SYNC_INTERVAL_SECONDS','LOCAL_SHEET_READ_SPACING_MS','GEMINI_API_KEY','GOOGLE_API_KEY','GEMINI_INTERVIEW_MODEL']);
 const config=Object.fromEntries(Object.entries(privateConfig).filter(([name])=>allowed.has(name)));
 const vaultKeyFile=path.join(directory,'platform-credentials.key');
 if(!fs.existsSync(vaultKeyFile)){try{fs.writeFileSync(vaultKeyFile,crypto.randomBytes(32).toString('hex'),{flag:'wx',mode:0o600});}catch(error){if(error.code!=='EEXIST')throw error;}}
 config.PLATFORM_CREDENTIALS_KEY=fs.readFileSync(vaultKeyFile,'utf8').trim();
 Object.assign(config,{DATABASE_URL:`postgresql://client_id_test@127.0.0.1:55439/${state.database}`,LOCAL_DATABASE_MODE:'isolated-e2e',JWT_SECRET:state.jwtSecret,CLERK_ISSUER:'https://'+host,CLERK_AUTHORIZED_PARTIES:'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:8095,http://127.0.0.1:8095',SHEET_INTEGRATION_ENABLED:'true',PORT:'3100',NODE_ENV:'development',SUPABASE_URL:'http://127.0.0.1:3100',SUPABASE_KEY:'local-disabled-storage',SUPABASE_SERVICE_ROLE_KEY:'',STRIPE_SECRET_KEY:'',STRIPE_WEBHOOK_SECRET:''});
 config.LOCAL_AUTOMATIC_SHEET_SYNC='true';
 return {root,directory,state,config,publishableKey:key};
}
module.exports={localConfig};

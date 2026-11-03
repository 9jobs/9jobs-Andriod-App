// Explicit localhost target selection; legacy test scripts keep their loopback DB.
const fs=require('node:fs'),path=require('node:path'),dotenv=require('dotenv');
const {localConfig}=require('./localhost-e2e-config.cjs');
function runtimeConfig(){
 const local=localConfig(),selection=path.join(local.root,'.work/neon-local/active.json');
 if(!fs.existsSync(selection))return local;
 const target=JSON.parse(fs.readFileSync(selection,'utf8'));
 if(target.mode!=='neon-development'||target.branchId!=='br-restless-resonance-a7df53ga'||target.database!=='ninejobs_local_migrated'||target.host!=='ep-soft-mud-a77dp1j6.ap-southeast-2.aws.neon.tech')throw new Error('Unapproved Neon development target');
 const privateEnv=dotenv.parse(fs.readFileSync(path.join(local.root,'backend/.env.neon-local')));
 const url=new URL(privateEnv.DATABASE_URL||'http://invalid');
 if(url.hostname!==target.host||url.pathname!=='/'+target.database||url.username!=='neondb_owner'||!url.password)throw new Error('Neon development target does not match its approved identity');
 url.searchParams.set('sslmode','verify-full');
 return {...local,config:{...local.config,DATABASE_URL:url.toString(),DATABASE_PROVIDER:'neon',DATABASE_PERSISTENCE:'postgres-only',LOCAL_DATABASE_MODE:'neon-development',NEON_DEVELOPMENT_HOST:target.host,NEON_DEVELOPMENT_DATABASE:target.database,NEON_DEVELOPMENT_BRANCH_ID:target.branchId}};
}
module.exports={runtimeConfig};

const {spawn}=require('node:child_process'),path=require('node:path');
const {localConfig}=require('./localhost-e2e-config.cjs');
const {createPhoneBridge,getPrivateLanHost}=require('./local-phone-bridge.cjs');
const {root,publishableKey}=localConfig();
function printPhoneQr(host){
 const {createRequire}=require('node:module');
 const expoRequire=createRequire(require.resolve('@expo/cli/package.json',{paths:[path.join(root,'mobile/node_modules/expo')]}));
 const qr=expoRequire('./build/src/utils/qr');
 const url=`ninejobs://expo-development-client/?url=${encodeURIComponent(`http://${host}:8091`)}`;
 console.log('\nScan this QR with the existing 9JOBS development app (same Wi-Fi):');
 qr.printQRCode(url).print();
 console.log(`Metro: http://${host}:8091\nPhone backend: http://${host}:3101\n`);
}
async function reuseVerifiedPhoneServer(host){
 try{
  const r=await fetch(`http://${host}:3101/health`,{signal:AbortSignal.timeout(2000)});
  if(!r.ok||(await r.json()).localTestEnvironment!==true)return false;
  const m=await fetch('http://127.0.0.1:8091',{headers:{'expo-platform':'android',accept:'application/expo+json'},signal:AbortSignal.timeout(2000)});
  const manifest=await m.json(),asset=manifest.launchAsset?.url;
  if(!asset||new URL(asset).origin!==`http://${host}:8091`)return false;
  const bundle=await fetch(asset,{signal:AbortSignal.timeout(120000)});
  if(!bundle.ok||!(await bundle.text()).includes(`http://${host}:3101`))return false;
  printPhoneQr(host);console.log('Existing verified local phone services are already running.');return true;
 }catch{return false;}
}
async function start(){
const host=process.argv[2]||getPrivateLanHost();
await require('./ensure-localhost-runtime.cjs').ensureLocalhostRuntime();
const health=await fetch('http://127.0.0.1:3100/health',{signal:AbortSignal.timeout(5000)});
if(!health.ok||(await health.json()).localTestEnvironment!==true)throw new Error('Existing isolated local backend must be running');
if(await reuseVerifiedPhoneServer(host))return;
const bridge=createPhoneBridge(host,3101);
bridge.on('error',()=>{console.error('Phone LAN bridge could not start; check local port 3101');process.exitCode=1;});
bridge.on('listening',()=>{
 console.log(`Local phone backend: http://${host}:3101 (existing Clerk authentication required)`);
 const env={...process.env,NODE_OPTIONS:(process.env.NODE_OPTIONS||'')+' --dns-result-order=ipv4first',
  REACT_NATIVE_PACKAGER_HOSTNAME:host,EXPO_PUBLIC_BACKEND_URL:`http://${host}:3101`,EXPO_PUBLIC_SHEET_INTEGRATION_ENABLED:'true',
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:publishableKey,EXPO_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3100/disabled-storage',EXPO_PUBLIC_SUPABASE_ANON_KEY:'local-disabled-storage',EXPO_NO_TELEMETRY:'1'};
 const child=spawn(process.execPath,[path.join(root,'mobile/node_modules/expo/bin/cli'),'start','--dev-client','--host','lan','--port','8091','--clear'],{cwd:path.join(root,'mobile'),env,stdio:'inherit',windowsHide:true});
 // Explicit output also works when Expo suppresses its interactive QR banner.
 printPhoneQr(host);
 child.on('exit',code=>{bridge.close();process.exitCode=code||0;});
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{child.kill();bridge.close();});
});
}
start().catch(error=>{console.error('Local phone startup failed: '+error.message);process.exitCode=1;});

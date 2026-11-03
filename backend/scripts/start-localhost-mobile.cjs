const {spawn}=require('node:child_process');const path=require('node:path');const {localConfig}=require('./localhost-e2e-config.cjs');
const {root,publishableKey}=localConfig();
const env={...process.env,NODE_OPTIONS:(process.env.NODE_OPTIONS||'')+' --dns-result-order=ipv4first',REACT_NATIVE_PACKAGER_HOSTNAME:'127.0.0.1',EXPO_PUBLIC_BACKEND_URL:'http://127.0.0.1:3100',EXPO_PUBLIC_SHEET_INTEGRATION_ENABLED:'true',EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:publishableKey,EXPO_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3100/disabled-storage',EXPO_PUBLIC_SUPABASE_ANON_KEY:'local-disabled-storage',EXPO_NO_TELEMETRY:'1'};
const child=spawn(process.execPath,[path.join(root,'mobile/node_modules/expo/bin/cli'),'start','--dev-client','--host','localhost','--port','8095','--clear'],{cwd:path.join(root,'mobile'),env,stdio:'inherit',windowsHide:true});
child.on('exit',code=>{process.exitCode=code||0;});

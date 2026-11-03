const {spawn}=require('node:child_process');const path=require('node:path');const {localConfig}=require('./localhost-e2e-config.cjs');
const {root,publishableKey,config}=require('./localhost-runtime-config.cjs').runtimeConfig();
const env={...process.env,VITE_BACKEND_URL:'http://127.0.0.1:3100',NEXT_PUBLIC_BACKEND_URL:'http://127.0.0.1:3100',NEXT_PUBLIC_SHEET_INTEGRATION_ENABLED:'true',VITE_CLERK_PUBLISHABLE_KEY:publishableKey,VITE_SUPABASE_URL:'http://127.0.0.1:3100/disabled-storage',VITE_SUPABASE_ANON_KEY:'local-disabled-storage'};
if(config.LOCAL_DATABASE_MODE==='neon-development'){env.DATABASE_URL=config.DATABASE_URL;env.DATABASE_PROVIDER='neon';}
const child=spawn(process.execPath,[path.join(root,'admin-next/node_modules/next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port','3001'],{cwd:path.join(root,'admin-next'),env,stdio:'inherit',windowsHide:true});
child.on('exit',code=>{process.exitCode=code||0;});

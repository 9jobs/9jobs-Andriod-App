const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const file = path.resolve(__dirname,'../.env.sheets-test.local');
let config = dotenv.parse(fs.readFileSync(file));
if(config.SHEET_DATABASE_BRANCH!=='br-dawn-truth-a7n0s78z' || new URL(config.DATABASE_URL).hostname!=='ep-raspy-dream-a7pxtepd-pooler.ap-southeast-2.aws.neon.tech') throw new Error('Isolated test database required');
if(!config.JWT_SECRET){
 fs.appendFileSync(file,'\nJWT_SECRET='+require('node:crypto').randomBytes(48).toString('hex')+'\n');
 config=dotenv.parse(fs.readFileSync(file));
}
Object.assign(process.env,config);
const mobile=dotenv.parse(fs.readFileSync(path.resolve(__dirname,'../../mobile/.env')));
const key=mobile.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY||'';
if(/^pk_(test|live)_/.test(key)){
 const host=Buffer.from(key.replace(/^pk_(test|live)_/,''),'base64').toString().replace(/\$$/,'');
 if(/^[a-zA-Z0-9.-]+$/.test(host))process.env.CLERK_ISSUER='https://'+host;
}
process.env.CLERK_AUTHORIZED_PARTIES='http://localhost:3001,http://127.0.0.1:3001';
require('ts-node/register');
const {createApp}=require('../src/app');
createApp().listen(3100,'127.0.0.1',()=>console.log('Isolated sheet test backend: http://127.0.0.1:3100 (production unchanged)'));

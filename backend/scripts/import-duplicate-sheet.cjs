// Staging review import only. Never uses the production/default database URL.
// Legacy name-only imports require a separate explicit operator opt-in.
if(process.env.LEGACY_SHEET_REVIEW_ENABLED!=='true')throw new Error('Legacy review importer is disabled; use the approved Client ID generation worker');
const path = require('node:path');
const configuration = require('dotenv').parse(require('node:fs').readFileSync(path.resolve(__dirname,'../.env.sheets-test.local')));
if(configuration.SHEET_DATABASE_BRANCH!=='br-dawn-truth-a7n0s78z' || new URL(configuration.DATABASE_URL).hostname!=='ep-raspy-dream-a7pxtepd-pooler.ap-southeast-2.aws.neon.tech') throw new Error('Explicit isolated sheet test branch required');
if(process.env.DATABASE_URL && process.env.DATABASE_URL!==configuration.DATABASE_URL) throw new Error('Refusing inherited database override');
Object.assign(process.env,configuration);
require('ts-node/register');
const {createDatabasePool}=require('../src/lib/database');
const {sheetSchema,importSheetExport}=require('../src/services/sheetStore');
const {acceptsValidation}=require('./sheet-source-consistency.cjs');
(async()=>{
 const db=createDatabasePool();
 try{
  await db.query(sheetSchema);
  const file=path.resolve(__dirname,'../../.work/duplicate-sheet-data/latest.json');
  const source=JSON.parse(require('node:fs').readFileSync(file,'utf8'));
  const publish=process.env.SHEET_PUBLICATION_POLICY==='reconciled-stable-reads-v1'&&acceptsValidation(source);
  console.log(JSON.stringify(await importSheetExport(file,db,publish),null,2));
 }finally{await db.end();}
})().catch(()=>{console.error('Staging sheet import failed; no production records were modified');process.exitCode=1});

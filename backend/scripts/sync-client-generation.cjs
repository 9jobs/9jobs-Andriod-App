// Explicit operator invocation only. Does not install schema, schedule, or deploy.
const fs=require('node:fs/promises');const path=require('node:path');
const {createReadOnlyClient}=require('./inspect-duplicate-sheet.cjs');
const {readClientGeneration}=require('./client-generation.cjs');
async function main(){
 if(process.env.CLIENT_ID_SYNC_ENABLED!=='true')throw new Error('Client ID worker is disabled');
 if(!process.env.CLIENT_ID_EXPORT_DIRECTORY)throw new Error('Private export directory required');
 require('./client-operation-target.cjs').assertClientTarget();
 require('ts-node/register');require('../src/lib/env');
 const directory=path.resolve(process.env.CLIENT_ID_EXPORT_DIRECTORY);
 await fs.mkdir(directory,{recursive:true});
 const target=require('node:crypto').createHash('sha256').update(process.env.DATABASE_URL||'').digest('hex');
 const pointer=path.join(directory,'last-success.json');let known;
 try{const prior=JSON.parse(await fs.readFile(pointer,'utf8'));if(prior.target===target)known=prior.generation;}catch{}
 const credentials=JSON.parse(await fs.readFile(process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_FILE,'utf8'));
 const client=await createReadOnlyClient({spreadsheetId:process.env.GOOGLE_DUPLICATE_SPREADSHEET_ID,credentials,registryProtocol:true});
 const source=await readClientGeneration(client,{knownGeneration:known});
 if(source.unchanged){console.log('Client generation unchanged');return;}
 // Immutable export; a retry must match the existing artifact exactly.
 const content=JSON.stringify(source);
 const file=path.join(directory,source.clientProtocol.generation+'_'+require('node:crypto').createHash('sha256').update(content).digest('hex')+'.json');
 try{await fs.writeFile(file,content,{flag:'wx',mode:0o600});}
 catch(error){if(error.code!=='EEXIST' || await fs.readFile(file,'utf8')!==content)throw new Error('Export conflict');}
 const {sheetDb,importSheetExport}=require('../src/services/sheetStore');
 const db=sheetDb();
 try{const result=await importSheetExport(file,db,true);await fs.writeFile(pointer,JSON.stringify({target,generation:source.clientProtocol.generation}),{mode:0o600});console.log(JSON.stringify({records:result.records,candidates:result.candidates,unchanged:result.unchanged}));}
 finally{await db.end();}
}
if(require.main===module)main().catch(()=>{console.error('Client generation sync failed; prior committed data retained');process.exitCode=1;});

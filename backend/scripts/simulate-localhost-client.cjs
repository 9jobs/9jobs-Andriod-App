const fs=require('node:fs/promises'),path=require('node:path');const {Pool}=require('pg');const {localConfig}=require('./localhost-e2e-config.cjs');
async function main(){
 const {directory,state,config}=localConfig();Object.assign(process.env,config);
 const {fixture}=require('../tests/helpers/apps-script-fixture.cjs'),{readClientGeneration}=require('./client-generation.cjs');
 const model=JSON.parse(await fs.readFile(path.join(directory,'fixture-model.json'),'utf8')),f=fixture();
 f.master.sheets=model.masters.map(r=>{const s=new f.Sheet(r.name,r.id,r.data,true);s.parent=f.master;return s;});
 f.duplicate.sheets=model.duplicates.map(r=>{const s=new f.Sheet(r.name,r.id,r.data);s.parent=f.duplicate;s.maxRows=r.maxRows;s.maxCols=r.maxCols;return s;});
 for(const key of Object.keys(f.values))delete f.values[key];Object.assign(f.values,model.values);
 const before=f.duplicate.getSheetByName('Client_Registry').data.slice(1).map(r=>r[0]);
 if(!f.master.sheets.some(s=>s.id===99)){
  const source=new f.Sheet('Localhost New Test Client',99,[['Name','Localhost New Test Client'],['Password','fixture-not-exported'],['2026-11-02','Position','Company','Link'],['1','New Client Test Role','Local Test Company','https://example.invalid/new-job']],true);source.parent=f.master;f.master.sheets.push(source);
 }
 f.values.CLIENT_TEMPLATE_SIGNATURES=JSON.stringify([f.call('clientClassify_',f.master.sheets[0],{getProperty:k=>f.values[k]??null}).signature]);
 f.complete();const source=await readClientGeneration(f.client);
 const ids=source.registry.values.slice(1).map(r=>r[0]);if(before.some(id=>!ids.includes(id))||new Set(ids).size!==ids.length)throw new Error('ID stability failed');
 require('ts-node/register');const {importSheetExport}=require('../src/services/sheetStore');const db=new Pool({host:'127.0.0.1',port:55439,user:'client_id_test',database:state.database,ssl:false});
 try{
  const file=path.join(directory,'fixture-export.json');await fs.writeFile(file,JSON.stringify(source));const imported=await importSheetExport(file,db,true);
  f.complete();const repeat=await readClientGeneration(f.client);await fs.writeFile(file,JSON.stringify(repeat));const again=await importSheetExport(file,db,true);
  const initial=JSON.parse(await fs.readFile(path.join(directory,'id-results.json'),'utf8'));
  const retained=(await db.query('select count(*)::int as n from sheet_sync.snapshot_records where snapshot_id=$1',[initial.initialSnapshot])).rows[0].n;
  const report={...initial,currentClients:ids.length,currentRecords:imported.records,newClientIdCreated:source.registry.values.some(r=>r[2]==='99'),repeatImportUnchanged:again.unchanged,priorIdsPreserved:before.every(id=>ids.includes(id)),initialSnapshotRecordsRetained:retained,cloudWrites:0};
  if(imported.records!==35123||retained!==35122||!again.unchanged)throw new Error('Record preservation failed');
  await fs.writeFile(path.join(directory,'id-results.json'),JSON.stringify(report,null,2));
  await fs.writeFile(path.join(directory,'fixture-model.json'),JSON.stringify({masters:f.master.sheets.map(s=>({name:s.name,id:s.id,data:s.data})),duplicates:f.duplicate.sheets.map(s=>({name:s.name,id:s.id,data:s.data,maxRows:s.getMaxRows(),maxCols:s.getMaxColumns()})),values:f.values}));
  console.log(JSON.stringify(report));
 }finally{await db.end();}
}
main().catch(()=>{console.error('Synthetic local client simulation failed; previous snapshots retained');process.exitCode=1;});

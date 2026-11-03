const {test}=require('node:test');const assert=require('node:assert/strict');
const {EXPECTED_HEADERS}=require('../scripts/inspect-duplicate-sheet.cjs');
const {readConsistentSource,acceptsValidation}=require('../scripts/sheet-source-consistency.cjs');
function jobs(title='Analyst',sourceRow='6'){
 return{values:[EXPECTED_HEADERS,['Fixture','28/01/2025','1',title,'Company','','','','','','',sourceRow]]};
}
const index={values:[['Candidate (click name)','Total Jobs'],['Fixture','1']]};
async function sample(first,second,indices=[index,index]){
 let calls=0,indexCalls=0,clock=100000;
 const result=await readConsistentSource({allJobs:async()=>[first,second][calls++],candidateIndex:async()=>indices[indexCalls++]},
  {now:()=>clock,wait:async ms=>{clock+=ms;}});
 return{spreadsheetId:'1KM8Jr2zjiGNRJJNorqIQHdlNc9-YMiTx_xmXZizVKvU',...result};
}
test('two reconciled stable samples pass the staged policy and old evidence expires',async()=>{
 const source=await sample(jobs(),jobs());assert.equal(source.sourceValidation.consistent,true);
 assert.equal(acceptsValidation(source,130000),true);assert.equal(acceptsValidation(source,130000+16*60*1000),false);
});
test('content changes, raw Source Row changes or either index mismatch block acceptance',async()=>{
 for(const value of [await sample(jobs(),jobs('Changed')),await sample(jobs(),jobs('Analyst','7')),
  await sample(jobs(),jobs(),[{values:[index.values[0],['Fixture','2']]},index])]){
   assert.equal(value.sourceValidation.consistent,false);assert.equal(acceptsValidation(value,130000),false);
 }
});
test('data edits or fabricated timing after validation do not pass',async()=>{
 const source=await sample(jobs(),jobs());source.allJobs.values[1][4]='Tampered company';assert.equal(acceptsValidation(source,130000),false);
 const fast=await sample(jobs(),jobs());fast.sourceValidation.observedAt=129999;assert.equal(acceptsValidation(fast,130000),false);
});
test('failed or empty source never produces a publishable sample',async()=>{
 await assert.rejects(sample(jobs(),{values:[EXPECTED_HEADERS]}),/empty/);
 await assert.rejects(readConsistentSource({allJobs:async()=>{throw new Error('unavailable')},candidateIndex:async()=>index}),/unavailable/);
});

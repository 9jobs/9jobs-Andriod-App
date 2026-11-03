const test=require('node:test'),assert=require('node:assert/strict');
require('ts-node/register');
const database=require('../src/lib/questionnaireDatabase');
let connects=0,setupAttempts=0,releases=0,failSetup=true;
const pool={
 connect:async()=>{connects++;return {
  query:async sql=>{if(sql.includes('create table')){setupAttempts++;if(failSetup){failSetup=false;throw new Error('Temporary setup failure');}}return {rows:[]};},
  release:()=>{releases++;},
 };},
 query:async()=>({rows:[{user_id:'test-only'}]}),
 end:async()=>{throw new Error('A request must not close the shared pool');},
};
database.questionnairePool=()=>pool;
const {withDocumentDatabase}=require('../src/services/questionnaireDocuments');
const {readStoredQuestionnaires}=require('../src/services/questionnaireStore');

test('failed initialization retries; parallel and repeat reads share one successful setup',async()=>{
 await assert.rejects(withDocumentDatabase(async()=>{}),/Temporary setup failure/);
 const values=await Promise.all([1,2,3].map(value=>withDocumentDatabase(async()=>value)));
 assert.deepEqual(values,[1,2,3]);
 await withDocumentDatabase(async()=>{});
 assert.equal(setupAttempts,2);
 assert.equal(connects,2);
 assert.equal(releases,2);
});
test('questionnaire reads preserve rows and keep pooled connections available',async()=>{
 assert.deepEqual(await readStoredQuestionnaires(),[{user_id:'test-only'}]);
 assert.deepEqual(await readStoredQuestionnaires('test-only'),[{user_id:'test-only'}]);
});

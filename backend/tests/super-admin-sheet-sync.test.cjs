const {test}=require('node:test');const assert=require('node:assert/strict');
const {selectLinkedCandidates}=require('../scripts/super-admin-sheet-sync.cjs');
const source='1KM8Jr2zjiGNRJJNorqIQHdlNc9-YMiTx_xmXZizVKvU';
const link={client_id:'existing-permanent-id',source_spreadsheet_id:source,source_sheet_id:'123'};
test('matches stable sheet IDs instead of duplicate candidate names',()=>{const first={sheetId:'123',name:'Same name'},second={sheetId:'456',name:'Same name'};assert.deepEqual(selectLinkedCandidates([first,second],[link]),[first]);});
test('does not publish unknown clients or infer source identity from a name',()=>{assert.deepEqual(selectLinkedCandidates([{sheetId:'999',name:'Same name'}],[link]),[]);assert.deepEqual(selectLinkedCandidates([{sheetId:'123'}],[]),[]);});
test('rejects a different source spreadsheet or ambiguous stable mapping',()=>{assert.throws(()=>selectLinkedCandidates([],[{...link,source_spreadsheet_id:'master'}]));assert.throws(()=>selectLinkedCandidates([],[link,link]));assert.throws(()=>selectLinkedCandidates([],[{...link,source_sheet_id:'name'}]));});

// Connection-local locks only: no schema/data changes and no cloud connection.
test('worker singleton does not block verified client login associations',async()=>{
 const {Client}=require('pg');const {acquireWorkerLease}=require('../scripts/super-admin-sheet-sync.cjs');
 const config={host:'127.0.0.1',port:55439,user:'client_id_test',database:'postgres',ssl:false,connectionTimeoutMillis:3000};
 const worker=new Client(config),other=new Client(config);
 try{
  await worker.connect();await other.connect();
  assert.equal(await acquireWorkerLease(worker),true);
  assert.equal(await acquireWorkerLease(other),false,'second worker must not run');
  await other.query('begin');await other.query("set local statement_timeout='1000ms'");
  await other.query('select pg_advisory_xact_lock(91035,67)');
  await other.query('rollback');
 }finally{await other.end();await worker.end();}
});

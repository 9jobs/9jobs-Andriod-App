const {test}=require('node:test');const assert=require('node:assert/strict');
const {selectLinkedCandidates}=require('../scripts/super-admin-sheet-sync.cjs');
const source='1KM8Jr2zjiGNRJJNorqIQHdlNc9-YMiTx_xmXZizVKvU';
const link={client_id:'existing-permanent-id',source_spreadsheet_id:source,source_sheet_id:'123'};
test('matches stable sheet IDs instead of duplicate candidate names',()=>{const first={sheetId:'123',name:'Same name'},second={sheetId:'456',name:'Same name'};assert.deepEqual(selectLinkedCandidates([first,second],[link]),[first]);});
test('does not publish unknown clients or infer source identity from a name',()=>{assert.deepEqual(selectLinkedCandidates([{sheetId:'999',name:'Same name'}],[link]),[]);assert.deepEqual(selectLinkedCandidates([{sheetId:'123'}],[]),[]);});
test('rejects a different source spreadsheet or ambiguous stable mapping',()=>{assert.throws(()=>selectLinkedCandidates([],[{...link,source_spreadsheet_id:'master'}]));assert.throws(()=>selectLinkedCandidates([],[link,link]));assert.throws(()=>selectLinkedCandidates([],[{...link,source_sheet_id:'name'}]));});

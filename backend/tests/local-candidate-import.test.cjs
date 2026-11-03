const {test}=require('node:test');const assert=require('node:assert/strict');
process.env.LOCAL_DATABASE_MODE='isolated-e2e';
process.env.DATABASE_URL='postgresql://client_id_test@127.0.0.1:55439/9jobs_local_e2e_fixture';
require('ts-node/register');
const {prepareLocalCandidate}=require('../src/services/localCandidateImport');
const {EXPECTED_HEADERS}=require('../scripts/inspect-duplicate-sheet.cjs');
const {digestSource}=require('../scripts/sheet-source-consistency.cjs');
function fixture(){
 const id='1KM8Jr2zjiGNRJJNorqIQHdlNc9-YMiTx_xmXZizVKvU';
 const approval={approved:true,approvedBy:'isolated-test-operator',userId:'fixture-subject',email:'fixture@example.invalid',candidate:'Fixture Candidate',sourceSpreadsheetId:id,sourceSheetId:'123',clientId:'9JOBS-CL-00000000-0000-4000-8000-000000000001',sourceRecords:1};
 const allJobs={values:[EXPECTED_HEADERS,['Fixture Candidate','22-Aug-2026','1','Source role','Source company','','https://example.invalid/job','Applied','','','','12']]};
 const candidateIndex={values:[['Candidate (click name)','Total Jobs'],['Fixture Candidate','1']]};
 const source={spreadsheetId:id,metadata:{sheets:[{properties:{sheetId:123,title:'Fixture Candidate'}}]},sample:{allJobs,candidateIndex,sourceValidation:{consistent:true,digest:digestSource(allJobs,candidateIndex)}},views:[{sheets:[{properties:{sheetId:123,title:'Fixture Candidate'},data:[{rowData:[{values:[{formattedValue:'22-Aug-2026'}]},{values:[{formattedValue:'1'},{formattedValue:'Source role'},{formattedValue:'Source company'},{formattedValue:'Link',hyperlink:'https://example.invalid/job'},{formattedValue:'Applied'}]}]}]}]}]};
 return{source,approval};
}
test('local source validation reconciles the exact stable tab, multiplicity, original date and actual hyperlink',()=>{
 const{source,approval}=fixture();const first=prepareLocalCandidate(source,approval),second=prepareLocalCandidate(source,approval);
 assert.equal(first.rows.length,1);assert.deepEqual(first,second);assert.equal(first.rows[0].fields[1],'22-Aug-2026');
 assert.equal(first.rows[0].fields[6],'https://example.invalid/job');assert.equal(first.rows[0].source_row,'12');
 const renamed=fixture();renamed.approval.sourceSheetId='124';assert.throws(()=>prepareLocalCandidate(renamed.source,renamed.approval),/identity/);
});
test('duplicate names, missing approval, count drift, and changed hyperlink evidence fail closed',()=>{
 let f=fixture();f.source.metadata.sheets.push({properties:{sheetId:456,title:'Fixture Candidate'}});assert.throws(()=>prepareLocalCandidate(f.source,f.approval),/Ambiguous/);
 f=fixture();f.approval.approved=false;assert.throws(()=>prepareLocalCandidate(f.source,f.approval),/approval/);
 f=fixture();f.approval.sourceRecords=2;assert.throws(()=>prepareLocalCandidate(f.source,f.approval),/count changed/);
 f=fixture();f.source.views[0].sheets[0].data[0].rowData[1].values[3].hyperlink='https://example.invalid/other';assert.throws(()=>prepareLocalCandidate(f.source,f.approval),/differ/);
});

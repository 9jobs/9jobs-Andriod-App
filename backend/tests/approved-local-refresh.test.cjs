const {test}=require('node:test'),assert=require('node:assert/strict');
const {refreshApproval}=require('../scripts/refresh-approved-local-clients.cjs');
const {digestSource,POLICY,QUIET_MS}=require('../scripts/sheet-source-consistency.cjs');
const {DUPLICATE_SPREADSHEET_ID,EXPECTED_HEADERS}=require('../scripts/inspect-duplicate-sheet.cjs');
function fixture(count=2,name='Renamed Candidate'){
 const allJobs={values:[EXPECTED_HEADERS,...Array.from({length:count},(_,i)=>[name,'1-Sep-2026',String(i+1),'Role','Company','','https://example.invalid/'+i,'Applied','','','',''+(i+10)])]};
 const candidateIndex={values:[['Candidate (click name)','Total Jobs'],[name,String(count)]]};
 const now=Date.now();const sample={allJobs,candidateIndex,sourceValidation:{policy:POLICY,consistent:true,quietMs:QUIET_MS,observedAt:now-QUIET_MS,confirmedAt:now,digest:digestSource(allJobs,candidateIndex)}};
 return {source:{metadata:{sheets:[{properties:{sheetId:123,title:name}}]},sample},mapping:{approved_by:'explicit-test-approval',email_verified:true,registration_status:'verified',revoked_at:null,source_spreadsheet_id:DUPLICATE_SPREADSHEET_ID,source_sheet_id:'123',current_count:1,client_id:'9JOBS-CL-00000000-0000-4000-8000-000000000001',user_id:'verified-fixture',email:'fixture@example.invalid'}};
}
test('approved stable tab permits new rows and rename without changing account or permanent ID',()=>{
 const {source,mapping}=fixture();const approval=refreshApproval(source,mapping);
 assert.equal(approval.sourceRecords,2);assert.equal(approval.sourceSheetId,'123');assert.equal(approval.candidate,'Renamed Candidate');
 assert.equal(approval.userId,mapping.user_id);assert.equal(approval.clientId,mapping.client_id);assert.equal(approval.refreshOnly,true);
 assert.deepEqual(refreshApproval(source,mapping),approval);
});
test('unapproved, revoked, unverified, cloud and decreasing sources are held for review',()=>{
 for(const change of [{approved_by:''},{revoked_at:'now'},{email_verified:false},{registration_status:'pending_verification'},{source_spreadsheet_id:'other'},{source_sheet_id:'124'},{current_count:3}]){
  const f=fixture();Object.assign(f.mapping,change);assert.throws(()=>refreshApproval(f.source,f.mapping));
 }
});
test('stale, partial and ambiguous duplicate-name source cannot replace last good data',()=>{
 let f=fixture();f.source.sample.sourceValidation.confirmedAt=Date.now()-3600000;assert.throws(()=>refreshApproval(f.source,f.mapping));
 f=fixture();f.source.sample.sourceValidation.consistent=false;assert.throws(()=>refreshApproval(f.source,f.mapping));
 f=fixture();f.source.sample.candidateIndex.values.push(['Renamed Candidate','2']);assert.throws(()=>refreshApproval(f.source,f.mapping));
});

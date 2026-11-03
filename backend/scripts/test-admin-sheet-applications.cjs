const test=require('node:test'),assert=require('node:assert/strict');
process.env.LOCAL_DATABASE_MODE='isolated-e2e';
require('ts-node/register');
const {readApprovedAdminSheetApplications}=require('../src/services/adminSheetTracker');
function row(id,userId,status='Applied',date='14-Sep-2026'){
 return {id,user_id:userId,full_name:'Same Name',email:userId+'@example.invalid',source_row:'1',fields:['Source candidate',date,'1','Role','Company','','https://example.invalid/job',status,'','','']};
}
test('keeps same-name clients and source record identities separate',async()=>{
 const data=await readApprovedAdminSheetApplications({query:async()=>({rows:[row('record-a','user-a'),row('record-b','user-b')]})});
 assert.equal(data.length,2);assert.notEqual(data[0].id,data[1].id);
 assert.equal(data[0].user_id,'user-a');assert.equal(data[1].user_id,'user-b');
 assert.equal(data[0].profiles.full_name,'Same Name');assert.equal(data[0].jobs.job_link,'https://example.invalid/job');
 assert.equal(data[0].application_date,'2026-09-14');
});
test('does not invent application status or a missing date',async()=>{
 const data=await readApprovedAdminSheetApplications({query:async()=>({rows:[row('no-status','user-a',''),row('bad-date','user-a','Applied','unknown')]})});
 assert.deepEqual(data,[]);
});
test('returns an empty list when no approved source ownership is available',async()=>{
 const data=await readApprovedAdminSheetApplications({query:async()=>({rows:[]})});assert.deepEqual(data,[]);
});

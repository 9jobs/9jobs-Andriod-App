const {test}=require('node:test');
const assert=require('node:assert/strict');
process.env.LOCAL_DATABASE_MODE='isolated-e2e';
process.env.DATABASE_URL='postgresql://client_id_test@127.0.0.1:55439/9jobs_local_e2e_fixture';
require('ts-node/register');
const {sheetApplication,sourceDate,sheetActivity}=require('../src/services/sheetApplications');
const {importLocalCandidate}=require('../src/services/localCandidateImport');

test('source applications preserve dates and only explicit Applied status, with no invented interview or offer data',()=>{
 const job={id:'sheet:fixture',title:'Source role',company:'Source company',job_link:'https://example.invalid/job',description:'Exact source',source_fields:{Recruiter:'Applied','Applied Date':'22-Aug-2026',Email:'recruiter@example.invalid',Contact:'123'}};
 const row=sheetApplication(job,'verified-fixture-subject');
 assert.equal(row.status,'applied');assert.equal(row.application_date,'2026-08-22');
 assert.equal(row.job_id,job.id);assert.equal(row.user_id,'verified-fixture-subject');assert.ok(Number.isSafeInteger(row.id));
 assert.equal(row.id,sheetApplication(job,'verified-fixture-subject').id);
 assert.equal(row.source_fields,job.source_fields);assert.equal(row.offer_received_at,undefined);assert.equal(row.interview_date,undefined);
 assert.equal(sheetApplication({...job,source_fields:{...job.source_fields,Recruiter:''}},'verified-fixture-subject'),null);
 assert.equal(sheetApplication({...job,source_fields:{...job.source_fields,Recruiter:'Some recruiter'}},'verified-fixture-subject'),null);
 assert.equal(sourceDate('31-Feb-2026'),null);assert.equal(sourceDate('1-Sep-2026'),'2026-09-01');
 assert.equal(sourceDate('28/01/2025'),'2025-01-28');assert.equal(sourceDate('31/02/2026'),null);assert.equal(sourceDate('2026-09-01'),'2026-09-01');
 assert.equal(sourceDate('5-August-2026'),'2026-08-05');assert.equal(sourceDate('1-June-2026'),'2026-06-01');
 assert.equal(sourceDate('08/05/2026'),null);assert.equal(sourceDate('04/24/2026'),'2026-04-24');
});

test('outreach statuses remain source evidence, never addresses, dates or responses',()=>{
 const jobs=[{id:'sheet:1',company:'Company',source_fields:{Recruiter:'Applied','Applied Date':'1-Sep-2026',Contact:'Recruiter One',Email:'Sent',Message:'Sent'}},
 {id:'sheet:2',company:'Company',source_fields:{Contact:' recruiter   one ',Message:'Shared'}},
 {id:'sheet:3',source_fields:{Contact:'.',Email:'',Message:''}},
 {id:'sheet:4',source_fields:{Contact:'Recruiter Two',Email:'recruiter@example.invalid'}}];
 const activity=sheetActivity(jobs);
 assert.deepEqual(activity.sourceActivity,{records:4,emailsSent:1,contactsAdded:2,messagesSent:1,messagesShared:1});
 assert.equal(activity.coldEmails[0].sent_at,null);assert.equal(activity.recruiterContacts[0].contact_date,null);
 assert.equal(activity.recruiterContacts[0].application_id,undefined);assert.equal(activity.recruiterContacts[0].response_status,null);
 assert.equal(sheetApplication(jobs[0],'verified').recruiter_email,'');assert.equal(sheetApplication(jobs[0],'verified').recruiter_phone,'');
 assert.deepEqual(sheetActivity(jobs),activity);
});

test('local candidate importer refuses a cloud target before any database operation',async()=>{
 const original=process.env.DATABASE_URL;
 process.env.DATABASE_URL='postgresql://fixture@production.neon.tech/neondb';
 try{await assert.rejects(importLocalCandidate({}, {}, {connect:()=>{throw new Error('Must not connect');}}),/Isolated localhost/);}
 finally{process.env.DATABASE_URL=original;}
});

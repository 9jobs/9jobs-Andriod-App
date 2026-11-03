const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {Client}=require('pg'),{localConfig}=require('./localhost-e2e-config.cjs');
test('Neon compatibility persistence is transactional and preserves existing behavior',async t=>{
 const {config,root}=localConfig();Object.assign(process.env,config);
 const url=new URL(config.DATABASE_URL),database='9jobs_local_e2e_neon_validation_'+crypto.randomBytes(5).toString('hex');
 const admin=new Client({connectionString:config.DATABASE_URL});await admin.connect();await admin.query('create database "'+database+'"');await admin.end();
 url.pathname='/'+database;process.env.DATABASE_URL=url.toString();process.env.DATABASE_PERSISTENCE='postgres-only';
 require('ts-node/register');
 const store=require('../src/lib/postgresLegacyStore'),legacy=require('../src/lib/localDb'),guards=require('../src/lib/database');
 const db=new Client({connectionString:url.toString()});await db.connect();await db.query(store.legacySchema);
 const empty={messages:[],conversations:[],recruiter_contacts:[],interview_prep_sessions:[],interview_prep_responses:[],success_stories:[],profiles:[],candidate_questionnaires:[]};
 await db.query('insert into legacy_store.state(id,payload) values(1,$1)',[JSON.stringify(empty)]);
 const file=path.join(root,'.work/localhost-e2e/local_db.json'),before=fs.readFileSync(file);
 try{
  const session={client_id:'persistence-test-a',interviewer_name:'Test',interviewer_role:'Tester',interviewer_company:'Test',interviewer_avatar_url:'',question_total:4};
  await t.test('session creation and repeat lookup reuse identity',async()=>{const a=await legacy.upsertLocalInterviewPrepSession(session),b=await legacy.getLocalInterviewPrepSession(session.client_id);assert.equal(a.id,b.id);});
  await t.test('parallel response writes retain every record with unique IDs',async()=>{await Promise.all(Array.from({length:20},(_,i)=>legacy.createLocalInterviewPrepResponse({client_id:session.client_id,session_id:1,question_index:i,question_text:'test',question_tags:[],transcript:'test',ai_answer:'test',feedback:'test',clarity_score:0,impact_score:0,structure_score:0})));const rows=await legacy.getLocalInterviewPrepResponses(session.client_id);assert.equal(rows.length,20);assert.equal(new Set(rows.map(r=>r.id)).size,20);});
  await t.test('different clients remain separated',async()=>{await legacy.upsertLocalInterviewPrepSession({...session,client_id:'persistence-test-b'});assert.equal((await legacy.getLocalInterviewPrepResponses('persistence-test-b')).length,0);assert.equal((await legacy.getLocalInterviewPrepSessions('persistence-test-b')).length,1);});
  await t.test('failed operation rolls back its changes',async()=>{await assert.rejects(store.withPostgresLegacyStore(async()=>{const s=store.readPostgresLegacyState();s.profiles.push({id:'must-not-persist'});store.writePostgresLegacyState(s);throw new Error('intentional rollback');}));assert.equal((await legacy.getLocalProfiles()).length,0);});
  await t.test('fresh connection observes committed data',async()=>{await store.closePostgresLegacyStore();assert.equal((await legacy.getLocalInterviewPrepResponses(session.client_id)).length,20);});
  await t.test('production and alternate Neon hosts are rejected',async()=>{const original={url:process.env.DATABASE_URL,mode:process.env.LOCAL_DATABASE_MODE};process.env.LOCAL_DATABASE_MODE='neon-development';process.env.NEON_DEVELOPMENT_BRANCH_ID='br-restless-resonance-a7df53ga';for(const host of ['ep-shiny-boat-a70uy1ap-pooler.ap-southeast-2.aws.neon.tech','untrusted.neon.tech']){process.env.DATABASE_URL='postgresql://test:dummy@'+host+'/ninejobs_local_migrated';assert.throws(()=>guards.assertDevelopmentDatabase());assert.throws(()=>guards.createDatabasePool());}process.env.DATABASE_URL=original.url;process.env.LOCAL_DATABASE_MODE=original.mode;});
  await t.test('JSON file stays byte-for-byte unchanged',async()=>assert.deepEqual(fs.readFileSync(file),before));
 }finally{await store.closePostgresLegacyStore();await db.end();}
});

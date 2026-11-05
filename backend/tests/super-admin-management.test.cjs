// All identities are cryptographic fixtures. Never loads dotenv or calls real Clerk/Sheets.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),http=require('node:http');
const {execFileSync}=require('node:child_process'),{Client}=require('pg'),jwt=require('jsonwebtoken');
require('ts-node/register');
const {base,backup}=require('../scripts/super-admin-backup.cjs');
test('isolated owner / two employees: management, HTTP, sockets, revocation and preservation',async t=>{
 const database='9jobs_local_e2e_sa_'+crypto.randomBytes(6).toString('hex');
 const root=new Client({...base,database:'postgres'});await root.connect();await root.query(`create database "${database}"`);await root.end();
 await backup(database);
 const backupRoot=path.resolve(__dirname,'../../.work/super-admin-backups');
 const candidate=fs.readdirSync(backupRoot).map(name=>path.join(backupRoot,name)).find(dir=>fs.existsSync(path.join(dir,'verified.json'))&&JSON.parse(fs.readFileSync(path.join(dir,'verified.json'))).tables?.length===44);
 assert.ok(candidate,'Verified original LOCAL schema backup is required');
 execFileSync('C:/Program Files/PostgreSQL/18/bin/pg_restore.exe',['-h',base.host,'-p',String(base.port),'-U',base.user,'-d',database,'--schema-only','--no-owner','--no-privileges','--exit-on-error',path.join(candidate,'local.dump')],{windowsHide:true,stdio:'pipe'});
 const url=`postgresql://client_id_test@127.0.0.1:55439/${database}`;
 Object.assign(process.env,{SUPER_ADMIN_ENABLED:'true',SUPER_ADMIN_EMAIL_APPROVAL_ENABLED:'false',LOCAL_DATABASE_MODE:'isolated-e2e',DATABASE_URL:url,JWT_SECRET:crypto.randomBytes(40).toString('hex'),CLERK_ISSUER:'https://fixture-management.clerk.accounts.dev',CLERK_SECRET_KEY:'sk_test_fixture_not_real',CLERK_AUTHORIZED_PARTIES:'http://localhost:3001',SHEET_ADMIN_USER_IDS:'',SHEET_INTEGRATION_ENABLED:'true',LOCAL_AUTOMATIC_SHEET_SYNC:'false',SUPABASE_URL:'http://127.0.0.1:3110',SUPABASE_KEY:'local-disabled-storage'});
 const db=new Client({...base,database});await db.connect();await db.query(fs.readFileSync(path.resolve(__dirname,'../migrations/001_admin_management.sql'),'utf8'));await db.query(fs.readFileSync(path.resolve(__dirname,'../migrations/002_admin_email_approval.sql'),'utf8'));
 const originalFetch=global.fetch,issuer=process.env.CLERK_ISSUER;
 const {privateKey,publicKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048}),key=publicKey.export({format:'jwk'});key.kid=crypto.randomUUID();
 const accounts={'fixture-owner':'owner@example.invalid','fixture-c':'office-c@example.invalid','fixture-a':'office-a@example.invalid','fixture-b':'office-b@example.invalid','fixture-client-a':'client-a@example.invalid','fixture-client-b':'client-b@example.invalid'};
 let banned=false,externalAttempts=0;
 global.fetch=async(input,options)=>{const address=String(input);if(address.startsWith('http://127.0.0.1:'))return originalFetch(input,options);
  if(address===issuer+'/.well-known/jwks.json')return Response.json({keys:[key]});
  if(address.startsWith('https://api.clerk.com/v1/users/')){const id=decodeURIComponent(address.split('/').at(-1));return accounts[id]?Response.json({id,primary_email_address_id:'primary',email_addresses:[{id:'primary',email_address:accounts[id],verification:{status:'verified'}}]}):new Response(null,{status:404});}
  if(address.startsWith('https://api.clerk.com/v1/sessions/')){const id=decodeURIComponent(address.split('/').at(-1));return Response.json({id,user_id:id.replace(/^sid-/,''),status:banned?'revoked':'active',expire_at:Date.now()+600000});}
  externalAttempts++;throw Error('External production/Sheets request forbidden in tests');
 };
 const clerkToken=id=>jwt.sign({sub:id,sid:'sid-'+id,azp:'http://localhost:3001'},privateKey,{algorithm:'RS256',keyid:key.kid,issuer,expiresIn:'10m'});
 const {createApp}=require('../src/app');const server=http.createServer(createApp());
 const {Server}=require('socket.io'),{socketAuthMiddleware}=require('../src/middleware/auth'),{installManagedSockets}=require('../src/superAdmin/socketAccess');
 const io=new Server(server);io.use(socketAuthMiddleware);installManagedSockets(io);
 io.on('connection',socket=>{if(socket.data.management_kind!=='office')socket.join('admins');socket.on('join_conversation',id=>{socket.join('conversation:'+id);socket.emit('joined',id);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const request=(endpoint,token,method='GET',body)=>fetch(origin+'/api'+endpoint,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 async function good(endpoint,token,method='GET',body){const r=await request(endpoint,token,method,body);const result=await r.json();assert.equal(r.ok,true,`${method} ${endpoint}: ${JSON.stringify(result)}`);return result;}
 const exchange=(id,kind)=>good('/'+(kind==='owner'?'super-admin':'office-admin')+'/session',clerkToken(id),'POST');
 const sourceA='9JOBS-CL-'+crypto.randomUUID(),sourceB='9JOBS-CL-'+crypto.randomUUID(),sourcePending='9JOBS-CL-'+crypto.randomUUID();let owner,a,b,adminA,adminB,clientA,clientB;
 try{
 await t.test('real owner remains unbound; no public subject/role bootstrap',async()=>{assert.equal((await request('/super-admin/session',clerkToken('fixture-owner'),'POST',{role:'owner'})).status,403);assert.equal((await db.query('select count(*)::int n from admin_management.owner_identity')).rows[0].n,0);});
 // Fixture owner exists ONLY in this throwaway loopback database.
 await db.query('insert into admin_management.owner_identity values(true,$1,$2,now())',['fixture-owner',issuer]);owner=(await exchange('fixture-owner','owner')).token;
 await t.test('owner adds, edits and activates two independently verified employees',async()=>{adminA=await good('/super-admin/admins',owner,'POST',{name:'Office A',email:accounts['fixture-a']});adminB=await good('/super-admin/admins',owner,'POST',{name:'Office B',email:accounts['fixture-b']});assert.equal(adminA.status,'disabled');for(const [admin,id] of [[adminA,'fixture-a'],[adminB,'fixture-b']]){await good('/super-admin/admins/'+admin.id,owner,'PATCH',{name:admin.name+' updated',clerkUserId:id});await good('/super-admin/admins/'+admin.id+'/activate',owner,'POST');}a=(await exchange('fixture-a','office')).token;b=(await exchange('fixture-b','office')).token;});
 await t.test('duplicate employee emails return a clear conflict without changing the existing record',async()=>{
  const before=(await db.query('select * from admin_management.office_admins where id=$1',[adminA.id])).rows[0];
  const duplicate=await request('/super-admin/admins',owner,'POST',{name:'Do not overwrite',email:' '+accounts['fixture-a'].toUpperCase()+' '});
  assert.equal(duplicate.status,409);const payload=await duplicate.json();assert.equal(payload.code,'ADMIN_EMAIL_EXISTS');assert.equal(payload.existingAdminId,adminA.id);
  assert.deepEqual((await db.query('select * from admin_management.office_admins where id=$1',[adminA.id])).rows[0],before);
  assert.equal((await db.query('select count(*)::int n from admin_management.office_admins')).rows[0].n,2);
 });
 await t.test('Office Admin cannot obtain owner access or manage privileges',async()=>{assert.equal((await request('/super-admin/session',clerkToken('fixture-a'),'POST',{role:'owner',userId:'fixture-owner'})).status,403);for(const endpoint of ['/super-admin/admins','/super-admin/clients','/super-admin/permissions/'+adminA.id])assert.equal((await request(endpoint,a,'POST',{role:'owner'})).status,403);});
 await t.test('owner identity and audit history are protected',async()=>{assert.equal((await request('/super-admin/admins/fixture-owner/disable',owner,'POST')).status,400);await assert.rejects(db.query("update admin_management.owner_identity set clerk_user_id='fixture-a'"),/immutable/);await assert.rejects(db.query("insert into admin_management.office_admins(id,clerk_user_id,name,email) values($1,'fixture-owner','Owner','owner@example.invalid')",[crypto.randomUUID()]),/Owner cannot/);await assert.rejects(db.query('delete from admin_management.audit_events'),/append-only/);});
 await db.query("insert into profiles(id,email,full_name,role) values('fixture-client-a',$1,'Same Name','client'),('fixture-client-b',$2,'Same Name','client')",[accounts['fixture-client-a'],accounts['fixture-client-b']]);
 await db.query("insert into jobs(id,title,company,location,salary,posted_at,description) values('fixture-job-a','Role A','Company A','Remote','fixture','2026-11-04','Fixture A'),('fixture-job-b','Role B','Company B','Remote','fixture','2026-11-04','Fixture B')");
 await db.query("insert into applications(id,user_id,client_id,job_id,status) overriding system value values(90001,'fixture-client-a','fixture-client-a','fixture-job-a','saved'),(90002,'fixture-client-b','fixture-client-b','fixture-job-b','saved')");
 for(const [id,source,tab] of [['fixture-client-a',sourceA,'101'],['fixture-client-b',sourceB,'102']]){await db.query('insert into sheet_sync.clients(client_id,source_spreadsheet_id,source_sheet_id,candidate_name,created_at,last_seen_at) values($1,$2,$3,$4,now(),now())',[source,'fixture-sheet',tab,'Same Name']);await db.query('insert into sheet_sync.verified_accounts(user_id,email,full_name,verified_at) values($1,$2,$3,now())',[id,accounts[id],'Same Name']);await db.query('insert into sheet_sync.client_accounts(user_id,client_id,approved_by) values($1,$2,$3)',[id,source,'fixture-owner']);}
 await t.test('add/edit local clients, duplicate names remain distinct, link source identities explicitly',async()=>{clientA=await good('/super-admin/clients',owner,'POST',{name:'Same Name',email:accounts['fixture-client-a']});clientB=await good('/super-admin/clients',owner,'POST',{name:'Same Name',email:accounts['fixture-client-b']});assert.notEqual(clientA.id,clientB.id);await good('/super-admin/clients/'+clientA.id,owner,'PATCH',{name:'Same Name'});for(const [client,id] of [[clientA,sourceA],[clientB,sourceB]])await good('/super-admin/clients/'+client.id+'/link',owner,'POST',{permanentClientId:id});assert.equal((await request('/super-admin/clients/'+clientA.id+'/link',owner,'POST',{permanentClientId:sourceB})).status,409);});
 await t.test('source picker distinguishes verified, pending, revoked and mismatched client identities',async()=>{
  await db.query('insert into sheet_sync.clients(client_id,source_spreadsheet_id,source_sheet_id,candidate_name,created_at,last_seen_at) values($1,$2,$3,$4,now(),now())',[sourcePending,'fixture-sheet','103','Same Name']);
  const initial=await good('/super-admin/client-sources',owner);
  assert.equal(initial.sources.find(source=>source.client_id===sourceA).verified_email,accounts['fixture-client-a']);
  assert.equal(initial.sources.find(source=>source.client_id===sourceA).verification_status,'verified');
  assert.equal(initial.sources.find(source=>source.client_id===sourcePending).verification_status,'account_pending');
  await db.query("update sheet_sync.client_accounts set revoked_at=now() where user_id='fixture-client-b'");
  const revoked=await good('/super-admin/client-sources',owner);assert.equal(revoked.sources.find(source=>source.client_id===sourceB).verification_status,'revoked');
  await db.query("update sheet_sync.client_accounts set revoked_at=null where user_id='fixture-client-b'");
  const local=await good('/super-admin/clients',owner,'POST',{name:'Unlinked local test'});
  assert.equal((await request('/super-admin/clients/'+local.id+'/link',owner,'POST',{permanentClientId:sourcePending})).status,409);
  assert.equal((await request('/super-admin/clients/'+local.id+'/link',owner,'POST',{permanentClientId:'9JOBS-CL-'+crypto.randomUUID()})).status,404);
  assert.equal((await request('/super-admin/clients/'+local.id+'/link',owner,'POST',{permanentClientId:'made-up-id'})).status,400);
  assert.equal((await request('/super-admin/clients/'+local.id+'/link',owner,'POST',{permanentClientId:sourceA})).status,409);
  assert.equal((await request('/super-admin/clients/'+clientA.id+'/link',owner,'POST',{permanentClientId:sourceA})).status,200);
  assert.equal((await db.query('select count(*)::int n from admin_management.client_identity_links where client_id=$1',[local.id])).rows[0].n,0);
  assert.equal((await request('/super-admin/client-sources',a)).status,403);
 });
 const assign=(admin,entries)=>good('/super-admin/permissions/'+admin.id,owner,'PUT',{assignments:entries});
 await assign(adminA,[{clientId:clientA.id,actions:['client.view','applications.view','messages.view']},{clientId:clientB.id,actions:['client.view']}]);
 await assign(adminB,[{clientId:clientB.id,actions:['client.view','applications.view','applications.update']}]);
 const query=(token,table,method='GET',body,filter='')=>request('/database/query',token,'POST',{table,method,body,query:filter,prefer:'return=representation,count=exact'});
 await t.test('multiple assignments, lists/search/counts/nested rows scope before pagination',async()=>{const r=await query(a,'applications','GET',undefined,'select=*,profiles(*),jobs(*)&order=id.asc&limit=1');assert.equal(r.status,200);assert.equal(r.headers.get('content-range'),'0-0/1');const rows=await r.json();assert.equal(rows.length,1);assert.equal(rows[0].user_id,'fixture-client-a');assert.equal(rows[0].profiles.email,accounts['fixture-client-a']);assert.equal((await (await query(b,'applications')).json())[0].user_id,'fixture-client-b');assert.equal((await (await query(a,'applications','GET',undefined,'user_id=eq.fixture-client-b')).json()).length,0);});
 await t.test('saved flag is visible in the assigned employee saved-jobs list',async()=>{
  await assign(adminB,[{clientId:clientB.id,actions:['client.view','applications.view','applications.update','client.records.add','client.records.edit','jobs.manage']}]);
  const previous=(await db.query('select * from applications where id=90002')).rows[0];
  try{
   const application={...previous,is_saved:true};
   const saved=await good('/admin/tracker/applications',b,'POST',{application});assert.equal(saved.success,true);
   const list=await good('/admin/tracker/saved-jobs',b);assert.equal(list.entries.length,1);assert.equal(list.entries[0].user_id,'fixture-client-b');assert.equal(list.entries[0].is_saved,true);
   assert.equal((await good('/admin/tracker/saved-jobs',a)).entries.some(row=>row.user_id==='fixture-client-b'),false);
   const newJob={id:'fixture-new-saved-job',title:'Saved role',company:'Fixture Company',location:'Local',salary:'Not disclosed',job_type:'Full-time',description:'Fixture only'};
   try{
    const added=await good('/admin/tracker/applications',b,'POST',{application:{...previous,id:undefined,job_id:newJob.id,status:'saved',current_stage:'saved',is_saved:true,is_active:false,applied_at:null},job:newJob});
    assert.equal(added.application.is_saved,true);assert.equal(added.application.applied_at,null);
    assert.equal((await good('/admin/tracker/saved-jobs',b)).entries.some(row=>row.job_id===newJob.id),true);
    const client=jwt.sign({userId:'fixture-client-b',role:'client',identity_verified:true},process.env.JWT_SECRET,{issuer:'9jobs-backend',audience:'9jobs-api',expiresIn:'5m'});
    assert.equal((await query(client,'saved_jobs').then(r=>r.json())).some(row=>row.job_id===newJob.id),true);
    assert.equal((await request('/admin/tracker/applications',a,'POST',{application:{...previous,is_saved:true}})).ok,false);
   }finally{await db.query("delete from saved_jobs where job_id='fixture-new-saved-job'");await db.query("delete from applications where job_id='fixture-new-saved-job'");await db.query("delete from jobs where id='fixture-new-saved-job'");}

  }finally{await db.query('delete from saved_jobs where user_id=$1 and job_id=$2',[previous.user_id,previous.job_id]);await db.query('update applications set is_saved=$2 where id=$1',[previous.id,previous.is_saved]);await assign(adminB,[{clientId:clientB.id,actions:['client.view','applications.view','applications.update']}]);}
 });
 await t.test('view-only cannot edit; permitted employee can update only assigned client',async()=>{assert.equal((await query(a,'applications','PATCH',{status:'applied'},'id=eq.90001')).status,403);assert.equal((await query(b,'applications','PATCH',{status:'applied'},'id=eq.90001')).status,403);assert.equal((await query(b,'applications','PATCH',{status:'applied'},'id=eq.90002')).status,200);assert.equal((await query(b,'profiles','PATCH',{role:'admin'},'id=eq.fixture-client-b')).status,403);assert.equal((await request('/mobile/profile',b,'POST',{profile:{id:'fixture-client-a'}})).status,403);});
 await t.test('employee cannot mutate shared jobs, accounts, source mapping or embedded billing access',async()=>{assert.equal((await request('/admin/client-email-associations',clerkToken('fixture-a'),'POST',{})).status,403);assert.equal((await request('/admin/tracker/jobs',a,'POST',{})).status,403);assert.equal((await request('/admin/personal-info/fixture-client-a',a,'DELETE')).status,403);assert.equal((await query(a,'admins')).status,403);});
 await t.test('existing admin dashboard and application pages retain response contracts with scoped results',async()=>{
  const dashboard=await good('/admin/dashboard',a);assert.equal(dashboard.success,true);assert.equal(dashboard.stats.usersCount,2);assert.equal(dashboard.stats.applicationsCount,1);
  const jobs=await good('/admin/tracker/jobs',b);assert.equal(jobs.success,true);assert.equal(jobs.jobs.length,1);assert.equal(jobs.jobs[0].user_id,'fixture-client-b');
  const messages=await good('/admin/conversations',a);assert.ok(Array.isArray(messages));
  assert.equal((await request('/admin/conversations/fixture-client-b/messages',a)).status,403);
  assert.equal((await request('/admin/conversations/fixture-client-a/messages',a,'POST',{text:'denied',clientMessageId:'test'})).status,403);
  await assign(adminB,[{clientId:clientB.id,actions:['client.view','applications.view','applications.update']}]);
  const update=await good('/admin/tracker/applications/90002',b,'PATCH',{notes:'Scoped authorized update'});assert.equal(update.success,true);assert.equal(update.application.user_id,'fixture-client-b');
  assert.equal((await request('/admin/tracker/saved-jobs',b,'DELETE',{userId:'fixture-client-b',jobId:'fixture-job-b',applicationId:90001,status:'applied'})).status,403);
 });
 await t.test('legacy exchange/tokens and direct saved-job SQL cannot bypass employee scopes',async()=>{
  assert.equal((await request('/auth/token',clerkToken('fixture-a'),'POST',{role:'admin'})).status,403);
  const legacy=jwt.sign({userId:'fixture-a',role:'admin',email:'9jobsapplicationservice@gmail.com',identity_verified:true},process.env.JWT_SECRET,{issuer:'9jobs-backend',audience:'9jobs-api',expiresIn:'2m'});
  assert.equal((await query(legacy,'profiles')).status,401);
  assert.equal((await request('/admin/tracker/saved-jobs',a,'DELETE',{userId:'fixture-client-b',jobId:'fixture-job-b',applicationId:90002,status:'saved'})).status,403);
  assert.equal((await db.query('select count(*)::int n from applications')).rows[0].n,2);
  assert.equal((await request('/super-admin/clients',owner,'POST',{name:'Duplicate email',email:accounts['fixture-client-a']})).status,400);
  assert.equal((await request('/super-admin/clients',owner,'POST',{name:'Bad email',email:'invalid'})).status,400);
  assert.equal((await request('/super-admin/admins/'+adminA.id+'/invite',owner,'POST')).status,409);
 });
 await t.test('Socket.IO checks assigned rooms and disconnects on permission change',async()=>{
  const {io:connect}=require('../../admin-next/node_modules/socket.io-client');const socket=connect(origin,{auth:{token:a},transports:['websocket'],reconnection:false});await new Promise((resolve,reject)=>{socket.once('connect',resolve);socket.once('connect_error',reject);});const denied=new Promise(resolve=>socket.once('socket_error',resolve));socket.emit('join_conversation','fixture-client-b');await denied;assert.ok(!io.sockets.sockets.get(socket.id).rooms.has('admins'));const joined=new Promise(resolve=>socket.once('joined',resolve));socket.emit('join_conversation','fixture-client-a');assert.equal(await joined,'fixture-client-a');const disconnected=new Promise(resolve=>socket.once('disconnect',resolve));await assign(adminA,[{clientId:clientA.id,actions:['client.view']}]);await disconnected;socket.close();assert.equal((await query(a,'messages')).status,200);assert.equal((await (await query(a,'messages')).json()).length,0);
 });
 await t.test('archive/restore preserves identity and never restores permissions implicitly',async()=>{await good('/super-admin/clients/'+clientB.id+'/disable',owner,'POST');assert.equal((await (await query(b,'profiles')).json()).length,0);await good('/super-admin/clients/'+clientB.id+'/archive',owner,'POST');await assign(adminB,[{clientId:clientB.id,actions:[]}]);assert.equal((await (await query(b,'applications')).json()).length,0);await good('/super-admin/clients/'+clientB.id+'/restore',owner,'POST');assert.equal((await (await query(b,'applications')).json()).length,0);const link=(await db.query('select permanent_client_id from admin_management.client_identity_links where client_id=$1',[clientB.id])).rows[0];assert.equal(link.permanent_client_id,sourceB);});
 await t.test('existing client authentication is unchanged by management archive; stale source mappings fail closed',async()=>{
  const client=jwt.sign({userId:'fixture-client-b',role:'client',email:accounts['fixture-client-b'],identity_verified:true},process.env.JWT_SECRET,{issuer:'9jobs-backend',audience:'9jobs-api',expiresIn:'2m'});
  assert.equal((await query(client,'profiles')).status,200);
  assert.equal((await (await query(client,'profiles')).json())[0].id,'fixture-client-b');
  await assign(adminB,[{clientId:clientB.id,actions:['client.view','applications.view']}]);
  await db.query("update sheet_sync.client_accounts set revoked_at=now() where user_id='fixture-client-b'");
  assert.equal((await (await query(b,'profiles')).json()).length,0);
  await db.query("update sheet_sync.client_accounts set revoked_at=null where user_id='fixture-client-b'");
 });
 await t.test('missing application permission is reported as access denial, not an empty tracker',async()=>{
  // Client A was archived/restored without restoring its old access.
  assert.equal((await request('/admin/tracker/applications',a)).status,403);
  assert.equal((await request('/admin/tracker/client-data?clientId=fixture-client-a',a)).status,403);
 });
 await t.test('permission denial is distinct from expired authentication and scoped resume reads remain available',async()=>{
  const denied=await request('/admin/notifications',b);assert.equal(denied.status,403);const body=await denied.json();assert.equal(body.code,'OFFICE_ACCESS_DENIED');assert.ok(!/expired token/i.test(body.error));
  await db.query("insert into resume_scores(user_id,score) values('fixture-client-a',71),('fixture-client-b',83)");
  const resume=await good('/admin/resume-scores',b);assert.deepEqual(resume.resumeScores.map(row=>row.user_id),['fixture-client-b']);assert.equal(resume.resumeScores[0].score,83);
  assert.equal((await good('/admin/resume-scores',owner)).resumeScores.length,2);
  assert.equal((await request('/admin/resume-scores','invalid-token')).status,401);
 });
 await t.test('active employees manage stories while client users only read published stories',async()=>{
  await db.query("insert into success_stories(id,name,position,year,message,is_active) values('fixture-public-story','Published','Role','2026','Published message',true),('fixture-hidden-story','Draft','Role','2026','Private draft',false)");
  const result=await good('/office-admin/success-stories',b);assert.equal(result.readOnly,false);assert.equal(result.stories.length,2);
  const story={id:'fixture-crud-story',name:'Test Story',position:'Engineer',year:'2026',message:'Created',story_rate:5,display_order:7,is_active:true,photo_url:''};
  assert.equal((await good('/admin/success-stories',b,'POST',{story})).story.name,story.name);
  assert.equal((await good('/admin/success-stories',b,'POST',{story:{...story,message:'Updated',is_active:false}})).story.message,'Updated');
  assert.equal((await good('/admin/success-stories',b)).stories.find(x=>x.id===story.id).is_active,false);
  const client=jwt.sign({userId:'fixture-client-b',role:'client',email:accounts['fixture-client-b'],identity_verified:true},process.env.JWT_SECRET,{issuer:'9jobs-backend',audience:'9jobs-api',expiresIn:'5m'});
  assert.equal((await request('/admin/success-stories',client,'POST',{story})).status,403);
  assert.equal((await request('/admin/success-stories/'+story.id,client,'DELETE')).status,403);
  const visible=await query(client,'success_stories');assert.equal(visible.status,200);assert.deepEqual((await visible.json()).map(x=>x.id),['fixture-public-story']);
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=','base64');
  const uploaded=await fetch(origin+'/api/admin/success-stories/photo',{method:'POST',headers:{Authorization:'Bearer '+b,'Content-Type':'image/png','x-file-name':'fixture.png','x-file-type':'image/png'},body:png});
  assert.equal(uploaded.status,200);const photo=(await uploaded.json()).url;assert.ok(photo.startsWith('data:image/png;base64,'));
  await good('/admin/success-stories',b,'POST',{story:{...story,photo_url:photo}});
  assert.equal((await query(client,'success_stories').then(r=>r.json())).some(x=>x.id===story.id),true);
  assert.equal((await good('/admin/success-stories/'+story.id,b,'DELETE')).success,true);
  assert.equal((await db.query('select count(*)::int n from success_stories')).rows[0].n,2);
  assert.equal((await request('/office-admin/success-stories','invalid-token')).status,401);
  await good('/super-admin/admins/'+adminB.id+'/disable',owner,'POST');
  assert.equal((await request('/admin/success-stories',b,'POST',{story})).status,401);
  await good('/super-admin/admins/'+adminB.id+'/activate',owner,'POST');
 });
 await t.test('disabled and revoked employees cannot reuse stale tokens or raw Clerk sessions',async()=>{await good('/super-admin/admins/'+adminA.id+'/disable',owner,'POST');assert.equal((await query(a,'profiles')).status,401);assert.equal((await request('/office-admin/session',clerkToken('fixture-a'),'POST')).status,403);await good('/super-admin/admins/'+adminA.id+'/activate',owner,'POST');await good('/super-admin/admins/'+adminA.id+'/revoke',owner,'POST');assert.equal((await query(a,'profiles')).status,401);});
 await t.test('revoked Clerk sessions are rejected independently of local grants',async()=>{banned=true;assert.equal((await request('/super-admin/clients',owner)).status,403);banned=false;});
 await t.test('owner email approval replaces manual IDs, with no privilege before verified employee login',async()=>{
  process.env.SUPER_ADMIN_EMAIL_APPROVAL_ENABLED='true';
  const mail=require('../src/superAdmin/approvalEmail');const originalMailer=mail.createApprovalMailer;const delivered=[];
  mail.createApprovalMailer=()=>async message=>{delivered.push(message);};
  try {
   const employee=await good('/super-admin/admins',owner,'POST',{name:'Office C',email:accounts['fixture-c']});
   assert.equal((await request('/office-admin/session',clerkToken('fixture-c'),'POST')).status,403);
   assert.equal((await request('/super-admin/admins/'+employee.id+'/activate',owner,'POST')).status,409);
   assert.equal((await request('/super-admin/admins/'+employee.id+'/request-approval',b,'POST')).status,403);
   const pending=await good('/super-admin/admins/'+employee.id+'/request-approval',owner,'POST');
   assert.equal(delivered.length,1);assert.equal(delivered[0].to,accounts['fixture-owner']);assert.equal(delivered[0].employeeEmail,accounts['fixture-c']);
   assert.ok(!JSON.stringify(pending).includes(delivered[0].code));
   const stored=(await db.query('select * from admin_management.admin_approval_challenges where id=$1',[pending.challengeId])).rows[0];assert.notEqual(stored.code_hash,delivered[0].code);
   assert.equal((await request('/super-admin/admins/'+employee.id+'/request-approval',owner,'POST')).status,429);
   const verify=(id,code)=>request('/super-admin/admins/'+employee.id+'/verify-approval',owner,'POST',{challengeId:id,code});
   const wrong=delivered[0].code==='000000'?'000001':'000000';assert.equal((await verify(pending.challengeId,wrong)).status,401);
   assert.equal((await db.query('select attempts from admin_management.admin_approval_challenges where id=$1',[pending.challengeId])).rows[0].attempts,1);
   assert.equal((await request('/office-admin/session',clerkToken('fixture-c'),'POST')).status,403);
   const confirmed=await verify(pending.challengeId,delivered[0].code);assert.equal(confirmed.status,200);assert.equal((await confirmed.json()).admin.clerk_user_id,null);
   assert.equal((await verify(pending.challengeId,delivered[0].code)).status,409);
   const session=await exchange('fixture-c','office');assert.equal(session.access.kind,'office');assert.equal((await db.query('select clerk_user_id from admin_management.office_admins where id=$1',[employee.id])).rows[0].clerk_user_id,'fixture-c');
   assert.deepEqual(await (await query(session.token,'profiles')).json(),[]);
   await good('/super-admin/admins/'+employee.id+'/disable',owner,'POST');assert.equal((await query(session.token,'profiles')).status,401);
   await db.query("update admin_management.admin_approval_challenges set created_at=now()-interval '2 minutes' where admin_id=$1",[employee.id]);
   const expired=await good('/super-admin/admins/'+employee.id+'/request-approval',owner,'POST');
   await db.query("update admin_management.admin_approval_challenges set expires_at=now()-interval '1 second',created_at=now()-interval '2 minutes' where id=$1",[expired.challengeId]);assert.equal((await verify(expired.challengeId,delivered.at(-1).code)).status,409);
   const locked=await good('/super-admin/admins/'+employee.id+'/request-approval',owner,'POST');const valid=delivered.at(-1).code;const invalid=valid==='111111'?'111112':'111111';
   for(let i=0;i<5;i++)assert.equal((await verify(locked.challengeId,invalid)).status,401);
   assert.equal((await verify(locked.challengeId,valid)).status,423);
   assert.equal((await db.query('select status from admin_management.office_admins where id=$1',[employee.id])).rows[0].status,'disabled');
   await db.query("update admin_management.admin_approval_challenges set created_at=now()-interval '2 minutes' where id=$1",[locked.challengeId]);
   const stale=await good('/super-admin/admins/'+employee.id+'/request-approval',owner,'POST');const staleCode=delivered.at(-1).code;
   await good('/super-admin/admins/'+employee.id,owner,'PATCH',{name:'Changed employee details'});
   assert.equal((await verify(stale.challengeId,staleCode)).status,409);
   await db.query("update admin_management.admin_approval_challenges set created_at=now()-interval '2 minutes' where id=$1",[stale.challengeId]);
   mail.createApprovalMailer=()=>async()=>{throw Error('fake delivery failure');};
   assert.equal((await request('/super-admin/admins/'+employee.id+'/request-approval',owner,'POST')).status,503);
   assert.equal((await db.query('select status from admin_management.office_admins where id=$1',[employee.id])).rows[0].status,'disabled');
   const audit=await db.query("select before_value,after_value from admin_management.audit_events where target=$1",[employee.id]);for(const message of delivered)assert.ok(!JSON.stringify(audit.rows).includes(message.code));
  } finally {mail.createApprovalMailer=originalMailer;process.env.SUPER_ADMIN_EMAIL_APPROVAL_ENABLED='false';}
 });
 await t.test('owner staff table returns assigned client access without passwords',async()=>{const result=await good('/super-admin/admins',owner);assert.ok(result.admins.length>=2);for(const employee of result.admins){assert.ok(Array.isArray(employee.assignments));assert.equal(Object.keys(employee).some(key=>/password|secret|token/i.test(key)),false);for(const assignment of employee.assignments){assert.ok(assignment.clientId);assert.ok(Array.isArray(assignment.actions));}}assert.equal((await request('/super-admin/admins',a)).status,403);});
 await t.test('no real external calls, existing fixture records or permanent IDs deleted',async()=>{assert.equal(externalAttempts,0);assert.equal((await db.query('select count(*)::int n from profiles')).rows[0].n,2);assert.equal((await db.query('select count(*)::int n from jobs')).rows[0].n,2);assert.equal((await db.query('select count(*)::int n from applications')).rows[0].n,2);assert.deepEqual((await db.query('select client_id from sheet_sync.clients order by client_id')).rows.map(x=>x.client_id),[sourceA,sourceB,sourcePending].sort());assert.equal((await db.query('select clerk_user_id from admin_management.owner_identity')).rows[0].clerk_user_id,'fixture-owner');});
 console.log('Preserved isolated fixture database:',database);
 }finally{global.fetch=originalFetch;await new Promise(r=>io.close(r));await new Promise(r=>server.close(r));await db.end();await require('../src/superAdmin/store').closeManagementDb();await require('../src/lib/neonRest').closeNeonRestPool();await require('../src/services/sheetStore').sheetDb().end();}
});

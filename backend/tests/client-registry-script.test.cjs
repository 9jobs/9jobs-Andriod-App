const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {fixture}=require('./helpers/apps-script-fixture.cjs');const {readClientGeneration}=require('../scripts/client-generation.cjs');
test('65 clients / 35122 jobs: permanent registry, lossless generations, repeat, rename, new, zero and duplicate names',async()=>{
 const f=fixture();const baseline=JSON.stringify(f.duplicate.sheets.map(s=>s.data));const master=JSON.stringify(f.master.sheets.map(s=>s.data));
 const dry=f.call('dryRunClientRegistry');assert.equal(dry.length,65);assert.equal(f.duplicate.getSheetByName('Client_Registry'),null);
 f.complete();const first=await readClientGeneration(f.client);assert.equal(first.allJobs.values.length-1,35122);
 const ids=first.registry.values.slice(1).map(r=>r[0]);assert.equal(new Set(ids).size,65);assert.ok(ids.every(id=>/^9JOBS-CL-/.test(id)));
 assert.ok(!JSON.stringify(first.allJobs).includes('fixture-do-not-import'));assert.equal(first.allJobs.values[1][10],'=literal source text');
 const sheetCount=f.duplicate.sheets.length;f.complete();const repeat=await readClientGeneration(f.client);
 assert.deepEqual(repeat.registry.values.slice(1).map(r=>r[0]),ids);assert.equal(repeat.allJobs.values.length-1,35122);assert.equal(f.duplicate.sheets.length,sheetCount);
 f.master.sheets[0].name='Renamed';f.complete();const rename=await readClientGeneration(f.client);assert.equal(rename.registry.values[1][0],ids[0]);
 f.master.sheets[1].name='Renamed'; // Same display label, distinct stable source IDs.
 f.master.sheets.push(new f.Sheet('New Candidate',99,[['Name','New Candidate'],['2026-11-02','Position','Company','Link']],true));
 f.master.sheets.push(new f.Sheet('Helper',100,[['2026-11-02','Position','Company','Link']],true));
 f.master.sheets.push(new f.Sheet('New With Jobs',101,[['Name','New With Jobs'],['2026-11-02','Position','Company','Link'],['1','New Role','New Company','https://example.invalid/new']],true));
 // Approved template recognizes future zero-job candidates without approving helper sheets.
 f.values.CLIENT_TEMPLATE_SIGNATURES=JSON.stringify([f.call('clientClassify_',f.master.sheets.find(s=>s.id===99),{getProperty:k=>f.values[k]??null}).signature]);
 f.complete();const added=await readClientGeneration(f.client);assert.equal(added.registry.values.length-1,67);assert.equal(added.registry.values.find(r=>r[2]==='99')[3],'New Candidate');assert.ok(!added.registry.values.some(r=>r[2]==='100'));
 assert.notEqual(added.registry.values.find(r=>r[2]==='1')[0],added.registry.values.find(r=>r[2]==='2')[0]);
 assert.ok(f.duplicate.getSheetByName('Client_Registry_Review').data.some(r=>r[1]==='100' && r[4]==='needs_review'));
 assert.equal(added.allJobs.values.length-1,35123);assert.equal(JSON.stringify(f.duplicate.sheets.slice(0,3).map(s=>s.data)),baseline);
 // Only the deliberate fixture renames/new sheets changed source metadata; no source cell writes.
 assert.equal(JSON.stringify(f.master.sheets.slice(0,65).map(s=>s.data)),master);assert.ok(f.master.sheets.every(s=>s.writes===0));
 assert.deepEqual(f.triggers.map(t=>t.getUniqueId()),['two-hour','backup']);
});
test('interrupted chunks resume; changed sources abort safely and can restart without losing IDs',async()=>{
 const f=fixture({candidates:2,records:600});f.complete();const old=await readClientGeneration(f.client);
 assert.equal(f.call('clientSyncStep_',4),false);const state=f.values.CLIENT_SYNC_STATE;
 f.call('clientSyncStep_',1);assert.equal((await readClientGeneration(f.client)).clientProtocol.generation,old.clientProtocol.generation);
 f.complete();assert.equal((await readClientGeneration(f.client)).allJobs.values.length-1,600);
 f.call('clientSyncStep_',7);f.master.sheets[0].data[3][1]='Changed during run';assert.equal(f.call('clientSyncStep_',20),false);
 assert.equal((await readClientGeneration(f.client)).allJobs.values.length-1,600);assert.equal(f.values.CLIENT_SYNC_STATE,undefined);
 assert.ok(f.duplicate.getSheetByName('Client_Sync_Log').data.some(r=>r[1]==='ABORTED'));
 f.call('clientSyncStep_',1);
 f.values.CLIENT_SYNC_ENABLED='false';f.call('abandonIncompleteClientGeneration');assert.equal(f.values.CLIENT_SYNC_STATE,undefined);
 assert.ok(state);assert.equal(f.duplicate.getSheetByName('Client_Registry').data.length,3);
});
test('script has no destructive spreadsheet methods and local UI markup is unchanged',()=>{
 const script=fs.readFileSync(path.join(__dirname,'../apps-script/ClientSync.gs'),'utf8');
 assert.doesNotMatch(script,/\.(?:clear|clearContents|deleteRows|deleteSheet|deleteColumns)\s*\(/);
 const root=path.resolve(__dirname,'../..');const backup=path.join(root,'.work/client-id-phase3-backup');
 const old=fs.readFileSync(path.join(backup,'admin-next/src/App.tsx'),'utf8');const current=fs.readFileSync(path.join(root,'admin-next/src/App.tsx'),'utf8');
 // Authentication transport can change; all existing JSX/layout must match.
 const hash=text=>require('node:crypto').createHash('sha256').update(text.replace(/\r\n/g,'\n')).digest('hex');
 const ts=require('typescript');
 const jsx=text=>{const source=ts.createSourceFile('App.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const nodes=[];function walk(node){if(ts.isJsxElement(node)||ts.isJsxSelfClosingElement(node)||ts.isJsxFragment(node)){nodes.push(node.getText(source));return;}ts.forEachChild(node,walk);}walk(source);return JSON.stringify(nodes);};
 assert.equal(hash(jsx(current)),hash(jsx(old)));
 const previousProvider=fs.readFileSync(path.join(backup,'mobile/providers/SessionProvider.tsx'),'utf8');
 const provider=fs.readFileSync(path.join(root,'mobile/providers/SessionProvider.tsx'),'utf8');
 assert.equal(hash(provider.replace(/\r\n/g,'\n').replace(', registerBackendSession, hasBackendSession','').replace('if (!sessionUser || !hasBackendSession(sessionUser.id))','if (!sessionUser)').replace('    const clearSheet = registerSheetSession(user.id, () => getToken());\n    const clearBackend = registerBackendSession(user.id, () => getToken());\n    return () => { clearSheet(); clearBackend(); };','    return registerSheetSession(user.id, () => getToken());')),hash(previousProvider));
});
test('separate candidate refresh resumes append-only views and preserves the two-hour and daily backup triggers',()=>{
 const f=fixture({candidates:2,records:12});f.call('hourlySyncStaged');
 const continuation=f.triggers.find(t=>t.getHandlerFunction()==='syncCandidateViewsAuto');assert.ok(continuation);
 assert.ok(f.values.CLIENT_VIEW_STATE);assert.equal(f.call('clientViewStep_',1),false);
 const firstView=JSON.stringify(f.duplicate.getSheetByName('Client_View_1').data);
 f.call('syncCandidateViewsAuto',{triggerUid:continuation.getUniqueId()});assert.equal(f.values.CLIENT_VIEW_STATE,undefined);
 assert.equal(JSON.stringify(f.duplicate.getSheetByName('Client_View_1').data),firstView);
 assert.ok(f.duplicate.getSheetByName('Client_View_2'));assert.deepEqual(f.triggers.map(t=>t.getUniqueId()),['two-hour','backup']);
 f.values.CLIENT_SYNC_ENABLED='false';const saved=JSON.stringify(f.duplicate.sheets.map(s=>s.data));f.call('hourlySyncStaged');assert.equal(JSON.stringify(f.duplicate.sheets.map(s=>s.data)),saved);
});
test('successful writes with lost responses retry without duplicated parts or candidate rows',async()=>{
 const f=fixture({candidates:2,records:600});f.call('clientSyncStep_',3);const ids=JSON.stringify(f.duplicate.getSheetByName('Client_Registry').data.map(r=>r[0]));
 f.duplicate.failNextDataWriteAfter=true;assert.throws(()=>f.call('clientSyncStep_',1),/response loss/);
 while(!f.call('clientSyncStep_',20)){};
 assert.equal((await readClientGeneration(f.client)).allJobs.values.length-1,600);
 f.duplicate.failNextViewWriteAfter=true;assert.throws(()=>f.call('clientViewStep_',1),/response loss/);
 while(!f.call('clientViewStep_',20)){};
 assert.equal(f.duplicate.getSheetByName('Client_View_1').data.length-1,300);
 assert.equal(f.duplicate.getSheetByName('Client_View_2').data.length-1,300);
 assert.equal(JSON.stringify(f.duplicate.getSheetByName('Client_Registry').data.map(r=>r[0])),ids);
});
test('operator commands require an explicit matching database host before credentials or network work',()=>{
 const {assertClientTarget}=require('../scripts/client-operation-target.cjs');
 for(const config of [{},{DATABASE_URL:'postgresql://127.0.0.1/test'},{DATABASE_URL:'postgresql://cloud.example.invalid/test',CLIENT_ID_DATABASE_HOST:'127.0.0.1'}])assert.throws(()=>assertClientTarget(config),/Explicit/);
 assert.doesNotThrow(()=>assertClientTarget({DATABASE_URL:'postgresql://127.0.0.1/test',CLIENT_ID_DATABASE_HOST:'127.0.0.1'}));
});

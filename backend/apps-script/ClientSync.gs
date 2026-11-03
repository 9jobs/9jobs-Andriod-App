/* LOCAL REVIEW PATCH: replace Code.gs only after production approval.
 * Never run the old clearing implementation alongside this file.
 * No source writes, no existing view rewrites, no destructive cleanup.
 */
const CLIENT_SYNC = Object.freeze({
  master: '1PRAH1qR9PyJtlUjHyfcq3eN2LiU2ERLaVaLRM5nkd2Y',
  duplicate: '1KM8Jr2zjiGNRJJNorqIQHdlNc9-YMiTx_xmXZizVKvU',
  registry: 'Client_Registry', manifest: 'Client_Sync_Manifest', log: 'Client_Sync_Log',
  chunk: 250, budgetMs: 180000,
  headers: ['Candidate','Applied Date','Serial No','Position','Company','Company URL','Job Link','Recruiter','Contact','Email','Message','Source Row'],
  registryHeaders: ['Client_ID','Source_Spreadsheet_ID','Source_Sheet_ID','Candidate_Name','Created_At','Last_Seen_At','Account_Mapping_Status'],
  manifestHeaders: ['Generation','Ordinal','Tab','Source_Sheet_ID','Record_Count','Digest'],
  logHeaders: ['Generation','State','Part_Count','Record_Count','Manifest_Digest','Completed_At']
});
function clientHash_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(value),Utilities.Charset.UTF_8)
    .map(n => ('0'+((n+256)%256).toString(16)).slice(-2)).join('');
}
function clientSafe_(value) {
  return String(value == null ? '' : value);
}
function clientWriteText_(sheet,row,column,values) {
  // Rich text writes literal strings, including values starting with '='.
  // Do not use setValues for untrusted source text (formula injection).
  if(sheet.getParent().getId()!==CLIENT_SYNC.duplicate)throw new Error('Writes require the exact Duplicate');
  const needed=row+values.length-1;
  clientGrowRows_(sheet,needed);
  sheet.getRange(row,column,values.length,values[0].length).setRichTextValues(values.map(r=>r.map(v=>SpreadsheetApp.newRichTextValue().setText(String(v)).build())));
}
function clientGrowRows_(sheet,needed) {
  if(sheet.getParent().getId()!==CLIENT_SYNC.duplicate)throw new Error('Writes require the exact Duplicate');
  if(needed<=sheet.getMaxRows())return;
  const cells=sheet.getParent().getSheets().reduce((n,s)=>n+s.getMaxRows()*s.getMaxColumns(),0);
  const added=(needed-sheet.getMaxRows())*sheet.getMaxColumns();
  if(cells+added>9500000)throw new Error('Workbook capacity requires approved archival; previous data preserved');
  sheet.insertRowsAfter(sheet.getMaxRows(),needed-sheet.getMaxRows());
}
function clientBooks_() {
  const duplicate=SpreadsheetApp.getActiveSpreadsheet();
  if (!duplicate || duplicate.getId()!==CLIENT_SYNC.duplicate || duplicate.getId()===CLIENT_SYNC.master) throw new Error('Exact approved Duplicate required');
  return {duplicate:duplicate,master:SpreadsheetApp.openById(CLIENT_SYNC.master)};
}
function clientSheet_(book,name,headers) {
  if(book.getId()!==CLIENT_SYNC.duplicate)throw new Error('Writes require the exact Duplicate');
  const props=PropertiesService.getScriptProperties();
  let sheet=book.getSheetByName(name);
  if (!sheet) {
    const cells=book.getSheets().reduce((n,s)=>n+s.getMaxRows()*s.getMaxColumns(),0);
    if(cells+headers.length>9500000)throw new Error('Workbook capacity requires approved archival; previous data preserved');
    // Add a genuinely new, minimally-sized tab using the authorized SCRIPT
    // account, not the read-only service account. No existing grid is resized.
    props.setProperty('CLIENT_NEW_TAB',name);
    const response=UrlFetchApp.fetch('https://sheets.googleapis.com/v4/spreadsheets/'+CLIENT_SYNC.duplicate+':batchUpdate',{
      method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},
      payload:JSON.stringify({requests:[{addSheet:{properties:{title:name,gridProperties:{rowCount:1,columnCount:headers.length}}}}]}),muteHttpExceptions:true
    });
    if(response.getResponseCode()!==200)throw new Error('New protocol tab creation failed; retry without deleting data');
    SpreadsheetApp.flush();sheet=book.getSheetByName(name);
    if(!sheet)throw new Error('New protocol tab is not yet visible; retry');
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
  }
  if(props.getProperty('CLIENT_NEW_TAB')===name){
    if(sheet.getLastRow()===0)sheet.getRange(1,1,1,headers.length).setValues([headers]);
    props.setProperty('CLIENT_TAB_'+sheet.getSheetId(),'protocol-v1:'+name);
  }
  if(props.getProperty('CLIENT_TAB_'+sheet.getSheetId())!=='protocol-v1:'+name)throw new Error('Existing tab ownership requires operator review; no data overwritten');
  if (JSON.stringify(sheet.getRange(1,1,1,headers.length).getDisplayValues()[0])!==JSON.stringify(headers)) throw new Error('Protocol tab schema conflict');
  if(props.getProperty('CLIENT_NEW_TAB')===name)props.deleteProperty('CLIENT_NEW_TAB');
  return sheet;
}
function clientRows_(sheet,width) {
  return sheet.getLastRow()>1 ? sheet.getRange(2,1,sheet.getLastRow()-1,width).getDisplayValues() : [];
}
// Classification uses approved stable IDs or an operator-approved structural
// template signature. It never uses the title as proof, nor imports profiles.
function clientClassify_(sheet,props) {
  const ids=JSON.parse(props.getProperty('CLIENT_SOURCE_SHEET_IDS') || '[]').map(String);
  const signatures=JSON.parse(props.getProperty('CLIENT_TEMPLATE_SIGNATURES') || '[]');
  const rows=sheet.getLastRow() ? sheet.getRange(1,1,Math.min(sheet.getLastRow(),40),8).getDisplayValues() : [];
  const structural=[];
  rows.forEach((row,i)=>{
    const r=row.map(v=>String(v).trim().toLowerCase());
    if (['name','candidate name','client name','phone','email'].indexOf(r[0].replace(/:$/,''))>=0) structural.push([i,r[0].replace(/:$/,'')]);
    if (r[1]==='position' && r[2]==='company' && ['link','job link'].indexOf(r[3])>=0) structural.push([i,'job-table']);
  });
  const signature=clientHash_(structural);
  const reserved=/^(all_jobs|candidate_index|client_registry|client_sync_|client_view|_9jobs_|sheet\d*$|client_summary|backup)/i.test(sheet.getName());
  return {sheetId:String(sheet.getSheetId()),signature:signature,reserved:reserved,candidate:!reserved && (ids.indexOf(String(sheet.getSheetId()))>=0 || (structural.some(r=>r[1]==='job-table') && structural.some(r=>r[1]==='name'||r[1]==='candidate name'||r[1]==='client name') && signatures.indexOf(signature)>=0))};
}
function dryRunClientRegistry() {
  const books=clientBooks_(),props=PropertiesService.getScriptProperties();
  // Pure read: even a missing registry is not created by a dry run.
  const result=books.master.getSheets().map(sheet=>clientClassify_(sheet,props));
  console.log(JSON.stringify({candidates:result.filter(r=>r.candidate).length,review:result.filter(r=>!r.candidate).length,writes:0}));
  return result;
}
function clientRegistry_(book,candidates) {
  const tab=clientSheet_(book,CLIENT_SYNC.registry,CLIENT_SYNC.registryHeaders);
  const rows=clientRows_(tab,7), sources={}, ids={};
  rows.forEach((r,i)=>{
    if (!/^9JOBS-CL-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(r[0]) || r[1]!==CLIENT_SYNC.master || !/^\d+$/.test(r[2]) || sources[r[2]] || ids[r[0]]) throw new Error('Registry conflict; manual recovery required');
    sources[r[2]]={id:r[0],row:i+2}; ids[r[0]]=true;
  });
  candidates.forEach(sheet=>{
    const key=String(sheet.getSheetId()), now=new Date().toISOString();
    if (!sources[key]) {
      let id; do {id='9JOBS-CL-'+Utilities.getUuid().toLowerCase();} while(ids[id]);
      const row=tab.getLastRow()+1;
      clientWriteText_(tab,row,1,[[id,CLIENT_SYNC.master,key,sheet.getName(),now,now,'pending']]);
      SpreadsheetApp.flush(); // Re-read on a retry before allocating another ID.
      sources[key]={id:id,row:row}; ids[id]=true;
    } else {
      // Only registry display metadata changes; permanent identity is immutable.
      clientWriteText_(tab,sources[key].row,4,[[sheet.getName()]]);
      clientWriteText_(tab,sources[key].row,6,[[now]]);
    }
  });
}
function clientExtract_(sheet,start,count,previous) {
  const rows=sheet.getRange(start,1,count,8).getDisplayValues();
  const links=sheet.getRange(start,3,count,2).getRichTextValues();
  let inJobs=previous.inJobs, date=previous.date;
  const out=[];
  rows.forEach((raw,i)=>{
    const r=raw.map(v=>String(v).trim());
    if(r[1].toLowerCase()==='position' && r[2].toLowerCase()==='company') {inJobs=true;date=r[0]||date;return;}
    if(!inJobs || !/^\d+$/.test(r[0]) || !r[1] || !r[2])return;
    const link=value=>{if(!value)return '';const direct=value.getLinkUrl();if(direct)return direct;for(const run of value.getRuns()){if(run.getLinkUrl())return run.getLinkUrl();}return '';};
    out.push([sheet.getName(),date,r[0],r[1],r[2],link(links[i][0]),link(links[i][1])||r[3],r[4],r[5],r[6],r[7],String(start+i)].map(clientSafe_));
  });
  return {rows:out,inJobs:inJobs,date:date};
}
function clientAppendOnce_(sheet,row,width) {
  const found=clientRows_(sheet,width).find(r=>r[0]===String(row[0]) && r[1]===String(row[1]));
  if(found){if(JSON.stringify(found)!==JSON.stringify(row.map(String)))throw new Error('Journal retry conflict');return;}
  clientWriteText_(sheet,sheet.getLastRow()+1,1,[row]);
}
function clientContinue_() {
  const triggers=ScriptApp.getProjectTriggers();
  if(!triggers.some(t=>t.getHandlerFunction()==='syncCandidateViewsAuto')) ScriptApp.newTrigger('syncCandidateViewsAuto').timeBased().after(60000).create();
}
function clientAbortChanged_(book,state) {
  const log=clientSheet_(book,CLIENT_SYNC.log,CLIENT_SYNC.logHeaders);
  if(!clientRows_(log,6).some(r=>r[0]===state.generation && r[1]==='ABORTED'))clientWriteText_(log,log.getLastRow()+1,1,[[state.generation,'ABORTED',String(state.part),'0','',new Date().toISOString()]]);
  PropertiesService.getScriptProperties().deleteProperty('CLIENT_SYNC_STATE');
  console.log('Source changed; incomplete generation retained. Next scheduled run starts fresh with the same registry IDs.');
}
function clientSyncStep_(maxSteps) {
  const props=PropertiesService.getScriptProperties();
  if(props.getProperty('CLIENT_SYNC_ENABLED')!=='true')throw new Error('Client sync is disabled until explicitly activated');
  const books=clientBooks_(),started=Date.now();
  const all=books.master.getSheets().sort((a,b)=>a.getSheetId()-b.getSheetId());
  let state=JSON.parse(props.getProperty('CLIENT_SYNC_STATE') || 'null');
  if(!state){
    state={generation:'g_'+Utilities.getUuid().replace(/-/g,'').toLowerCase(),discoverIds:all.map(s=>String(s.getSheetId())),discover:0,sheets:[],sheet:0,start:1,inJobs:false,date:'',part:0,phase:'discover',verify:0};
    props.setProperty('CLIENT_SYNC_STATE',JSON.stringify(state));
  }
  const manifest=clientSheet_(books.duplicate,CLIENT_SYNC.manifest,CLIENT_SYNC.manifestHeaders);
  const log=clientSheet_(books.duplicate,CLIENT_SYNC.log,CLIENT_SYNC.logHeaders);
  let steps=0;
  while(Date.now()-started<CLIENT_SYNC.budgetMs && steps++<(maxSteps || Infinity)) {
    if(state.phase==='discover') {
      if(state.discover>=state.discoverIds.length){
        if(!state.sheets.length)throw new Error('No approved candidates; previous generation preserved');
        state.phase='stage';props.setProperty('CLIENT_SYNC_STATE',JSON.stringify(state));continue;
      }
      const source=all.find(s=>String(s.getSheetId())===state.discoverIds[state.discover]);
      if(!source){clientAbortChanged_(books.duplicate,state);return false;}
      const classification=clientClassify_(source,props);
      if(classification.candidate){
        clientRegistry_(books.duplicate,[source]);
        state.sheets.push({id:String(source.getSheetId()),name:source.getName(),lastRow:source.getLastRow()});
      } else if(!classification.reserved) {
        const review=clientSheet_(books.duplicate,'Client_Registry_Review',['Source_Spreadsheet_ID','Source_Sheet_ID','Candidate_Name','Template_Signature','Review_Status','First_Seen_At']);
        if(!clientRows_(review,6).some(r=>r[1]===classification.sheetId))clientWriteText_(review,review.getLastRow()+1,1,[[CLIENT_SYNC.master,classification.sheetId,source.getName(),classification.signature,'needs_review',new Date().toISOString()]]);
      }
      state.discover++;props.setProperty('CLIENT_SYNC_STATE',JSON.stringify(state));
    } else if(state.phase==='stage') {
      if(state.sheet>=state.sheets.length){state.phase='verify';state.verify=0;props.setProperty('CLIENT_SYNC_STATE',JSON.stringify(state));continue;}
      const expected=state.sheets[state.sheet], source=all.find(s=>String(s.getSheetId())===expected.id);
      if(!source || source.getLastRow()!==expected.lastRow || source.getName()!==expected.name){clientAbortChanged_(books.duplicate,state);return false;}
      const count=Math.min(CLIENT_SYNC.chunk,Math.max(0,expected.lastRow-state.start+1));
      const extracted=count ? clientExtract_(source,state.start,count,state) : {rows:[],inJobs:state.inJobs,date:state.date};
      const history=clientRows_(manifest,6);
      const previousPoints=books.duplicate.getSheetByName('Client_Sync_Checkpoints');
      const pointRows=previousPoints ? clientRows_(previousPoints,6) : [];
      const hash=clientHash_(extracted.rows);
      const already=history.find(r=>r[0]===state.generation && r[1]===String(state.part));
      const reusable=history.find(r=>r[3]===expected.id && r[4]===String(extracted.rows.length) && r[5]===hash &&
        !history.some(current=>current[0]===state.generation && current[2]===r[2]) &&
        pointRows.some(p=>p[0]===r[0] && p[1]===r[1] && p[2]===String(state.start) && p[3]===String(count)));
      const name=already ? already[2] : reusable ? reusable[2] : '_9JOBS_DATA_'+state.generation+'_'+state.part;
      const existing=books.duplicate.getSheetByName(name);
      const part=clientSheet_(books.duplicate,name,CLIENT_SYNC.headers);
      if(existing && part.getLastRow()>1 && JSON.stringify(clientRows_(part,12))!==JSON.stringify(extracted.rows)){clientAbortChanged_(books.duplicate,state);return false;}
      if(part.getLastRow()===1 && extracted.rows.length)clientWriteText_(part,2,1,extracted.rows);
      SpreadsheetApp.flush();
      const actual=clientRows_(part,12);
      if(JSON.stringify(actual)!==JSON.stringify(extracted.rows))throw new Error('Staging verification failed');
      clientAppendOnce_(manifest,[state.generation,String(state.part),name,expected.id,String(actual.length),clientHash_(actual)],6);
      // Persist parser checkpoint alongside source window for the verification pass.
      const checkpoints=clientSheet_(books.duplicate,'Client_Sync_Checkpoints',['Generation','Ordinal','Source_Start','Source_Count','In_Jobs','Applied_Date']);
      clientAppendOnce_(checkpoints,[state.generation,String(state.part),String(state.start),String(count),String(state.inJobs),String(state.date)],6);
      state.part++;state.start+=count;state.inJobs=extracted.inJobs;state.date=extracted.date;
      if(!count || state.start>expected.lastRow){state.sheet++;state.start=1;state.inJobs=false;state.date='';}
      props.setProperty('CLIENT_SYNC_STATE',JSON.stringify(state));
    } else {
      const entries=clientRows_(manifest,6).filter(r=>r[0]===state.generation).sort((a,b)=>Number(a[1])-Number(b[1]));
      const points=clientRows_(books.duplicate.getSheetByName('Client_Sync_Checkpoints'),6).filter(r=>r[0]===state.generation);
      if(entries.length!==state.part)throw new Error('Incomplete manifest');
      if(state.verify<entries.length){
        const entry=entries[state.verify],point=points.find(r=>r[1]===entry[1]);
        const source=all.find(s=>String(s.getSheetId())===entry[3]);
        const expected=state.sheets.find(s=>s.id===entry[3]);
        if(!source || source.getName()!==expected.name || source.getLastRow()!==expected.lastRow){clientAbortChanged_(books.duplicate,state);return false;}
        const rows=Number(point[3]) ? clientExtract_(source,Number(point[2]),Number(point[3]),{inJobs:point[4]==='true',date:point[5]}).rows : [];
        if(clientHash_(rows)!==entry[5]){clientAbortChanged_(books.duplicate,state);return false;}
        state.verify++;props.setProperty('CLIENT_SYNC_STATE',JSON.stringify(state));continue;
      }
      const parts=entries.map(r=>({tab:r[2],sheetId:r[3],count:Number(r[4]),digest:r[5]}));
      // Append commit LAST. Consumers ignore every uncommitted generation.
      const done=clientRows_(log,6).find(r=>r[0]===state.generation && r[1]==='COMPLETED');
      if(!done)clientWriteText_(log,log.getLastRow()+1,1,[[state.generation,'COMPLETED',String(parts.length),String(parts.reduce((n,p)=>n+p.count,0)),clientHash_(parts),new Date().toISOString()]]);
      props.setProperty('CLIENT_VIEW_STATE',JSON.stringify({generation:state.generation,ordinal:0,target:null}));
      props.deleteProperty('CLIENT_SYNC_STATE');
      console.log('Client generation completed; existing data and views retained.');
      return true;
    }
  }
  return false;
}
function hourlySyncStaged() {
  if(PropertiesService.getScriptProperties().getProperty('CLIENT_SYNC_ENABLED')!=='true')return;
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(1000))return;
  try {
    const props=PropertiesService.getScriptProperties();
    if(!props.getProperty('CLIENT_VIEW_STATE'))clientSyncStep_();
    if(props.getProperty('CLIENT_SYNC_STATE') || props.getProperty('CLIENT_VIEW_STATE'))clientContinue_();
  }
  finally {lock.releaseLock();}
}
function syncCandidateViewsAuto(e) {
  // Remove only this spent continuation, never the two-hour or backup trigger.
  if(e && e.triggerUid)ScriptApp.getProjectTriggers().forEach(t=>{if(t.getHandlerFunction()==='syncCandidateViewsAuto' && t.getUniqueId()===String(e.triggerUid))ScriptApp.deleteTrigger(t);});
  if(PropertiesService.getScriptProperties().getProperty('CLIENT_SYNC_ENABLED')!=='true')return;
  const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;
  try{
    const props=PropertiesService.getScriptProperties();
    if(props.getProperty('CLIENT_VIEW_STATE'))clientViewStep_();else clientSyncStep_();
    if(props.getProperty('CLIENT_SYNC_STATE') || props.getProperty('CLIENT_VIEW_STATE'))clientContinue_();
  }finally{lock.releaseLock();}
}
function syncAllJobs(){hourlySyncStaged();}
function hourlySync9JOBS(){hourlySyncStaged();}
function createCandidateTabs(){syncCandidateViewsAuto();}
function clientViewStep_(maxSteps) {
  const props=PropertiesService.getScriptProperties();
  if(props.getProperty('CLIENT_SYNC_ENABLED')!=='true')throw new Error('Client sync is disabled');
  const state=JSON.parse(props.getProperty('CLIENT_VIEW_STATE') || 'null');if(!state)return true;
  const book=clientBooks_().duplicate,started=Date.now();
  const manifest=clientRows_(clientSheet_(book,CLIENT_SYNC.manifest,CLIENT_SYNC.manifestHeaders),6).filter(r=>r[0]===state.generation).sort((a,b)=>Number(a[1])-Number(b[1]));
  const journal=clientSheet_(book,'Client_View_Manifest',['Source_Sheet_ID','Part_Tab','Start_Row','Record_Count','Digest','Applied_At']);
  let steps=0;
  while(state.ordinal<manifest.length && Date.now()-started<CLIENT_SYNC.budgetMs && steps++<(maxSteps || Infinity)){
    const part=manifest[state.ordinal],saved=clientRows_(journal,6).find(r=>r[0]===part[3] && r[1]===part[2]);
    if(saved){if(saved[4]!==part[5])throw new Error('Candidate view journal conflict');state.ordinal++;state.target=null;props.setProperty('CLIENT_VIEW_STATE',JSON.stringify(state));continue;}
    // Separate stable-ID views; legacy candidate tabs and their markers are
    // never reused based on a name. Same-name candidates get distinct tabs.
    const view=clientSheet_(book,'Client_View_'+part[3],CLIENT_SYNC.headers);
    const rows=clientRows_(book.getSheetByName(part[2]),12);
    if(clientHash_(rows)!==part[5])throw new Error('Candidate view source changed');
    if(!state.target){state.target={row:view.getLastRow()+1,part:part[2]};props.setProperty('CLIENT_VIEW_STATE',JSON.stringify(state));}
    if(state.target.part!==part[2])throw new Error('Candidate view checkpoint conflict');
    if(rows.length){
      const end=state.target.row+rows.length-1;
      clientGrowRows_(view,end);
      const range=view.getRange(state.target.row,1,rows.length,12),existing=range.getDisplayValues();
      const empty=existing.every(r=>r.every(v=>v==='')) && range.getFormulas().every(r=>r.every(v=>v===''));
      if(!empty && JSON.stringify(existing)!==JSON.stringify(rows))throw new Error('Existing candidate cells will not be overwritten');
      if(empty)clientWriteText_(view,state.target.row,1,rows);
      SpreadsheetApp.flush();if(JSON.stringify(range.getDisplayValues())!==JSON.stringify(rows))throw new Error('Candidate view write verification failed');
    }
    clientAppendOnce_(journal,[part[3],part[2],String(state.target.row),String(rows.length),part[5],new Date().toISOString()],6);
    state.ordinal++;state.target=null;props.setProperty('CLIENT_VIEW_STATE',JSON.stringify(state));
  }
  if(state.ordinal===manifest.length){props.deleteProperty('CLIENT_VIEW_STATE');return true;}
  return false;
}
// Explicit recovery: keeps all staged tabs, registry IDs and completed history.
function abandonIncompleteClientGeneration() {
  const props=PropertiesService.getScriptProperties();
  if(props.getProperty('CLIENT_SYNC_ENABLED')==='true')throw new Error('Disable sync and stop in-flight executions before recovery');
  const lock=LockService.getScriptLock();if(!lock.tryLock(1000))throw new Error('Sync is running');
  try{props.deleteProperty('CLIENT_SYNC_STATE');}finally{lock.releaseLock();}
}

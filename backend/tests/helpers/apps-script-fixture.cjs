const fs=require('node:fs');const vm=require('node:vm');const crypto=require('node:crypto');const path=require('node:path');
class Range {
 constructor(sheet,row,col,rows=1,cols=1){Object.assign(this,{sheet,row,col,rows,cols});}
 getDisplayValues(){return Array.from({length:this.rows},(_,r)=>Array.from({length:this.cols},(_,c)=>String(this.sheet.data[this.row+r-1]?.[this.col+c-1]??'')));}
 getRichTextValues(){return this.getDisplayValues().map(row=>row.map(text=>({getLinkUrl:()=>/^https?:/.test(text)?text:'',getRuns:()=>[],getText:()=>text})));}
 getFormulas(){return Array.from({length:this.rows},()=>Array.from({length:this.cols},()=>''));}
 setValues(values){if(this.sheet.readonly)throw new Error('MASTER WRITE FORBIDDEN');this.sheet.writes++;for(let i=0;i<values.length;i++){this.sheet.data[this.row+i-1]??=[];for(let j=0;j<values[i].length;j++)this.sheet.data[this.row+i-1][this.col+j-1]=String(values[i][j]);}
  const book=this.sheet.parent;
  if(this.row>1 && book?.failNextDataWriteAfter && this.sheet.name.startsWith('_9JOBS_DATA_')){book.failNextDataWriteAfter=false;throw new Error('Injected completed-write response loss');}
  if(this.row>1 && book?.failNextViewWriteAfter && /^Client_View_\d+$/.test(this.sheet.name)){book.failNextViewWriteAfter=false;throw new Error('Injected completed-write response loss');}
  return this;}
 setValue(value){return this.setValues([[value]]);}
 setRichTextValues(values){return this.setValues(values.map(r=>r.map(v=>v.getText())));}
}
class Sheet {
 constructor(name,id,data=[],readonly=false){Object.assign(this,{name,id,data,readonly,writes:0});}
 getName(){return this.name;}getSheetId(){return this.id;}
 getLastRow(){return this.data.length;}getMaxRows(){return this.maxRows??Math.max(1000,this.data.length);}getMaxColumns(){return this.maxCols??26;}
 getParent(){return this.parent;}
 insertRowsAfter(after,count){if(this.readonly)throw new Error('MASTER WRITE FORBIDDEN');this.maxRows=this.getMaxRows()+count;}
 getRange(...args){return new Range(this,...args);}
 clear(){throw new Error('DESTRUCTIVE METHOD FORBIDDEN');}clearContents(){throw new Error('DESTRUCTIVE METHOD FORBIDDEN');}
}
class Book {
 constructor(id,sheets=[],readonly=false){Object.assign(this,{id,sheets,readonly});sheets.forEach(s=>s.parent=this);}
 getId(){return this.id;}getSheets(){return [...this.sheets];}getSheetByName(name){return this.sheets.find(s=>s.name===name)||null;}
 insertSheet(name){if(this.readonly)throw new Error('MASTER WRITE FORBIDDEN');if(this.getSheetByName(name))throw new Error('Duplicate tab');const s=new Sheet(name,100000+this.sheets.length);s.parent=this;this.sheets.push(s);return s;}
}
function fixture({candidates=65,records=35122}={}) {
 const source=[];let serial=0;
 for(let i=0;i<candidates;i++){
  const n=Math.floor(records/candidates)+(i<records%candidates?1:0);
  source.push(new Sheet('Candidate '+i,i+1,[['Name','Candidate '+i],['Password','fixture-do-not-import'],['2026-11-02','Position','Company','Link','Recruiter','Contact','Email','Message'],...Array.from({length:n},(_,j)=>[String(j+1),'Role '+serial++,'Company','https://example.invalid/job','','','recruiter@example.invalid',j===0?'=literal source text':''])],true));
 }
 const master=new Book('1PRAH1qR9PyJtlUjHyfcq3eN2LiU2ERLaVaLRM5nkd2Y',source,true);
 const duplicate=new Book('1KM8Jr2zjiGNRJJNorqIQHdlNc9-YMiTx_xmXZizVKvU',[
  new Sheet('All_Jobs',900,[['Original baseline retained'],['=existing-formula']]),
  new Sheet('Candidate_Index',901,[['Candidate (click name)','Total Jobs','','__9JOBS_AUTO_CANDIDATE_VIEW__']]),
  new Sheet('Existing candidate view',902,[['existing formula','=SUM(A3:A4)'],[],[],[],[],[],[],[],[],['__9JOBS_AUTO_CANDIDATE_VIEW__','original-hash']])]);
 const values={CLIENT_SYNC_ENABLED:'true',CLIENT_SOURCE_SHEET_IDS:JSON.stringify(source.map(s=>String(s.id)))};
 const triggers=[{getHandlerFunction:()=> 'hourlySyncStaged',getUniqueId:()=> 'two-hour'},{getHandlerFunction:()=> 'dailyMasterBackup',getUniqueId:()=> 'backup'}];
 let locked=false;
 const context=vm.createContext({console:{log(){}},Date,JSON,Object,String,Number,Array,Math,Infinity,
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>values[k]??null,setProperty:(k,v)=>{values[k]=v;},deleteProperty:k=>{delete values[k];}})},
  Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},getUuid:()=>crypto.randomUUID(),computeDigest:(_algorithm,value)=>Array.from(crypto.createHash('sha256').update(value).digest()).map(v=>v>127?v-256:v)},
  SpreadsheetApp:{getActiveSpreadsheet:()=>duplicate,openById:id=>{if(id!==master.id)throw new Error('Unexpected source');return master;},flush(){},newRichTextValue:()=>{let text='';return{setText(v){text=v;return this;},build:()=>({getText:()=>text})};}},
  LockService:{getScriptLock:()=>({tryLock:()=>{if(locked)return false;locked=true;return true;},releaseLock:()=>{locked=false;}})},
  UrlFetchApp:{fetch:(url,options)=>{if(url!=='https://sheets.googleapis.com/v4/spreadsheets/'+duplicate.id+':batchUpdate')throw new Error('Unexpected write destination');const requests=JSON.parse(options.payload).requests;if(requests.length!==1||!requests[0].addSheet)throw new Error('Only additive tab creation allowed');const p=requests[0].addSheet.properties;const s=duplicate.insertSheet(p.title);s.maxRows=p.gridProperties.rowCount;s.maxCols=p.gridProperties.columnCount;return{getResponseCode:()=>200};}},
  ScriptApp:{getOAuthToken:()=> 'synthetic-script-account-token',getProjectTriggers:()=>triggers,deleteTrigger:t=>{if(t.getUniqueId()==='backup'||t.getUniqueId()==='two-hour')throw new Error('Protected trigger');triggers.splice(triggers.indexOf(t),1);},newTrigger:handler=>({timeBased(){return this;},after(){return this;},create(){const id=crypto.randomUUID();triggers.push({getHandlerFunction:()=>handler,getUniqueId:()=>id});}})}
 });
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../../apps-script/ClientSync.gs'),'utf8'),context);
 const call=(name,...args)=>context[name](...args);
 const complete=()=>{let steps=0;while(!call('clientSyncStep_',20)){if(++steps>500)throw new Error('Sync did not converge');}while(!call('clientViewStep_',20)){if(++steps>1000)throw new Error('Views did not converge');}};
 const read=name=>({values:duplicate.getSheetByName(name).data.map(r=>r.map(String))});
 const client={syncLog:async()=>read('Client_Sync_Log'),syncManifest:async()=>read('Client_Sync_Manifest'),registry:async()=>read('Client_Registry'),syncPart:async name=>read(name)};
 return {master,duplicate,values,triggers,call,complete,client,Sheet};
}
module.exports={fixture};

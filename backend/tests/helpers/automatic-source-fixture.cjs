const {EXPECTED_HEADERS,DUPLICATE_SPREADSHEET_ID:id}=require('../../scripts/inspect-duplicate-sheet.cjs');
const {digestSource,POLICY,QUIET_MS}=require('../../scripts/sheet-source-consistency.cjs');
function sourceFixture(definitions=[{gid:'123',name:'Alex [A]',count:2},{gid:'456',name:'Alex [B]',count:1}]){
 const metadata={spreadsheetId:id,sheets:definitions.map(d=>({properties:{sheetId:Number(d.gid),title:d.name}}))};
 const allJobs={values:[EXPECTED_HEADERS]},candidateIndex={values:[['Candidate (click name)','Total Jobs']]};
 const linkRows=[{values:[]}],views={sheets:[]};let sourceRow=10;
 for(const d of definitions){
  const rows=Array.from({length:d.count},(_,i)=>[d.name,'1-Sep-2026',String(i+1),'Role '+i,'Company','','https://example.invalid/'+d.gid+'/'+i,'Applied','Contact '+i,'Sent','Sent',String(sourceRow++)]);
  allJobs.values.push(...rows);candidateIndex.values.push([d.name,String(d.count)]);
  linkRows.push({values:[{hyperlink:`https://docs.google.com/spreadsheets/d/${id}/edit#gid=${d.gid}`} ]});
  views.sheets.push({properties:{sheetId:Number(d.gid),title:d.name},data:[{rowData:[{values:[{}, {formattedValue:'Alex'},...Array.from({length:7},()=>({})),{formattedValue:'__9JOBS_AUTO_CANDIDATE_VIEW__'}]},
   {values:[{formattedValue:'1-Sep-2026'},{formattedValue:'Position'},{formattedValue:'Company'}]},...rows.map(r=>({values:[{formattedValue:r[2]},{formattedValue:r[3]},{formattedValue:r[4]},{formattedValue:'Link',hyperlink:r[6]},...r.slice(7,11).map(v=>({formattedValue:v}))]}))]}]});
 }
 const now=Date.now();const sample={allJobs,candidateIndex,sourceValidation:{policy:POLICY,quietMs:QUIET_MS,observedAt:now-QUIET_MS,confirmedAt:now,consistent:true,digest:digestSource(allJobs,candidateIndex)}};
 return {metadata,sample,links:{sheets:[{properties:{title:'Candidate_Index'},data:[{rowData:linkRows}]}]},views};
}
module.exports={sourceFixture};

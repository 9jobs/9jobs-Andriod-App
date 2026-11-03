// Read-only Google adapter. No spreadsheet writes or Master access are exposed.
const {createHash}=require('node:crypto');
const {EXPECTED_HEADERS,DUPLICATE_SPREADSHEET_ID}=require('./inspect-duplicate-sheet.cjs');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function readClientGeneration(client,options={}) {
 const log=await client.syncLog();
 if(JSON.stringify(log.values?.[0])!==JSON.stringify(['Generation','State','Part_Count','Record_Count','Manifest_Digest','Completed_At']))throw new Error('Unexpected completion log');
 const commit=(log.values||[]).slice(1).filter(r=>r[1]==='COMPLETED').at(-1);
 if(!commit)throw new Error('No completed generation; previous backend data preserved');
 if(options.knownGeneration===commit[0])return{unchanged:true};
 const [manifest,registry]=await Promise.all([client.syncManifest(),client.registry()]);
 if(JSON.stringify(manifest.values?.[0])!==JSON.stringify(['Generation','Ordinal','Tab','Source_Sheet_ID','Record_Count','Digest']))throw new Error('Unexpected manifest headers');
 const entries=(manifest.values||[]).slice(1).filter(r=>r[0]===commit[0]).sort((a,b)=>Number(a[1])-Number(b[1]));
 if(entries.length!==Number(commit[2]) || entries.some((r,i)=>Number(r[1])!==i))throw new Error('Incomplete manifest');
 const parts=entries.map(r=>({tab:r[2],sheetId:r[3],count:Number(r[4]),digest:r[5]}));
 if(hash(parts)!==commit[4])throw new Error('Manifest checksum mismatch');
 const values=[EXPECTED_HEADERS],provenance=[];
 // Bounded concurrency; sequential reads avoid a quota burst on large generations.
 for(const part of parts){
  const result=await client.syncPart(part.tab);
  if(JSON.stringify(result.values?.[0])!==JSON.stringify(EXPECTED_HEADERS))throw new Error('Unexpected part headers');
  const rows=(result.values||[]).slice(1).map(r=>Array.from({length:12},(_,i)=>String(r[i]??'')));
  if(rows.length!==part.count || hash(rows)!==part.digest)throw new Error('Part checksum mismatch');
  values.push(...rows);provenance.push(...rows.map(()=>part.sheetId));
 }
 if(values.length-1!==Number(commit[3]))throw new Error('Generation count mismatch');
 const participating=new Set(parts.map(p=>p.sheetId));
 const committedRegistry={...registry,values:[registry.values[0],...registry.values.slice(1).filter(r=>participating.has(String(r[2])))]};
 return {spreadsheetId:DUPLICATE_SPREADSHEET_ID,registry:committedRegistry,allJobs:{values},provenance,
  clientProtocol:{version:1,state:'COMPLETED',generation:commit[0],completedAt:commit[5],parts,recordCount:Number(commit[3]),manifestDigest:commit[4]}};
}
module.exports={readClientGeneration};

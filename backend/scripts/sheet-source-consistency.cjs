const {createHash}=require('node:crypto');
const {inspectValues}=require('./inspect-duplicate-sheet.cjs');
const POLICY='reconciled-stable-reads-v1';
const INDEPENDENT_POLICY='stable-independent-candidate-reads-v1';
const QUIET_MS=30000;
function digestSource(allJobs,candidateIndex){
 const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
 const canonical=(value,length)=>value.values.slice(1).filter(row=>row.some(cell=>String(cell??'').trim()))
  .map(row=>hash(Array.from({length},(_,i)=>String(row[i]??'')))).sort();
 return hash([canonical(allJobs,12),canonical(candidateIndex,4)]);
}
async function readSample(client){
 const [allJobs,candidateIndex]=await Promise.all([client.allJobs(),client.candidateIndex()]);
 return {allJobs,candidateIndex,diagnostics:inspectValues(allJobs,candidateIndex)};
}
function reconciles(sample){
 return sample.diagnostics.indexCountsMatch && !sample.diagnostics.incompleteRows && !sample.diagnostics.duplicateIndexNames;
}
async function readConsistentSource(client,dependencies={}){
 const wait=dependencies.wait||((ms)=>new Promise(resolve=>setTimeout(resolve,ms)));
 const now=dependencies.now||Date.now;
 const first=await readSample(client);
 const observedAt=now();
 const firstDigest=digestSource(first.allJobs,first.candidateIndex);
 await wait(QUIET_MS);
 const second=await readSample(client);
 const confirmedAt=now();
 const digest=digestSource(second.allJobs,second.candidateIndex);
 return {...second,sourceValidation:{policy:dependencies.independentCandidates?INDEPENDENT_POLICY:POLICY,observedAt,confirmedAt,quietMs:QUIET_MS,digest,
  consistent:(dependencies.independentCandidates||reconciles(first)&&reconciles(second))&&firstDigest===digest&&confirmedAt-observedAt>=QUIET_MS}};
}
function acceptsValidation(source,now=Date.now()){
 const value=source.sourceValidation;
 return Boolean(value?.policy===POLICY && value.consistent===true && value.quietMs===QUIET_MS
  && Number.isFinite(value.observedAt)&&Number.isFinite(value.confirmedAt)
  && value.confirmedAt-value.observedAt>=QUIET_MS && value.confirmedAt<=now
  && now-value.confirmedAt<=15*60*1000 && value.digest===digestSource(source.allJobs,source.candidateIndex)
  && reconciles({diagnostics:inspectValues(source.allJobs,source.candidateIndex)}));
}
function acceptsIndependentValidation(source,now=Date.now()){
 const v=source.sourceValidation;
 // Headers and raw array shapes are still validated; individual candidates reconcile separately.
 inspectValues(source.allJobs,source.candidateIndex);
 return Boolean(v?.policy===INDEPENDENT_POLICY&&v.consistent===true&&v.quietMs===QUIET_MS&&Number.isFinite(v.observedAt)&&Number.isFinite(v.confirmedAt)&&v.confirmedAt-v.observedAt>=QUIET_MS&&v.confirmedAt<=now&&now-v.confirmedAt<=15*60*1000&&v.digest===digestSource(source.allJobs,source.candidateIndex));
}
module.exports={readConsistentSource,readSample,digestSource,acceptsValidation,acceptsIndependentValidation,POLICY,INDEPENDENT_POLICY,QUIET_MS};

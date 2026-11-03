jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@/theme',()=>({setTheme:jest.fn()}));
jest.mock('@/lib/data/backend-auth-token',()=>({
 resolveBackendUrl:()=> 'http://127.0.0.1:3100',
 getBackendAuthToken:async()=> 'test-transport-token',
 clearBackendAuthTokenCache:jest.fn(),
}));
jest.mock('@/lib/data/sheet-records',()=>({fetchAuthorizedSheetJobs:async()=>[]}));
jest.mock('@/lib/perf/livePerf',()=>({startTrackedRequest:()=>({finish:jest.fn()})}));

describe('service catalog snapshot mapping',()=>{
 const user={id:'catalog-test',email:'catalog@example.invalid',fullName:'Catalog Test'};
 const originalFetch=globalThis.fetch;
 beforeEach(async()=>{
  jest.resetModules();
  await require('@react-native-async-storage/async-storage').clear();
 });
 afterEach(()=>{globalThis.fetch=originalFetch;});
 async function snapshot(services:any[]){
  globalThis.fetch=jest.fn().mockResolvedValue({ok:true,status:200,json:async()=>({services})});
  return require('@/lib/data/mobile-sync-repository').fetchMobileSyncSnapshot(user);
 }
 it('restores all six existing service links for an empty backend catalog',async()=>{
  const result=await snapshot([]);
  expect(result.services.map((service:any)=>service.id)).toEqual([
   'job-tracker','resume-intelligence','hiring-manager-outreach','interview-prep','success-stories','pricing',
  ]);
  expect(result.rawApplications).toEqual([]);
 });
 it('keeps configured hidden or inactive services hidden',async()=>{
  const result=await snapshot([
   {id:'job-tracker',title:'Tracker',description:'',status:'active',visibility:false},
   {id:'interview-prep',title:'Interview',description:'',status:'inactive',visibility:true},
   {id:'resume-intelligence',title:'Resume',description:'',status:'active',visibility:true},
  ]);
  expect(result.services.map((service:any)=>service.id)).toEqual(['resume-intelligence','pricing']);
 });
 it('repairs pricing-only legacy cached navigation without changing cached jobs',()=>{
  const {selectServiceCatalog}=require('@/lib/data/mobile-sync-repository');
  const cached={services:[{id:'pricing'}],rawApplications:[{id:72}]};
  expect(selectServiceCatalog(cached)).toHaveLength(6);
  expect(cached.services).toEqual([{id:'pricing'}]);
  expect(cached.rawApplications).toEqual([{id:72}]);
 });
 it('respects a configured catalog even when all services are hidden',()=>{
  const {selectServiceCatalog}=require('@/lib/data/mobile-sync-repository');
  const cached={services:[{id:'pricing'}],serviceCatalogConfigured:true};
  expect(selectServiceCatalog(cached)).toEqual([{id:'pricing'}]);
 });
});

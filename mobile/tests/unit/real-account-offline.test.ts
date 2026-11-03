jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@/theme',()=>({setTheme:jest.fn()}));
describe('real-account offline snapshots',()=>{
 beforeEach(async()=>{jest.resetModules();const storage=require('@react-native-async-storage/async-storage');await storage.clear();process.env.EXPO_PUBLIC_BACKEND_URL='http://127.0.0.1:3100';});
 test('does not invent demo applications, interviews, offers or messages for a real account',async()=>{
  const {getLocalSyncSnapshot}=require('@/lib/data/mobile-sync-repository');
  const snapshot=await getLocalSyncSnapshot({id:'verified-fixture',email:'fixture@example.invalid',fullName:'Actual Name'});
  expect(snapshot.rawApplications).toEqual([]);expect(snapshot.homeMetrics.totalApplications).toBe(0);
  expect(snapshot.trackerSummary.offers).toBe(0);expect(snapshot.trackerSummary.interviewing).toBe(0);expect(snapshot.messages).toEqual([]);
 });
 test('rejects unscoped legacy demo cache and another backend cache without deleting its bytes',async()=>{
  const storage=require('@react-native-async-storage/async-storage');
  const key='mobile_sync_snapshot_cache:verified-fixture';const raw=JSON.stringify({profile:{id:'verified-fixture'},rawApplications:[{id:1,status:'offer_received'}]});
  await storage.setItem('ninejobs.snapshot-cache.version','2026-07-30-screenshots-2');await storage.setItem(key,raw);
  const {getLocalSyncSnapshot}=require('@/lib/data/mobile-sync-repository');
  expect((await getLocalSyncSnapshot({id:'verified-fixture',email:'fixture@example.invalid',fullName:'Actual'})).rawApplications).toEqual([]);
  expect(await storage.getItem(key)).toBe(raw);
 });
 test('retains genuine same-backend account cache while rejecting a different backend',async()=>{
  const storage=require('@react-native-async-storage/async-storage');
  await storage.setItem('ninejobs.snapshot-cache.version','2026-07-30-screenshots-2');
  const snapshot={profile:{id:'verified-fixture'},cacheContext:{backendUrl:'http://127.0.0.1:3100',source:'server'},rawApplications:[{id:66,status:'applied'}],homeMetrics:{totalApplications:1}};
  await storage.setItem('mobile_sync_snapshot_cache:verified-fixture',JSON.stringify(snapshot));
  const {getLocalSyncSnapshot}=require('@/lib/data/mobile-sync-repository');
  const user={id:'verified-fixture',email:'fixture@example.invalid',fullName:'Actual'};
  expect((await getLocalSyncSnapshot(user)).rawApplications).toHaveLength(1);
  process.env.EXPO_PUBLIC_BACKEND_URL='http://192.168.1.33:3101';
  expect((await getLocalSyncSnapshot(user)).rawApplications).toEqual([]);
 });
});

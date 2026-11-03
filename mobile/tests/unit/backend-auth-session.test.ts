jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@/lib/perf/livePerf',()=>({startTrackedRequest:()=>({finish:jest.fn()})}));
import AsyncStorage from '@react-native-async-storage/async-storage';
import {clearBackendAuthTokenCache,getBackendAuthToken,registerBackendSession} from '@/lib/data/backend-auth-token';
const user={id:'verified-a',email:'a@example.invalid',fullName:'Account A'};
describe('verified Clerk exchange transport',()=>{
 let cleanup:(()=>void)|undefined;
 const originalFetch=globalThis.fetch;
 beforeEach(async()=>{await AsyncStorage.clear();clearBackendAuthTokenCache();globalThis.fetch=jest.fn().mockResolvedValue({ok:true,status:200,json:async()=>({token:'verified-backend-token'})});});
 afterEach(()=>{cleanup?.();cleanup=undefined;globalThis.fetch=originalFetch;});
 it('forwards the active Clerk bearer session through the existing token endpoint',async()=>{
  cleanup=registerBackendSession(user.id,async()=> 'signed-clerk-session');
  expect(await getBackendAuthToken(user,{backendUrl:'http://127.0.0.1:9999'})).toBe('verified-backend-token');
  expect((globalThis.fetch as jest.Mock).mock.calls[0][1].headers.Authorization).toBe('Bearer signed-clerk-session');
 });
 it('cannot exchange an arbitrary user identity without the corresponding active session',async()=>{
  cleanup=registerBackendSession('other-account',async()=> 'other-token');
  await expect(getBackendAuthToken(user)).rejects.toThrow('Verified login');expect(globalThis.fetch).not.toHaveBeenCalled();
 });
 it('exchanges again rather than sending a different backends cached token',async()=>{
  cleanup=registerBackendSession(user.id,async()=> 'signed-clerk-session');
  await getBackendAuthToken(user,{backendUrl:'http://127.0.0.1:3100'});
  await getBackendAuthToken(user,{backendUrl:'http://192.168.1.33:3101'});
  expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  expect((globalThis.fetch as jest.Mock).mock.calls[1][0]).toBe('http://192.168.1.33:3101/api/auth/token');
 });
 it('does not persist a response after an account switch or sign-out',async()=>{
  cleanup=registerBackendSession(user.id,async()=> 'signed-clerk-session');
  (globalThis.fetch as jest.Mock).mockImplementation(async()=>{cleanup?.();return{ok:true,status:200,json:async()=>({token:'stale-token'})};});
  await expect(getBackendAuthToken(user)).rejects.toThrow('login changed');expect(await AsyncStorage.getItem('auth_token')).toBeNull();
 });
});

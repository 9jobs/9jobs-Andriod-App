import {afterEach,describe,expect,it,vi} from 'vitest';
import {LatestOpportunityRequest} from './latestOpportunityRequest';
afterEach(()=>vi.useRealTimers());
describe('opportunity refresh requests',()=>{
  it('coalesces a burst of table refreshes into one request',async()=>{
    const requests=new LatestOpportunityRequest();let complete!:()=>void;
    const load=vi.fn(()=>new Promise<void>(resolve=>{complete=resolve;}));
    const pending=Array.from({length:20},()=>requests.run('page-1-size-50',load));
    await Promise.resolve();expect(load).toHaveBeenCalledTimes(1);
    expect(pending.every(p=>p===pending[0])).toBe(true);
    complete();await Promise.all(pending);
    await requests.run('page-1-size-50',async()=>{});
  });
  it('cancels an obsolete page request before the new page loads',async()=>{
    const requests=new LatestOpportunityRequest();let signal!:AbortSignal;
    const old=requests.run('old-page',s=>{signal=s;return new Promise(()=>{});});
    const rejected=expect(old).rejects.toMatchObject({name:'AbortError'});
    await Promise.resolve();const latest=vi.fn(async()=>{});
    await requests.run('new-page',latest);await rejected;
    expect(signal.aborted).toBe(true);expect(latest).toHaveBeenCalledTimes(1);
  });
  it('times out a hanging operation, signals UI cleanup and permits retry',async()=>{
    vi.useFakeTimers();const requests=new LatestOpportunityRequest(),cleanup=vi.fn();
    const pending=requests.run('page',s=>{s.addEventListener('abort',cleanup);return new Promise(()=>{});},100);
    const rejected=expect(pending).rejects.toMatchObject({name:'TimeoutError'});
    await vi.advanceTimersByTimeAsync(100);await rejected;
    expect(cleanup).toHaveBeenCalledTimes(1);
    const retry=vi.fn(async()=>{});await requests.run('page',retry);expect(retry).toHaveBeenCalledTimes(1);
  });
  it('releases a failed request so the same page can retry',async()=>{
    const requests=new LatestOpportunityRequest();
    await expect(requests.run('page',async()=>{throw new Error('API unavailable');})).rejects.toThrow('API unavailable');
    const retry=vi.fn(async()=>{});await requests.run('page',retry);expect(retry).toHaveBeenCalledTimes(1);
  });
});

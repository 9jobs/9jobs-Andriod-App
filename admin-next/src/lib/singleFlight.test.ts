import { describe, expect, it, vi } from 'vitest';
import { SingleFlight } from './singleFlight';

describe('concurrent admin refreshes', () => {
  it('turns a burst into one load and still refreshes on the next poll', async () => {
    const gate = new SingleFlight();
    let finish!: () => void;
    const load = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const burst = Array.from({ length: 20 }, () => gate.run('admin:users', load));
    await Promise.resolve();
    expect(load).toHaveBeenCalledTimes(1);
    finish();
    await Promise.all(burst);
    const next = vi.fn(async () => {});
    await gate.run('admin:users', next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('keeps different accounts and screens independent', async () => {
    const gate = new SingleFlight();
    const load = vi.fn(async () => {});
    await Promise.all(['a:users', 'b:users', 'a:jobs'].map(key => gate.run(key, load)));
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('allows a fresh retry after a failure', async () => {
    const gate = new SingleFlight();
    await expect(gate.run('users', async () => { throw new Error('Offline'); })).rejects.toThrow('Offline');
    const retry = vi.fn(async () => {});
    await gate.run('users', retry);
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

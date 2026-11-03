// Share only concurrent reads. Completed results are never cached.
export class SingleFlight {
  private pending = new Map<string, Promise<void>>();

  run(key: string, load: () => Promise<void>): Promise<void> {
    const existing = this.pending.get(key);
    if (existing) return existing;
    const request = Promise.resolve().then(load).finally(() => {
      if (this.pending.get(key) === request) this.pending.delete(key);
    });
    this.pending.set(key, request);
    return request;
  }
}

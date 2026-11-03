// Coalesce identical refreshes and cancel obsolete page/search requests.
export class LatestOpportunityRequest {
  private pending?: { key: string; controller: AbortController; promise: Promise<void> };

  run(key: string, load: (signal: AbortSignal) => Promise<void>, timeoutMs = 30000): Promise<void> {
    if (this.pending?.key === key) return this.pending.promise;
    this.pending?.controller.abort();
    const controller = new AbortController();
    let onAbort: () => void;
    const aborted = new Promise<never>((_, reject) => {
      onAbort = () => reject(controller.signal.reason || new DOMException('Request cancelled', 'AbortError'));
      controller.signal.addEventListener('abort', onAbort, { once: true });
    });
    const timer = setTimeout(() => controller.abort(new DOMException('Opportunities request timed out. Please retry.', 'TimeoutError')), timeoutMs);
    // Defer load so pending is assigned before callbacks can request another refresh.
    const operation = Promise.resolve().then(() => load(controller.signal));
    const pending = { key, controller, promise: Promise.resolve() };
    pending.promise = Promise.race([operation, aborted]).finally(() => {
      clearTimeout(timer);
      controller.signal.removeEventListener('abort', onAbort!);
      if (this.pending === pending) this.pending = undefined;
    });
    this.pending = pending;
    return pending.promise;
  }
}

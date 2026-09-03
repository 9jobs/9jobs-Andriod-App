const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const store = globalThis.__nineJobsAdminLoginRateLimitStore || new Map();

if (!globalThis.__nineJobsAdminLoginRateLimitStore) {
  globalThis.__nineJobsAdminLoginRateLimitStore = store;
}

function getEntry(key) {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    const nextEntry = {
      count: 0,
      resetAt: now + WINDOW_MS,
    };

    store.set(key, nextEntry);
    return nextEntry;
  }

  return entry;
}

export function enforceLoginRateLimit(key) {
  const entry = getEntry(key);

  entry.count += 1;
  store.set(key, entry);

  if (entry.count > MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - Date.now()) / 1000)),
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - Date.now()) / 1000)),
  };
}

export function resetLoginRateLimit(key) {
  if (!key) {
    return;
  }

  store.delete(key);
}

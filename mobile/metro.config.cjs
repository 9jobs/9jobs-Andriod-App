const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Windows can exhaust file handles when Metro reads thousands of cache entries
// concurrently. Keep caching, but bound only cache I/O, not module resolution.
function limitCacheIO(store, limit = 32) {
  let active = 0;
  const waiting = [];
  async function run(operation) {
    if (active >= limit) await new Promise(resolve => waiting.push(resolve));
    else active += 1;
    try { return await operation(); }
    finally {
      const next = waiting.shift();
      if (next) next();
      else active -= 1;
    }
  }
  return {
    get: key => run(() => store.get(key)),
    set: (key, value) => run(() => store.set(key, value)),
    clear: () => store.clear(),
  };
}

if (process.platform === "win32") {
  config.cacheStores = config.cacheStores.map(store => limitCacheIO(store));
}

module.exports = config;

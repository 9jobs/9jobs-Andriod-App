import { useCallback, useEffect, useRef } from "react";

let useFocusEffect: any = (cb: any) => {};
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useFocusEffect = require("expo-router").useFocusEffect || useFocusEffect;
} catch {
  // in Jest node runner, expo-router standard navigation may not be mocked
}

type PerfMeta = Record<string, unknown>;

type NavigationEntry = {
  route: string;
  source: string;
  tappedAt: number;
  dispatchedAt?: number;
};

type RequestTracker = {
  id: number;
  label: string;
  startedAt: number;
  occurrence: number;
};

type PerfStore = {
  navEntries: Map<string, NavigationEntry>;
  requestCounts: Map<string, number>;
  nextRequestId: number;
};

declare global {
  var __NINEJOBS_LIVE_PERF__: PerfStore | undefined;
}

function getStore(): PerfStore {
  if (!globalThis.__NINEJOBS_LIVE_PERF__) {
    globalThis.__NINEJOBS_LIVE_PERF__ = {
      navEntries: new Map(),
      requestCounts: new Map(),
      nextRequestId: 1,
    };
  }

  return globalThis.__NINEJOBS_LIVE_PERF__;
}

function toMetaString(meta?: PerfMeta) {
  if (!meta) {
    return "";
  }

  return Object.entries(meta)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(" ");
}

export function logPerf(event: string, meta?: PerfMeta) {
  const stamp = new Date().toISOString();
  const metaText = toMetaString(meta);
  console.log(`[PERF] ${stamp} ${event}${metaText ? ` ${metaText}` : ""}`);
}

export function markNavigationTap(route: string, source: string, meta?: PerfMeta) {
  const tappedAt = Date.now();
  getStore().navEntries.set(route, {
    route,
    source,
    tappedAt,
  });

  logPerf("NAV_TAP", {
    route,
    source,
    ...meta,
  });
}

export function markNavigationDispatch(route: string, meta?: PerfMeta) {
  const store = getStore();
  const entry = store.navEntries.get(route);
  const dispatchedAt = Date.now();

  if (entry) {
    entry.dispatchedAt = dispatchedAt;
    store.navEntries.set(route, entry);
  }

  logPerf("NAV_DISPATCH", {
    route,
    since_tap_ms: entry ? dispatchedAt - entry.tappedAt : null,
    ...meta,
  });
}

export function traceNavigation(route: string, source: string, action: () => void, meta?: PerfMeta) {
  markNavigationTap(route, source, meta);
  markNavigationDispatch(route, meta);
  action();
}

export function startTrackedRequest(label: string, meta?: PerfMeta) {
  const store = getStore();
  const occurrence = (store.requestCounts.get(label) ?? 0) + 1;
  store.requestCounts.set(label, occurrence);
  const tracker: RequestTracker = {
    id: store.nextRequestId++,
    label,
    startedAt: Date.now(),
    occurrence,
  };

  logPerf("REQ_START", {
    id: tracker.id,
    label,
    occurrence,
    ...meta,
  });

  return {
    finish(resultMeta?: PerfMeta) {
      logPerf("REQ_END", {
        id: tracker.id,
        label,
        occurrence: tracker.occurrence,
        duration_ms: Date.now() - tracker.startedAt,
        ...resultMeta,
      });
    },
    fail(error: unknown, resultMeta?: PerfMeta) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "unknown";

      logPerf("REQ_FAIL", {
        id: tracker.id,
        label,
        occurrence: tracker.occurrence,
        duration_ms: Date.now() - tracker.startedAt,
        error: message,
        ...resultMeta,
      });
    },
  };
}

export function useScreenPerf(route: string, ready: boolean, meta?: PerfMeta) {
  const readyLoggedRef = useRef(false);

  useEffect(() => {
    logPerf("SCREEN_MOUNT", {
      route,
      ...getNavigationMeta(route),
      ...meta,
    });

    const frameHandle = requestAnimationFrame(() => {
      logPerf("SCREEN_FIRST_FRAME", {
        route,
        ...getNavigationMeta(route),
      });
    });

    return () => {
      cancelAnimationFrame(frameHandle);
      logPerf("SCREEN_UNMOUNT", {
        route,
      });
    };
  }, [route]);

  useFocusEffect(
    useCallback(() => {
      readyLoggedRef.current = false;
      logPerf("SCREEN_FOCUS", {
        route,
        ...getNavigationMeta(route),
      });

      const frameHandle = requestAnimationFrame(() => {
        logPerf("SCREEN_FOCUS_FRAME", {
          route,
          ...getNavigationMeta(route),
        });
      });

      return () => {
        cancelAnimationFrame(frameHandle);
        logPerf("SCREEN_BLUR", {
          route,
        });
      };
    }, [route]),
  );

  useEffect(() => {
    if (!ready || readyLoggedRef.current) {
      return;
    }

    readyLoggedRef.current = true;
    logPerf("SCREEN_USABLE", {
      route,
      ...getNavigationMeta(route),
      ...meta,
    });
  }, [meta, ready, route]);
}

function getNavigationMeta(route: string) {
  const entry = getStore().navEntries.get(route);
  if (!entry) {
    return {};
  }

  return {
    nav_source: entry.source,
    tap_to_focus_ms: Date.now() - entry.tappedAt,
    tap_to_dispatch_ms:
      entry.dispatchedAt !== undefined ? entry.dispatchedAt - entry.tappedAt : null,
    dispatch_to_now_ms:
      entry.dispatchedAt !== undefined ? Date.now() - entry.dispatchedAt : null,
  };
}

import { createClient } from "@supabase/supabase-js";
import dns from "node:dns/promises";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "https://hzpzpdjmmuoesxhmdiqn.supabase.co";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  "sb_publishable_WN7sFDfFEKrDavvud6Om9A_K4SUTaPZ";

if (!supabaseUrl || !supabaseKey) {
  console.error("[Supabase Client] Critical: SUPABASE_URL or SUPABASE_KEY is missing in environment.");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

const SUPABASE_REACHABILITY_TTL_MS = 5 * 60 * 1000;
const UPSTREAM_LOOKUP_TIMEOUT_MS = 5000;
let supabaseReachabilityState:
  | {
      checkedAt: number;
      reachable: boolean;
      reason?: string;
    }
  | null = null;
let supabaseReachabilityPromise: Promise<boolean> | null = null;
let databaseReachabilityState:
  | {
      checkedAt: number;
      reachable: boolean;
      reason?: string;
    }
  | null = null;
let databaseReachabilityPromise: Promise<boolean> | null = null;

console.log("[Supabase Client] Initialized successfully.");
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("[Supabase Client] Running without SUPABASE_SERVICE_ROLE_KEY. Writes may be blocked by RLS.");
}

export function getSupabaseReachabilityState() {
  return supabaseReachabilityState;
}

async function lookupHostnameWithTimeout(hostname: string, label: string) {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`${label} lookup timed out after ${UPSTREAM_LOOKUP_TIMEOUT_MS}ms`)), UPSTREAM_LOOKUP_TIMEOUT_MS);
  });

  await Promise.race([dns.lookup(hostname), timeoutPromise]);
}

export async function canReachSupabaseUpstream() {
  const now = Date.now();
  if (supabaseReachabilityState && now - supabaseReachabilityState.checkedAt < SUPABASE_REACHABILITY_TTL_MS) {
    return supabaseReachabilityState.reachable;
  }

  if (!supabaseReachabilityPromise) {
    supabaseReachabilityPromise = (async () => {
      try {
        const hostname = new URL(supabaseUrl).hostname;
        await lookupHostnameWithTimeout(hostname, "Supabase");
        supabaseReachabilityState = {
          checkedAt: Date.now(),
          reachable: true,
        };
        return true;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        supabaseReachabilityState = {
          checkedAt: Date.now(),
          reachable: false,
          reason,
        };
        console.warn(`[Supabase Client] Reachability check failed: ${reason}`);
        return false;
      } finally {
        supabaseReachabilityPromise = null;
      }
    })();
  }

  return await supabaseReachabilityPromise;
}

export async function canReachDatabaseUpstream() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return false;
  }

  const now = Date.now();
  if (databaseReachabilityState && now - databaseReachabilityState.checkedAt < SUPABASE_REACHABILITY_TTL_MS) {
    return databaseReachabilityState.reachable;
  }

  if (!databaseReachabilityPromise) {
    databaseReachabilityPromise = (async () => {
      try {
        const hostname = new URL(databaseUrl).hostname;
        await lookupHostnameWithTimeout(hostname, "Database");
        databaseReachabilityState = {
          checkedAt: Date.now(),
          reachable: true,
        };
        return true;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        databaseReachabilityState = {
          checkedAt: Date.now(),
          reachable: false,
          reason,
        };
        console.warn(`[Database Reachability] Check failed: ${reason}`);
        return false;
      } finally {
        databaseReachabilityPromise = null;
      }
    })();
  }

  return await databaseReachabilityPromise;
}

let _hasNewSchema: boolean | null = null;
export async function hasNewSchema(): Promise<boolean> {
  if (_hasNewSchema !== null) return _hasNewSchema;
  try {
    const { error } = await supabase.from("conversations").select("id").limit(1);
    _hasNewSchema = !error;
  } catch {
    _hasNewSchema = false;
  }
  console.log(`[Supabase Schema Check] Detected hasNewSchema: ${_hasNewSchema}`);
  return _hasNewSchema;
}

import { createClient } from "@supabase/supabase-js";
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

console.log("[Supabase Client] Initialized successfully.");
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("[Supabase Client] Running without SUPABASE_SERVICE_ROLE_KEY. Writes may be blocked by RLS.");
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

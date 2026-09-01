import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://hzpzpdjmmuoesxhmdiqn.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_WN7sFDfFEKrDavvud6Om9A_K4SUTaPZ";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing in Vite environment.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

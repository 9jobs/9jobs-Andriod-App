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

const backendUrl = (import.meta.env.VITE_BACKEND_URL || "https://backend-theta-ten-27.vercel.app").trim();
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      const table = url.pathname.split("/rest/v1/")[1];
      if (!table) return fetch(request);
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_auth_token") : null;
      if (!token) throw new Error("Please sign in before accessing admin data");
      return fetch(`${backendUrl}/api/database/query`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ table, query: url.search.slice(1), method: request.method,
          accept: request.headers.get("accept"), prefer: request.headers.get("prefer"),
          body: ["GET", "HEAD", "DELETE"].includes(request.method) ? undefined : await request.json() }),
        signal: request.signal,
      });
    },
  },
});

// Chat retains Socket.IO; other admin views refresh from Neon periodically.
supabase.channel = ((name: string) => {
  const callbacks: Array<(payload: unknown) => void> = [];
  let timer: ReturnType<typeof setInterval> | undefined;
  const channel = {
    topic: name,
    on: (_type: string, _filter: unknown, callback: (payload: unknown) => void) => { callbacks.push(callback); return channel; },
    subscribe: () => { timer ??= setInterval(() => callbacks.forEach(callback => callback({ eventType: "UPDATE", new: {}, old: {} })), 15000); return channel; },
    unsubscribe: async () => { if (timer) clearInterval(timer); return "ok" as const; },
  };
  return channel;
}) as unknown as typeof supabase.channel;
supabase.removeChannel = async channel => { await channel.unsubscribe(); return "ok" as const; };

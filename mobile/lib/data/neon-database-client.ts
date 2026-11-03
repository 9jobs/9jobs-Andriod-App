import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { storageKeys } from "@/lib/utils/storage";
import { resolveBackendUrl } from "./backend-auth-token";

// Retain the query-builder API while sending all database operations through
// authenticated backend handlers. This client contains no database credentials.
export const neonDatabase = createClient("https://database.invalid", "backend-session", {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: {
    fetch: async (input, init) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      const table = url.pathname.split("/rest/v1/")[1];
      if (!table) throw new Error("Use the existing auth/storage provider for non-database operations");
      const token = await AsyncStorage.getItem(storageKeys.authToken);
      if (!token) throw new Error("Please sign in before accessing your data");
      const response = await fetch(`${resolveBackendUrl()}/api/database/query`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ table, query: url.search.slice(1), method: request.method,
          accept: request.headers.get("accept"), prefer: request.headers.get("prefer"),
          body: ["GET", "HEAD", "DELETE"].includes(request.method) ? undefined : await request.json() }),
        signal: request.signal,
      });
      return response;
    },
  },
});

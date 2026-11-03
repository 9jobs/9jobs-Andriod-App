import "./env";
import { Pool } from "pg";
function isIsolatedLocalTarget(url:URL) {
  return url.hostname==="127.0.0.1" && url.port==="55439" && url.username==="client_id_test" && /^\/9jobs_local_e2e_[a-z0-9_]+$/.test(url.pathname);
}

export function isNeonDatabase() {
  const value = process.env.DATABASE_URL;
  if (!value) return false;
  const url=new URL(value);
  // Reuse the existing Postgres adapter for an explicitly isolated localhost
  // database. This changes no authentication or production routing defaults.
  return process.env.LOCAL_DATABASE_MODE==="isolated-e2e" ? isIsolatedLocalTarget(url) : url.hostname.endsWith(".neon.tech");
}

// Keep node-postgres for this Node/Express runtime and its transactions.
// Neon supplies a pooled URL for application requests and TLS is verified.
export function createDatabasePool() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is not configured");
  const url = new URL(value);
  if(process.env.LOCAL_DATABASE_MODE==="isolated-e2e" && !isIsolatedLocalTarget(url))throw new Error("Local testing requires the isolated loopback database");
  if (url.hostname.endsWith(".neon.tech")) url.searchParams.set("sslmode", "verify-full");
  return new Pool({
    connectionString: url.toString(),
    max: 3,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
  });
}

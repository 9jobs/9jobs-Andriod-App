import { Pool } from "pg";

// Standalone connection for the resume fix: does not change other API adapters.
export function usesQuestionnaireDatabase() {
  const value = process.env.DATABASE_URL;
  if (!value) return false;
  const url = new URL(value);
  if (process.env.LOCAL_DATABASE_MODE === "isolated-e2e") {
    return url.hostname === "127.0.0.1" && url.port === "55439" &&
      url.username === "client_id_test" && /^\/9jobs_local_e2e_[a-z0-9_]+$/.test(url.pathname);
  }
  return url.hostname.endsWith(".neon.tech");
}

export function createQuestionnairePool() {
  if (!usesQuestionnaireDatabase()) throw new Error("Approved questionnaire database is not configured");
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname.endsWith(".neon.tech")) url.searchParams.set("sslmode", "verify-full");
  return new Pool({ connectionString: url.toString(), max: 3, connectionTimeoutMillis: 10000, idleTimeoutMillis: 10000 });
}

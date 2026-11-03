import path from "node:path";
import dotenv from "dotenv";

// Neon writes credentials at the repository root. Load them before the
// backend's legacy env file, regardless of the directory used to start Node.
// Existing deployment environment variables always take precedence.
const backendRoot = path.resolve(__dirname, "../..");
const projectRoot = path.resolve(backendRoot, "..");
for (const file of ['isolated-e2e','neon-development'].includes(process.env.LOCAL_DATABASE_MODE||'') ? [path.join(backendRoot,".env.local-e2e")] : [
  ...(process.env.NEON_ENV_FILE ? [path.resolve(process.env.NEON_ENV_FILE)] : []),
  path.join(projectRoot, ".env.local"),
  path.join(projectRoot, ".env"),
  path.join(backendRoot, ".env.contact.local"),
  path.join(backendRoot, ".env"),
]) {
  dotenv.config({ path: file });
}

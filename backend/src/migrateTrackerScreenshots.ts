import { Client } from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function runTrackerScreenshotMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("supabase") ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    const migrationPath = path.resolve(
      __dirname,
      "../../mobile/supabase/tracker_screenshots_migration.sql",
    );
    await client.query(fs.readFileSync(migrationPath, "utf8"));

    const result = await client.query(`
      select
        count(*) filter (where status = 'applied')::int as applied_count,
        count(*) filter (
          where coalesce(before_screenshot_url, '') <> ''
             or coalesce(after_screenshot_url, '') <> ''
        )::int as screenshot_count
      from applications
    `);

    console.log("[Tracker Screenshots] Migration complete.", result.rows[0]);
  } finally {
    await client.end();
  }
}

runTrackerScreenshotMigration().catch((error) => {
  console.error("[Tracker Screenshots] Migration failed:", error.message || error);
  process.exit(1);
});

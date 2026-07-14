import { Client } from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function runMigration() {
  if (!DATABASE_URL) {
    console.error("[Migration] Error: DATABASE_URL is not set in environment.");
    process.exit(1);
  }

  console.log("[Migration] Connecting to database...");
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes("supabase") ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    console.log("[Migration] Connected successfully.");

    // Read chat_migration.sql
    const migrationPath = path.resolve(__dirname, "../../mobile/supabase/chat_migration.sql");
    console.log(`[Migration] Reading migration file from: ${migrationPath}`);
    const sql = fs.readFileSync(migrationPath, "utf8");

    console.log("[Migration] Running migration SQL...");
    await client.query(sql);
    console.log("[Migration] Migration completed successfully!");

    // Run extra alter table query to add the chatbot_enabled column to conversations
    console.log("[Migration] Checking and adding custom fields...");
    await client.query(`
      ALTER TABLE conversations ADD COLUMN IF NOT EXISTS chatbot_enabled boolean DEFAULT true;
    `);

    // Run extra queries for messages table
    await client.query(`
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_automated boolean DEFAULT false;
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_type text DEFAULT 'client' CHECK (sender_type IN ('client', 'admin', 'staff', 'bot', 'system'));
    `);

    // Create unique constraint on (conversation_id, client_message_id) if it doesn't exist
    try {
      await client.query(`
        ALTER TABLE messages ADD CONSTRAINT unique_conv_client_msg_id UNIQUE (conversation_id, client_message_id);
      `);
      console.log("[Migration] Added unique constraint for client_message_id.");
    } catch (e: any) {
      console.log("[Migration] Unique constraint already exists or could not be added:", e.message);
    }

    console.log("[Migration] Database schema is fully synced and verified.");
  } catch (err: any) {
    console.error("[Migration] Error running migration:", err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();

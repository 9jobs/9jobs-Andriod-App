const fs = require('node:fs');
const path = require('node:path');
require('../dist/lib/env');
const { Client } = require('pg');
const { stripePaymentSchema } = require('../dist/services/stripePaymentStore');

async function main() {
  if (!process.env.DATABASE_URL_UNPOOLED) throw new Error('DATABASE_URL_UNPOOLED is required for migrations');
  const url = new URL(process.env.DATABASE_URL_UNPOOLED);
  url.searchParams.set('sslmode', 'verify-full');
  const client = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 10000 });
  const source = fs.readFileSync(path.resolve(__dirname, '../../mobile/supabase/schema.sql'), 'utf8');
  // Reuse the canonical schema, excluding the demo seed data that follows it.
  const seedOffset = source.indexOf('insert into system_settings');
  if (seedOffset < 0) throw new Error('Canonical schema seed boundary not found');
  await client.connect();
  try {
    await client.query('begin');
    await client.query(source.slice(0, seedOffset));
    await client.query(`
      alter table conversations add column if not exists chatbot_enabled boolean not null default true;
      alter table messages add column if not exists is_automated boolean not null default false;
      alter table messages add column if not exists sender_type text default 'client';
      create unique index if not exists messages_conversation_client_id on messages(conversation_id, client_message_id);
      alter table applications add column if not exists before_screenshot_url text default '';
      alter table applications add column if not exists after_screenshot_url text default '';
      create table if not exists cover_letters (
        id bigint generated always as identity primary key,
        user_id text not null unique references profiles(id) on delete cascade,
        content text not null default '', created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
      create table if not exists website_admin_records (
        id text primary key, model text not null, payload jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(), updated_at timestamptz not null default now()
      );
      create index if not exists website_admin_records_model_created_idx on website_admin_records(model,created_at desc);
      create index if not exists website_admin_records_payload_gin_idx on website_admin_records using gin(payload);
    `);
    await client.query(stripePaymentSchema);
    await client.query('commit');
    const result = await client.query("select count(*)::int as count from information_schema.tables where table_schema='public'");
    console.log(`PASS: Neon schema migrated transactionally (${result.rows[0].count} public tables); no demo data imported`);
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
}
main().catch(error => { console.error('Migration failed:', error.message); process.exitCode = 1; });

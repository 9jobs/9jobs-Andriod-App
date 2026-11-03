// Read-only source snapshot; destination writes commit only after parity checks.
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const dotenv = require('dotenv');
const { Client } = require('pg');
require('../dist/lib/env');

const q = name => '"' + String(name).replaceAll('"', '""') + '"';
function canonical(value) {
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return value.toString('hex');
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
const digest = row => createHash('sha256').update(JSON.stringify(canonical(row))).digest('hex');

async function main() {
  const sourceFile = process.env.SUPABASE_SOURCE_ENV || 'backend/.env';
  const sourceEnv = dotenv.parse(fs.readFileSync(sourceFile));
  const sourceUrl = new URL(sourceEnv.SUPABASE_DATABASE_URL || sourceEnv.DATABASE_URL);
  if (!sourceUrl.hostname.endsWith('.supabase.com') && !sourceUrl.hostname.endsWith('.supabase.co')) throw new Error('Expected a Supabase source URL');
  const destinationUrl = new URL(process.env.DATABASE_URL_UNPOOLED);
  if (!destinationUrl.hostname.endsWith('.neon.tech')) throw new Error('Expected a Neon destination');
  destinationUrl.searchParams.set('sslmode', 'verify-full');
  const caFile = sourceEnv.SUPABASE_CA_FILE || process.env.SUPABASE_CA_FILE;
  let ca;
  if (caFile) ca = fs.readFileSync(caFile, 'utf8');
  else {
    const response = await fetch('https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt', { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Supabase CA download failed (${response.status})`);
    ca = await response.text();
  }
  for (const parameter of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey']) sourceUrl.searchParams.delete(parameter);
  const source = new Client({ connectionString: sourceUrl.toString(), connectionTimeoutMillis: 15000, ssl: { ca, rejectUnauthorized: true } });
  const target = new Client({ connectionString: destinationUrl.toString(), connectionTimeoutMillis: 15000 });
  let sourceTransaction = false; let targetTransaction = false;
  try {
    await source.connect();
    await target.connect();
    await source.query('begin isolation level repeatable read read only'); sourceTransaction = true;
    await target.query('begin'); targetTransaction = true;
    await target.query("set local lock_timeout='10s'");
    const catalog = await source.query(`select c.table_name,c.column_name,c.data_type,c.is_generated
      from information_schema.columns c join information_schema.tables t using(table_schema,table_name)
      where c.table_schema='public' and t.table_type='BASE TABLE' order by c.table_name,c.ordinal_position`);
    const tableMap = new Map();
    for (const row of catalog.rows) {
      if (!tableMap.has(row.table_name)) tableMap.set(row.table_name, []);
      tableMap.get(row.table_name).push(row);
    }
    // Preflight every table/column before copying any rows. No overwrites or
    // guessing an unavailable source schema; the transaction rolls back on error.
    for (const [table, columns] of tableMap) {
      const destinationColumns = await target.query("select column_name from information_schema.columns where table_schema='public' and table_name=$1", [table]);
      const known = new Set(destinationColumns.rows.map(row => row.column_name));
      const missing = columns.filter(column => !known.has(column.column_name));
      if (missing.length) throw new Error(`Schema reconciliation required for ${table}: missing ${missing.map(column => column.column_name).join(', ')}`);
      const count = await target.query(`select count(*)::int as count from public.${q(table)}`);
      if (count.rows[0].count) throw new Error(`Destination ${table} is not empty; refusing to overwrite or merge live records`);
    }
    const relations = await source.query(`select child.relname as child,parent.relname as parent from pg_constraint fk
      join pg_class child on child.oid=fk.conrelid join pg_class parent on parent.oid=fk.confrelid
      join pg_namespace ns on ns.oid=child.relnamespace
      where fk.contype='f' and ns.nspname='public' and child.oid<>parent.oid`);
    const remaining = new Set(tableMap.keys()); const ordered = [];
    while (remaining.size) {
      const ready = [...remaining].filter(table => !relations.rows.some(edge => edge.child === table && remaining.has(edge.parent)));
      if (!ready.length) throw new Error('Cyclic foreign keys require a reviewed schema migration');
      for (const table of ready) { remaining.delete(table); ordered.push(table); }
    }
    for (const table of ordered) {
      const columns = tableMap.get(table);
      const writable = columns.filter(column => column.is_generated === 'NEVER');
      const names = writable.map(column => q(column.column_name)).join(',');
      const hashes = [];
      await source.query(`declare migration_rows no scroll cursor for select * from public.${q(table)}`);
      while (true) {
        const batch = await source.query('fetch 100 from migration_rows');
        if (!batch.rowCount) break;
        const values = [];
        const tuples = batch.rows.map(row => '(' + writable.map(column => {
          const value = row[column.column_name];
          values.push(['json', 'jsonb'].includes(column.data_type) && value !== null ? JSON.stringify(value) : value);
          return `$${values.length}`;
        }).join(',') + ')');
        await target.query(`insert into public.${q(table)} (${names}) overriding system value values ${tuples.join(',')}`, values);
        hashes.push(...batch.rows.map(digest));
      }
      await source.query('close migration_rows');
      const copied = await target.query(`select ${columns.map(column => q(column.column_name)).join(',')} from public.${q(table)}`);
      const actual = copied.rows.map(digest).sort();
      hashes.sort();
      if (JSON.stringify(actual) !== JSON.stringify(hashes)) throw new Error(`Parity check failed for ${table}; rolling back all imported rows`);
      for (const column of columns) {
        const sequence = await target.query('select pg_get_serial_sequence($1,$2) as name', [`public.${q(table)}`, column.column_name]);
        if (sequence.rows[0].name) {
          await target.query(`select setval($1, greatest(coalesce(max(${q(column.column_name)}),0),1), count(*)>0) from public.${q(table)}`, [sequence.rows[0].name]);
        }
      }
      console.log(`VERIFIED ${table}: ${copied.rowCount} rows; SHA-256 row parity passed`);
    }
    await target.query('commit'); targetTransaction = false;
    await source.query('rollback'); sourceTransaction = false;
    console.log('PASS: all public source records copied and verified; Supabase source was read-only');
  } finally {
    if (targetTransaction) await target.query('rollback').catch(() => {});
    if (sourceTransaction) await source.query('rollback').catch(() => {});
    await Promise.allSettled([source.end(), target.end()]);
  }
}
main().catch(error => { console.error('IMPORT NOT COMPLETED:', error.code || '', error.message); process.exitCode = 1; });

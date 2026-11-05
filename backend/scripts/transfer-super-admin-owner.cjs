// Explicit local operator recovery. No HTTP endpoint or Clerk account mutation.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const dotenv = require('dotenv');
const { base, fingerprint } = require('./super-admin-backup.cjs');

async function main() {
  const [previousId, nextId, email, backupTag, confirmation] = process.argv.slice(2);
  if (confirmation !== '--confirmed-owner-transfer' || !/^user_[a-zA-Z0-9]+$/.test(previousId || '') || !/^user_[a-zA-Z0-9]+$/.test(nextId || '') || previousId === nextId || !/^[a-f0-9]{12}$/.test(backupTag || '')) throw Error('Explicit old/new owner identities and verified backup required');
  const root = path.resolve(__dirname, '../..');
  const state = JSON.parse(fs.readFileSync(path.join(root, '.work/super-admin-local/runtime.json'), 'utf8'));
  if (!/^9jobs_local_e2e_sa_[a-f0-9]{12}$/.test(state.database)) throw Error('Isolated management target required');
  const backup = JSON.parse(fs.readFileSync(path.join(root, '.work/super-admin-backups', backupTag, 'verified.json'), 'utf8'));
  if (!backup.verified || backup.source !== state.database) throw Error('Matching restore-verified local backup required');
  assert.deepEqual(await fingerprint(state.database), backup.tables, 'Database changed since backup; take another backup');
  const privateConfig = dotenv.parse(fs.readFileSync(path.join(root, 'backend/.env.local-e2e')));
  const publicConfig = dotenv.parse(fs.readFileSync(path.join(root, 'admin-next/.env')));
  const key = publicConfig.VITE_CLERK_PUBLISHABLE_KEY || '';
  if (!key.startsWith('pk_test_') || !privateConfig.CLERK_SECRET_KEY?.startsWith('sk_test_')) throw Error('Development instance required');
  const issuer = 'https://' + Buffer.from(key.slice(8), 'base64').toString().replace(/\$$/, '');
  const headers = { Authorization: 'Bearer ' + privateConfig.CLERK_SECRET_KEY };
  const get = async endpoint => {
    const response = await fetch('https://api.clerk.com/v1/' + endpoint, { headers, redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw Error('Read-only Clerk development verification failed');
    return response.json();
  };
  const user = await get('users/' + encodeURIComponent(nextId));
  const primary = user.email_addresses?.find(address => address.id === user.primary_email_address_id);
  if (user.id !== nextId || user.banned || user.locked || primary?.verification?.status !== 'verified' || primary.email_address.toLowerCase() !== email?.trim().toLowerCase()) throw Error('Approved verified primary email must match the new owner');
  const domainPayload = await get('domains');
  const domains = Array.isArray(domainPayload) ? domainPayload : domainPayload.data;
  if (!domains?.some(domain => domain.frontend_api_url === issuer && !domain.is_satellite)) throw Error('Development issuer mismatch');
  const db = new Client({ ...base, database: state.database });
  await db.connect();
  try {
    const actual = (await db.query('select current_database() as database,host(inet_server_addr()) as address,inet_server_port() as port')).rows[0];
    if (actual.database !== state.database || actual.address !== '127.0.0.1' || actual.port !== 55439) throw Error('Actual local target mismatch');
    await db.query('begin');
    await db.query('select pg_advisory_xact_lock(91036,1)');
    const owners = (await db.query('select * from admin_management.owner_identity for update')).rows;
    if (owners.length !== 1 || owners[0].clerk_user_id !== previousId || owners[0].issuer !== issuer) throw Error('Previous protected owner mismatch');
    if ((await db.query('select 1 from admin_management.office_admins where clerk_user_id=$1', [nextId])).rowCount) throw Error('New owner already has an employee access record; controlled reconciliation required');
    // ALTER TABLE holds its lock until commit. The immutable trigger is restored
    // in this transaction before any other connection can write to this table.
    await db.query('alter table admin_management.owner_identity disable trigger protected_owner');
    const changed = await db.query('update admin_management.owner_identity set clerk_user_id=$1 where singleton=true returning clerk_user_id,issuer', [nextId]);
    if (changed.rowCount !== 1) throw Error('Exactly one owner required');
    await db.query('alter table admin_management.owner_identity enable trigger protected_owner');
    await db.query('insert into admin_management.audit_events(actor,action,target,before_value,after_value) values($1,$2,$3,$4,$5)', ['local-operator:user-approved', 'owner.transfer', nextId, JSON.stringify({ clerk_user_id: previousId, issuer }), JSON.stringify({ clerk_user_id: nextId, issuer, approvedEmail: email })]);
    await db.query('commit');
    const trigger = (await db.query("select tgenabled from pg_trigger where tgrelid='admin_management.owner_identity'::regclass and tgname='protected_owner'")).rows[0];
    assert.equal(trigger?.tgenabled, 'O');
    const unchanged = rows => rows.filter(row => row.schemaname !== 'admin_management' || !['owner_identity', 'audit_events'].includes(row.tablename));
    assert.deepEqual(unchanged(await fingerprint(state.database)), unchanged(backup.tables));
    const receipt = { database: state.database, previousOwnerId: previousId, ownerId: nextId, issuer, ownerCount: 1, immutableTriggerEnabled: true, unrelatedTablesUnchanged: true, backupTag, verifiedAt: new Date().toISOString() };
    fs.writeFileSync(path.join(root, '.work/super-admin-local/owner-transfer-verification.json'), JSON.stringify(receipt, null, 2));
    console.log('Transferred the single protected localhost owner; immutable protection restored; unrelated tables unchanged.');
  } catch (error) {
    await db.query('rollback');
    throw error;
  } finally { await db.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

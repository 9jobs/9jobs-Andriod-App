import { createHash } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import mongoose from 'mongoose';
import { createClient } from '@supabase/supabase-js';

const MODELS = [
  'Agreement', 'FortnightAgreement', 'Invoice', 'FortnightInvoice', 'ClientInfo',
  'AdminUser', 'BillingWebhookEvent', 'RateLimit', 'InterviewFeedback', 'ServiceFeedback', 'SocialBlog',
];
const TABLE = 'website_admin_records';
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'agreement-files';
const REPORT_DIRECTORY = join(process.cwd(), 'reports');

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function normalize(value) {
  if (value == null) return value;
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return value.toString('base64');
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === 'object') {
    if (typeof value.toHexString === 'function') return value.toHexString();
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
  }
  return value;
}

function recordFromMongo(model, document) {
  const value = normalize(document);
  const { _id, createdAt, updatedAt, ...payload } = value;
  return { id: String(_id), model, payload, created_at: createdAt || new Date().toISOString(), updated_at: updatedAt || createdAt || new Date().toISOString() };
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  return value;
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(canonicalize(normalize(value)))).digest('hex');
}

async function writeReport(report) {
  await mkdir(REPORT_DIRECTORY, { recursive: true });
  const path = join(REPORT_DIRECTORY, `supabase-migration-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return path;
}

async function getMongoDatabase() {
  await mongoose.connect(required('MONGODB_URI'), { bufferCommands: false });
  if (!mongoose.connection.db) throw new Error('MongoDB connection did not provide a database handle.');
  return mongoose.connection.db;
}

async function migrateRecords(mongoDb, supabase, report) {
  for (const model of MODELS) {
    const collection = mongoDb.collection(model === 'ClientInfo' ? 'clientinfos' : mongoose.pluralize()(model));
    const source = await collection.find({}).toArray();
    const rows = source.map((document) => recordFromMongo(model, document));
    let migrated = 0;
    const failures = [];
    // One document per write avoids PostgreSQL statement timeouts from large JSON payloads.
    for (let index = 0; index < rows.length; index += 1) {
      const batch = rows.slice(index, index + 1);
      const { error } = await supabase.from(TABLE).upsert(batch, { onConflict: 'id' });
      if (error) {
        failures.push({ batchStart: index, error: error.message });
        continue;
      }
      migrated += batch.length;
    }
    report.entities[model] = { source: source.length, migrated, failed: failures.length ? failures : 0 };
  }
}

async function migrateGridFs(mongoDb, supabase, report) {
  const files = mongoDb.collection('agreementFiles.files');
  const bucket = new mongoose.mongo.GridFSBucket(mongoDb, { bucketName: 'agreementFiles' });
  const source = await files.find({}).toArray();
  let migrated = 0;
  const failures = [];
  for (const file of source) {
    try {
      const chunks = [];
      for await (const chunk of bucket.openDownloadStream(file._id)) chunks.push(Buffer.from(chunk));
      const storageKey = String(file.filename)
        .split('/')
        .map((segment) => segment.replace(/[^\x20-\x7E]/g, (character) => `_u${character.codePointAt(0).toString(16)}_`))
        .join('/');
      const { error } = await supabase.storage.from(BUCKET).upload(storageKey, Buffer.concat(chunks), {
        contentType: file.contentType || 'application/octet-stream', upsert: true, metadata: normalize(file.metadata || {}),
      });
      if (error) throw new Error(error.message);
      migrated += 1;
    } catch (error) {
      failures.push({ id: String(file._id), filename: file.filename, error: error.message });
    }
  }
  report.files = { source: source.length, migrated, failed: failures };
}

async function verifyParity(mongoDb, supabase, report) {
  for (const model of MODELS) {
    const collection = mongoDb.collection(model === 'ClientInfo' ? 'clientinfos' : mongoose.pluralize()(model));
    const source = await collection.find({}).limit(20).toArray();
    const ids = source.map((document) => String(document._id));
    const { data, error } = ids.length ? await supabase.from(TABLE).select('id,payload,created_at,updated_at').eq('model', model).in('id', ids) : { data: [], error: null };
    if (error) throw new Error(`Verification query for ${model} failed: ${error.message}`);
    const destination = new Map((data || []).map((row) => [row.id, row]));
    const mismatches = [];
    for (const document of source) {
      const expected = recordFromMongo(model, document);
      const actual = destination.get(expected.id);
      if (!actual || digest(expected.payload) !== digest(actual.payload)) mismatches.push(expected.id);
    }
    report.verification[model] = { sampled: source.length, matched: source.length - mismatches.length, mismatches };
  }
}

async function main() {
  const supabase = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });
  const mongoDb = await getMongoDatabase();
  const report = { startedAt: new Date().toISOString(), entities: {}, files: null, verification: {}, status: 'running' };
  try {
    await migrateRecords(mongoDb, supabase, report);
    await migrateGridFs(mongoDb, supabase, report);
    await verifyParity(mongoDb, supabase, report);
    report.status = Object.values(report.entities).every((item) => item.failed === 0) && report.files.failed.length === 0 ? 'passed' : 'failed';
  } catch (error) {
    report.status = 'failed'; report.error = error.message;
    throw error;
  } finally {
    report.finishedAt = new Date().toISOString();
    const reportPath = await writeReport(report);
    console.log(JSON.stringify({ status: report.status, reportPath, entities: report.entities, files: report.files, verification: report.verification }, null, 2));
    await mongoose.disconnect();
  }
}

main().catch((error) => { console.error(`Migration failed: ${error.message}`); process.exitCode = 1; });

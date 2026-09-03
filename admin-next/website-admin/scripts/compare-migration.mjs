import mongoose from 'mongoose';
import { createClient } from '@supabase/supabase-js';

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

function firstDifference(left, right, path = 'payload') {
  if (JSON.stringify(left) === JSON.stringify(right)) return null;
  if (typeof left !== 'object' || left == null || typeof right !== 'object' || right == null) return { path, source: left, destination: right };
  for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
    const difference = firstDifference(left[key], right[key], `${path}.${key}`);
    if (difference) return difference;
  }
  return { path, source: left, destination: right };
}

const model = process.argv[2] || 'Agreement';
const collectionName = model === 'ClientInfo' ? 'clientinfos' : mongoose.pluralize()(model);
await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
const source = await mongoose.connection.db.collection(collectionName).findOne({});
const { _id, createdAt, updatedAt, ...payload } = normalize(source);
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await client.from('website_admin_records').select('payload').eq('id', String(_id)).single();
if (error) throw error;
console.log(JSON.stringify(firstDifference(payload, data.payload), null, 2));
await mongoose.disconnect();

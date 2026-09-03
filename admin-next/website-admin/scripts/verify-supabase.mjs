import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { error } = await client.from('website_admin_records').select('id', { count: 'exact', head: true }).limit(1);
if (error) throw new Error(`Supabase connection check failed: ${error.message}`);
console.log('Supabase server connection verified.');

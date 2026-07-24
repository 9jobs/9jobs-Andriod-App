const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hzpzpdjmmuoesxhmdiqn.supabase.co';
const supabaseKey = 'sb_publishable_WN7sFDfFEKrDavvud6Om9A_K4SUTaPZ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const tables = ['profiles', 'messages', 'conversations', 'job_categories', 'services', 'pricing_plans', 'system_settings', 'user_subscriptions', 'resume_scores', 'jobs', 'applications', 'saved_jobs'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    console.log(`Table ${table}:`, error ? `ERROR: ${error.message} (code: ${error.code})` : `OK (count: ${data ? data.length : 0})`);
  }
}

check();

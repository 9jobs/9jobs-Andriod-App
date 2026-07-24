const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://hzpzpdjmmuoesxhmdiqn.supabase.co';
const supabaseKey = 'sb_publishable_WN7sFDfFEKrDavvud6Om9A_K4SUTaPZ';
const client = createClient(supabaseUrl, supabaseKey);

async function testMessages() {
  try {
    console.log("Testing insert into messages...");
    const { error: msgErr } = await client.from("messages").insert([{
      sender_id: "preview-user-9jobs",
      recipient_id: "admin",
      content: "Test check"
    }]);
    console.log("Messages insert result:", msgErr ? `ERROR: ${msgErr.message}` : "OK");
  } catch (e) {
    console.error("Messages test error:", e);
  }
}

testMessages();

import { supabase } from "./lib/supabase";

async function checkColumns() {
  const columnsToTest = [
    "id",
    "conversation_id",
    "sender_id",
    "sender_role",
    "recipient_id",
    "message_type",
    "text",
    "content",
    "status",
    "created_at",
    "is_automated",
    "sender_type"
  ];

  console.log("Checking columns on 'messages' table...");
  for (const col of columnsToTest) {
    const { error } = await supabase
      .from("messages")
      .select(col)
      .limit(1);

    if (error) {
      console.log(`Column '${col}': MISSING (Error: ${error.message})`);
    } else {
      console.log(`Column '${col}': EXISTS`);
    }
  }
}

checkColumns();

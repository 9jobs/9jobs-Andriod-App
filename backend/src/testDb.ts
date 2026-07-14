import { supabase } from "./lib/supabase";

async function testConnection() {
  console.log("Checking DB connection and schema...");

  try {
    const { data: convData, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .limit(1);

    if (convError) {
      console.error("Error fetching conversations:", convError);
    } else {
      console.log("Conversations sample record columns:", convData && convData.length > 0 ? Object.keys(convData[0]) : "No records found");
    }

    const { data: msgData, error: msgError } = await supabase
      .from("messages")
      .select("*")
      .limit(1);

    if (msgError) {
      console.error("Error fetching messages:", msgError);
    } else {
      console.log("Messages sample record columns:", msgData && msgData.length > 0 ? Object.keys(msgData[0]) : "No records found");
    }
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

testConnection();

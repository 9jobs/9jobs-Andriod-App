import fs from "fs";

const action = process.argv[2]; // "download" or "upload"
const dbFile = process.argv[3];

const supabaseUrl = process.env.SUPABASE_URL || "https://hzpzpdjmmuoesxhmdiqn.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "sb_publishable_WN7sFDfFEKrDavvud6Om9A_K4SUTaPZ";
const bucketName = "chat-attachments";
const filename = "local_db_persistence.json";

if (!dbFile) {
  console.error("Missing dbFile path argument");
  process.exit(1);
}

async function ensureBucket() {
  const bucketUrl = `${supabaseUrl}/storage/v1/bucket`;
  try {
    await fetch(bucketUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: bucketName,
        name: bucketName,
        public: true
      })
    });
  } catch (err: any) {
    // Ignore error
  }
}

if (action === "download") {
  const url = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filename}`;
  
  (async () => {
    try {
      await ensureBucket();
      console.log(`[Sync Helper] Downloading db from: ${url}`);
      const res = await fetch(url);
      if (res.status === 200) {
        const text = await res.text();
        fs.writeFileSync(dbFile, text, "utf8");
        console.log("[Sync Helper] Downloaded db successfully.");
      } else {
        console.log("[Sync Helper] DB not found in storage or download failed with status", res.status);
      }
      process.exit(0);
    } catch (err: any) {
      console.error("[Sync Helper] Download error:", err.message);
      process.exit(0); // Exit gracefully
    }
  })();
} else if (action === "upload") {
  const url = `${supabaseUrl}/storage/v1/object/${bucketName}/${filename}`;
  
  (async () => {
    try {
      if (!fs.existsSync(dbFile)) {
        console.error(`[Sync Helper] dbFile does not exist: ${dbFile}`);
        process.exit(1);
      }
      await ensureBucket();
      const data = fs.readFileSync(dbFile, "utf8");
      console.log(`[Sync Helper] Uploading db to: ${url}`);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          "x-upsert": "true"
        },
        body: data
      });
      if (res.status === 200 || res.status === 201) {
        console.log("[Sync Helper] Uploaded db successfully.");
      } else {
        const errText = await res.text();
        console.error("[Sync Helper] Upload failed with status", res.status, errText);
      }
      process.exit(0);
    } catch (err: any) {
      console.error("[Sync Helper] Upload error:", err.message);
      process.exit(0); // Exit gracefully
    }
  })();
}

import { Client } from "pg";

async function inspectLocalPostgres() {
  const connectionString = process.env.LOCAL_DIAGNOSTIC_DATABASE_URL;
  if (!connectionString || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(connectionString).hostname)) {
    throw new Error("Set LOCAL_DIAGNOSTIC_DATABASE_URL to an authorized loopback database.");
  }
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log("Connected to local Postgres.");
    
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log("Tables in public schema:", tables.rows.map(r => r.table_name));

    await client.end();
  } catch (err: any) {
    console.error("Local database inspection failed.");
  }
}

inspectLocalPostgres();

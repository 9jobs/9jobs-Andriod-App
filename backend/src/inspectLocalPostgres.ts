import { Client } from "pg";

async function inspectLocalPostgres() {
  const client = new Client({
    connectionString: "postgres://postgres:postgres@localhost:5432/postgres"
  });

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
    console.error("Inspection failed:", err.message);
  }
}

inspectLocalPostgres();

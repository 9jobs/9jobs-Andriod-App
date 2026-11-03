import { Client } from "pg";

async function testLocalPostgres() {
  const connectionString = process.env.LOCAL_DIAGNOSTIC_DATABASE_URL;
  if (!connectionString || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(connectionString).hostname)) {
    throw new Error("Set LOCAL_DIAGNOSTIC_DATABASE_URL to an authorized loopback database.");
  }
  const configs = [{ connectionString }];

  for (const config of configs) {
    console.log("Trying the configured loopback database.");
    const client = new Client(config);
    try {
      await client.connect();
      console.log("SUCCESSFULLY CONNECTED!");
      const res = await client.query("SELECT version()");
      console.log("Postgres version:", res.rows[0].version);
      
      // Let's see if there are databases
      const dbs = await client.query("SELECT datname FROM pg_database");
      console.log("Databases:", dbs.rows.map(r => r.datname));

      await client.end();
      return;
    } catch (err: any) {
      console.log("Local database connection failed.");
    }
  }
}

testLocalPostgres();

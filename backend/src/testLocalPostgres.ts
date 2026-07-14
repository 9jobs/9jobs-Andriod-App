import { Client } from "pg";

async function testLocalPostgres() {
  const configs = [
    { connectionString: "postgres://postgres:postgres@localhost:5432/postgres" },
    { connectionString: "postgres://postgres@localhost:5432/postgres" },
    { connectionString: "postgres://postgres:postgres@127.0.0.1:5432/postgres" },
    { connectionString: "postgres://postgres:admin@localhost:5432/postgres" },
    { connectionString: "postgres://postgres:password@localhost:5432/postgres" },
  ];

  for (const config of configs) {
    console.log(`Trying connection: ${config.connectionString}`);
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
      console.log(`Failed: ${err.message}`);
    }
  }
}

testLocalPostgres();

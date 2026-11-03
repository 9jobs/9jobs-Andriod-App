const {test}=require('node:test'),assert=require('node:assert/strict');require('ts-node/register');
const {isNeonDatabase,createDatabasePool}=require('../src/lib/database');
test('localhost adapter is opt-in, rejects cloud/default databases and does not force TLS on the isolated local cluster',async()=>{
 const original={mode:process.env.LOCAL_DATABASE_MODE,url:process.env.DATABASE_URL};
 try{
  process.env.DATABASE_URL='postgresql://client_id_test@127.0.0.1:55439/9jobs_local_e2e_fixture';delete process.env.LOCAL_DATABASE_MODE;assert.equal(isNeonDatabase(),false);
  process.env.LOCAL_DATABASE_MODE='isolated-e2e';assert.equal(isNeonDatabase(),true);const pool=createDatabasePool();assert.ok(!pool.options.connectionString.includes('verify-full'));await pool.end();
  for(const value of ['postgresql://client_id_test@production.neon.tech/production','postgresql://client_id_test@127.0.0.1:5432/postgres','postgresql://postgres@127.0.0.1:55439/9jobs_local_e2e_fixture']){process.env.DATABASE_URL=value;assert.equal(isNeonDatabase(),false);assert.throws(()=>createDatabasePool(),/isolated loopback/);}
 }finally{for(const [key,value]of [['LOCAL_DATABASE_MODE',original.mode],['DATABASE_URL',original.url]])if(value===undefined)delete process.env[key];else process.env[key]=value;}
});

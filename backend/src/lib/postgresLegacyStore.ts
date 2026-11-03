// Preserve legacy feature behavior while storing its data in Postgres, not JSON.
import {AsyncLocalStorage} from 'node:async_hooks';
import {createDatabasePool,assertDevelopmentDatabase} from './database';
type State={data:any;dirty:boolean};
const context=new AsyncLocalStorage<State>();
let pool:ReturnType<typeof createDatabasePool>|undefined;
export const legacySchema=`create schema if not exists legacy_store;
revoke all on schema legacy_store from public;
create table if not exists legacy_store.state(id integer primary key check(id=1),payload jsonb not null,updated_at timestamptz not null default now());`;
export function requiresPostgresLegacyStore(){return process.env.DATABASE_PERSISTENCE==='postgres-only';}
export function legacyTransactionActive(){return !!context.getStore();}
export function readPostgresLegacyState(){const state=context.getStore();if(!state)throw new Error('Postgres persistence transaction required');return state.data;}
export function writePostgresLegacyState(data:any){const state=context.getStore();if(!state)throw new Error('Postgres persistence transaction required');state.data=data;state.dirty=true;}
export async function withPostgresLegacyStore<T>(operation:()=>Promise<T>):Promise<T>{
 if(context.getStore())return operation();
 assertDevelopmentDatabase();
 pool??=createDatabasePool();
 const client=await pool.connect();
 try{
  await client.query('begin');
  // The short compatibility operation holds a row lock; concurrent updates cannot
  // lose changes. Network/AI calls remain outside this transaction in the route.
  const row=(await client.query('select payload from legacy_store.state where id=1 for update')).rows[0];
  if(!row)throw new Error('Legacy data migration must be verified before startup');
  const state:State={data:row.payload,dirty:false};
  const result=await context.run(state,operation);
  if(state.dirty)await client.query('update legacy_store.state set payload=$1,updated_at=now() where id=1',[JSON.stringify(state.data)]);
  await client.query('commit');return result;
 }catch(error){await client.query('rollback').catch(()=>{});throw error;}
 finally{client.release();}
}
export async function closePostgresLegacyStore(){if(pool){await pool.end();pool=undefined;}}

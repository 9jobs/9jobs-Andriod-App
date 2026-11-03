import { Pool } from 'pg';

let pool;
function database() {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) throw new Error('Neon DATABASE_URL is not configured');
  const url = new URL(process.env.DATABASE_URL);
  if (!url.hostname.endsWith('.neon.tech')) throw new Error('Expected a Neon database');
  url.searchParams.set('sslmode', 'verify-full');
  pool = new Pool({ connectionString: url.toString(), max: 3, connectionTimeoutMillis: 10000, idleTimeoutMillis: 10000 });
  pool.on('error', () => console.error('[Website admin] Idle Neon connection lost'));
  return pool;
}
function identifier(value) {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error('Invalid column');
  return `"${value}"`;
}
class RecordQuery {
  constructor() { this.filters = []; this.operation = 'select'; }
  select(columns = '*') { this.columns = columns; return this; }
  eq(column, value) { this.filters.push({ column, values: [value], operator: '=' }); return this; }
  in(column, values) { this.filters.push({ column, values, operator: 'in' }); return this; }
  upsert(record) { this.record = record; this.operation = 'upsert'; return this; }
  delete() { this.operation = 'delete'; return this; }
  order(column, { ascending = true } = {}) { this.orderBy = { column, ascending }; return this; }
  limit(count) { if (!Number.isInteger(count) || count < 0 || count > 10000) throw new Error('Invalid limit'); this.limitCount = count; return this; }
  then(resolve, reject) { return this.execute().then(resolve, reject); }
  async execute() {
    try {
      const values = [];
      const bind = value => { values.push(value); return `$${values.length}`; };
      let sql;
      if (this.operation === 'upsert') {
        const keys = Object.keys(this.record);
        sql = `insert into website_admin_records (${keys.map(identifier)}) values (${keys.map(key => bind(this.record[key]))})
          on conflict(id) do update set ${keys.filter(key => key !== 'id').map(key => `${identifier(key)}=excluded.${identifier(key)}`)} returning *`;
      } else {
        const conditions = this.filters.map(filter => {
          if (filter.operator === 'in') return filter.values.length ? `${identifier(filter.column)} in (${filter.values.map(bind)})` : 'false';
          return `${identifier(filter.column)}=${bind(filter.values[0])}`;
        });
        if (this.operation === 'delete' && !conditions.length) throw new Error('Unfiltered delete is forbidden');
        const columns = this.columns === '*' || !this.columns ? '*' : this.columns.split(',').map(identifier).join(',');
        sql = this.operation === 'delete' ? 'delete from website_admin_records' : `select ${columns} from website_admin_records`;
        if (conditions.length) sql += ` where ${conditions.join(' and ')}`;
        if (this.operation === 'select' && this.orderBy) sql += ` order by ${identifier(this.orderBy.column)} ${this.orderBy.ascending ? 'asc' : 'desc'}`;
        if (this.operation === 'select' && this.limitCount !== undefined) sql += ` limit ${bind(this.limitCount)}`;
      }
      const result = await database().query(sql, values);
      return { data: result.rows, error: null };
    } catch (error) { return { data: null, error }; }
  }
}
export function getNeonRecordClient() {
  return { from(table) {
    if (table !== 'website_admin_records') throw new Error('Unsupported website-admin table');
    return new RecordQuery();
  } };
}

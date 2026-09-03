import { randomBytes } from 'crypto';

import { getSupabaseServerClient } from '@/lib/supabase/server';

const TABLE = 'website_admin_records';
const DATE_FIELD = /(?:At|Date)$/;

function getPath(value, path) {
  return path.split('.').reduce((current, part) => (current == null ? undefined : current[part]), value);
}

function setPath(value, path, nextValue) {
  const parts = path.split('.');
  const last = parts.pop();
  const target = parts.reduce((current, part) => {
    if (!current[part] || typeof current[part] !== 'object') current[part] = {};
    return current[part];
  }, value);
  target[last] = nextValue;
}

function removePath(value, path) {
  const parts = path.split('.');
  const last = parts.pop();
  const target = parts.reduce((current, part) => current?.[part], value);
  if (target && typeof target === 'object') delete target[last];
}

function normalize(value) {
  if (value == null) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === 'object') {
    if (typeof value.toHexString === 'function') return value.toHexString();
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
  }
  return value;
}

function hydrate(value, key = '') {
  if (value == null) return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((item) => hydrate(item));
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, hydrate(item, name)]));
  if (DATE_FIELD.test(key) && typeof value === 'string' && !Number.isNaN(Date.parse(value))) return new Date(value);
  return value;
}

function comparable(value) {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value.toHexString === 'function') return value.toHexString();
  return value;
}

function equal(left, right) { return String(comparable(left)) === String(comparable(right)); }

function matchesValue(actual, expected) {
  if (expected && typeof expected === 'object' && !Array.isArray(expected) && !(expected instanceof Date)) {
    return Object.entries(expected).every(([operator, operand]) => {
      if (operator === '$in') return operand.some((item) => equal(actual, item));
      if (operator === '$nin') return !operand.some((item) => equal(actual, item));
      if (operator === '$ne') return !equal(actual, operand);
      if (operator === '$exists') return Boolean(actual !== undefined) === Boolean(operand);
      if (operator === '$lte') return comparable(actual) <= comparable(operand);
      if (operator === '$lt') return comparable(actual) < comparable(operand);
      if (operator === '$gte') return comparable(actual) >= comparable(operand);
      if (operator === '$gt') return comparable(actual) > comparable(operand);
      if (operator === '$regex') return new RegExp(operand, expected.$options || '').test(String(actual || ''));
      if (operator === '$options') return true;
      return false;
    });
  }
  return equal(actual, expected);
}

function matches(document, filter = {}) {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === '$or') return expected.some((item) => matches(document, item));
    if (key === '$and') return expected.every((item) => matches(document, item));
    return matchesValue(getPath(document, key), expected);
  });
}

function applyUpdate(document, update = {}) {
  const next = structuredClone(normalize(document));
  const operators = Object.keys(update).filter((key) => key.startsWith('$'));
  if (!operators.length) Object.entries(update).forEach(([key, value]) => setPath(next, key, normalize(value)));
  if (update.$set) Object.entries(update.$set).forEach(([key, value]) => setPath(next, key, normalize(value)));
  if (update.$unset) Object.keys(update.$unset).forEach((key) => removePath(next, key));
  if (update.$inc) Object.entries(update.$inc).forEach(([key, value]) => setPath(next, key, (Number(getPath(next, key)) || 0) + Number(value)));
  if (update.$push) Object.entries(update.$push).forEach(([key, value]) => setPath(next, key, [...(Array.isArray(getPath(next, key)) ? getPath(next, key) : []), normalize(value)]));
  return next;
}

function mongoId() { return randomBytes(12).toString('hex'); }

const MODEL_DEFAULTS = {
  Agreement: { notes: '', status: 'draft', envelopeEvents: [], clientSignature: {}, providerSignature: {} },
  FortnightAgreement: { notes: '', status: 'draft', envelopeEvents: [], clientSignature: {}, providerSignature: {} },
  Invoice: { status: 'draft' },
  FortnightInvoice: { status: 'draft' },
};

class SupabaseDocument {
  constructor(model, data) {
    Object.assign(this, hydrate(data));
    Object.defineProperty(this, '__model', { value: model, enumerable: false });
  }
  toObject() { return normalize(Object.fromEntries(Object.entries(this).filter(([key]) => !key.startsWith('__')))); }
  toJSON() { return this.toObject(); }
  async save() {
    const now = new Date().toISOString();
    this.updatedAt = new Date(now);
    const payload = this.toObject();
    delete payload._id;
    delete payload.createdAt;
    delete payload.updatedAt;
    const { error } = await getSupabaseServerClient().from(TABLE).upsert({
      id: String(this._id), model: this.__model, payload, created_at: normalize(this.createdAt), updated_at: now,
    }, { onConflict: 'id' });
    if (error) throw new Error(`Supabase save failed: ${error.message}`);
    return this;
  }
}

class SupabaseQuery {
  constructor(model, filter = {}, one = false) { Object.assign(this, { model, filter, one, sortSpec: null, limitCount: null, skipCount: 0, asLean: false }); }
  sort(spec) { this.sortSpec = spec; return this; }
  select() { return this; }
  hint() { return this; }
  populate() { return this; }
  limit(count) { this.limitCount = count; return this; }
  skip(count) { this.skipCount = count; return this; }
  lean() { this.asLean = true; return this; }
  async exec() {
    const { data, error } = await getSupabaseServerClient().from(TABLE).select('id,payload,created_at,updated_at').eq('model', this.model);
    if (error) throw new Error(`Supabase query failed: ${error.message}`);
    let documents = (data || []).map((row) => ({ _id: row.id, ...hydrate(row.payload || {}), createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at) })).filter((document) => matches(document, this.filter));
    if (this.sortSpec) documents.sort((a, b) => {
      for (const [field, direction] of Object.entries(this.sortSpec)) {
        const left = comparable(getPath(a, field)); const right = comparable(getPath(b, field));
        if (left < right) return -1 * direction;
        if (left > right) return 1 * direction;
      }
      return 0;
    });
    documents = documents.slice(this.skipCount, this.limitCount == null ? undefined : this.skipCount + this.limitCount);
    const result = this.asLean ? documents.map(normalize) : documents.map((document) => new SupabaseDocument(this.model, document));
    return this.one ? result[0] || null : result;
  }
  then(resolve, reject) { return this.exec().then(resolve, reject); }
  catch(reject) { return this.exec().catch(reject); }
}

function createCollection(model) {
  return { find(filter = {}) {
    const query = new SupabaseQuery(model, filter);
    return { hint() { return this; }, sort(spec) { query.sort(spec); return this; }, async toArray() { return query.lean().exec(); } };
  } };
}

export function getSupabaseModel(model) {
  function Model(values = {}) {
    const now = new Date();
    return new SupabaseDocument(model, {
      ...MODEL_DEFAULTS[model], ...normalize(values), _id: String(values?._id || mongoId()), createdAt: values.createdAt || now, updatedAt: values.updatedAt || now,
    });
  }
  Object.assign(Model, {
    collection: createCollection(model),
    find(filter = {}) { return new SupabaseQuery(model, filter); },
    findOne(filter = {}) { return new SupabaseQuery(model, filter, true); },
    findById(id) { return new SupabaseQuery(model, { _id: String(id) }, true); },
    async create(values) {
      const document = new Model(values);
      return document.save();
    },
    async findByIdAndUpdate(id, update, options = {}) {
      const existing = await new SupabaseQuery(model, { _id: String(id) }, true).exec(); if (!existing) return null;
      const next = new SupabaseDocument(model, applyUpdate(existing.toObject(), update)); await next.save(); return options.new ? next : existing;
    },
    async findOneAndUpdate(filter, update, options = {}) {
      const existing = await new SupabaseQuery(model, filter, true).exec();
      if (!existing) { if (!options.upsert) return null; const created = await this.create(applyUpdate({ ...filter }, update)); return options.new ? created : null; }
      const next = new SupabaseDocument(model, applyUpdate(existing.toObject(), update)); await next.save(); return options.new ? next : existing;
    },
    async updateOne(filter, update, options = {}) {
      const existing = await new SupabaseQuery(model, filter, true).exec();
      if (!existing) { if (options.upsert) await this.create(applyUpdate({ ...filter }, update)); return { acknowledged: true, matchedCount: 0, modifiedCount: 0 }; }
      const next = new SupabaseDocument(model, applyUpdate(existing.toObject(), update)); await next.save(); return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
    },
    async updateMany(filter, update) {
      const documents = await new SupabaseQuery(model, filter).exec();
      await Promise.all(documents.map(async (document) => { const next = new SupabaseDocument(model, applyUpdate(document.toObject(), update)); await next.save(); }));
      return { acknowledged: true, matchedCount: documents.length, modifiedCount: documents.length };
    },
    async deleteOne(filter) { const existing = await new SupabaseQuery(model, filter, true).exec(); if (!existing) return { acknowledged: true, deletedCount: 0 }; const { error } = await getSupabaseServerClient().from(TABLE).delete().eq('id', String(existing._id)); if (error) throw new Error(`Supabase delete failed: ${error.message}`); return { acknowledged: true, deletedCount: 1 }; },
    async deleteMany(filter = {}) { const documents = await new SupabaseQuery(model, filter).exec(); if (!documents.length) return { acknowledged: true, deletedCount: 0 }; const { error } = await getSupabaseServerClient().from(TABLE).delete().in('id', documents.map((document) => String(document._id))); if (error) throw new Error(`Supabase delete failed: ${error.message}`); return { acknowledged: true, deletedCount: documents.length }; },
    async findByIdAndDelete(id) { const existing = await new SupabaseQuery(model, { _id: String(id) }, true).exec(); if (!existing) return null; const { error } = await getSupabaseServerClient().from(TABLE).delete().eq('id', String(id)); if (error) throw new Error(`Supabase delete failed: ${error.message}`); return existing; },
    async countDocuments(filter = {}) { return (await new SupabaseQuery(model, filter).exec()).length; },
    async exists(filter = {}) { const document = await new SupabaseQuery(model, filter, true).exec(); return document ? { _id: document._id } : null; },
  });
  return Model;
}

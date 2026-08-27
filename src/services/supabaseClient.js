// src/services/supabaseClient.js
//
// This file used to create a real @supabase/supabase-js client. Now it
// creates a lookalike object with the same `.from(table).select()...`
// shape, so every other file in this app (db.js, franchiseDb.js, etc.)
// keeps working completely unchanged. Under the hood, every call sends a
// request to /api/query, a small backend function that runs the equivalent
// SQL against Rivestack.
//
// Two things intentionally work differently than before:
// 1. Realtime (`supabase.channel(...)`) is emulated with polling
// (checking for changes every few seconds) instead of an instant
// push — good enough for a chat panel or draft room, just not
// millisecond-instant.
// 2. File uploads (`supabase.storage...`) are stubbed out for now and
// will return a clear error until storage is set up in a follow-up
// step.

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.action = null;
    this.columns = '*';
    this.filters = [];
    this._order = null;
    this._limit = null;
    this._single = false;
    this._maybeSingle = false;
    this.values = null;
    this.onConflict = null;
    this._promise = null;
  }

  select(cols) {
    if (!this.action) this.action = 'select';
    if (cols) this.columns = cols;
    return this;
  }

  insert(rows) {
    this.action = 'insert';
    this.values = rows;
    return this;
  }

  update(obj) {
    this.action = 'update';
    this.values = obj;
    return this;
  }

  upsert(rows, opts) {
    this.action = 'upsert';
    this.values = rows;
    this.onConflict = opts?.onConflict || null;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(column, value) { this.filters.push({ column, op: 'eq', value }); return this; }
  neq(column, value) { this.filters.push({ column, op: 'neq', value }); return this; }
  gt(column, value) { this.filters.push({ column, op: 'gt', value }); return this; }
  gte(column, value) { this.filters.push({ column, op: 'gte', value }); return this; }
  lt(column, value) { this.filters.push({ column, op: 'lt', value }); return this; }
  lte(column, value) { this.filters.push({ column, op: 'lte', value }); return this; }
  like(column, value) { this.filters.push({ column, op: 'like', value }); return this; }
  ilike(column, value) { this.filters.push({ column, op: 'ilike', value }); return this; }
  in(column, values) { this.filters.push({ column, op: 'in', value: values }); return this; }
  is(column, value) { this.filters.push({ column, op: 'is', value }); return this; }

  order(column, opts) { this._order = { column, ascending: opts?.ascending !== false }; return this; }
  limit(n) { this._limit = n; return this; }
  single() { this._single = true; return this; }
  maybeSingle() { this._maybeSingle = true; return this; }

  async _run() {
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: this.table,
        action: this.action || 'select',
        columns: this.columns,
        filters: this.filters,
        order: this._order,
        limit: this._limit,
        single: this._single,
        maybeSingle: this._maybeSingle,
        values: this.values,
        onConflict: this.onConflict,
      }),
    });
    return res.json();
  }

  then(resolve, reject) {
    if (!this._promise) this._promise = this._run();
    return this._promise.then(resolve, reject);
  }

  catch(reject) {
    return this.then(undefined, reject);
  }
}

// ── Realtime emulation via polling ──────────────────────────────────────
class PollingChannel {
  constructor(name) {
    this.name = name;
    this.subscriptions = [];
    this.intervalId = null;
    this.lastRows = new Map();
  }

  on(event, config, callback) {
    this.subscriptions.push({ config, callback });
    return this;
  }

  subscribe() {
    const POLL_MS = 12000;
    this.intervalId = setInterval(async () => {
      for (const sub of this.subscriptions) {
        try {
          const { table, filter } = sub.config;
          let builder = new QueryBuilder(table).select('*');
          if (filter) {
            const m = filter.match(/^([^=]+)=eq\.(.*)$/);
            if (m) builder = builder.eq(m[1], m[2]);
          }
          const { data } = await builder;
          if (!Array.isArray(data)) continue;

          const rowMap = new Map(data.map((row) => [row.id, row]));
          const previous = this.lastRows.get(sub) || new Map();
          const added = data.filter((row) => !previous.has(row.id));
          const removed = Array.from(previous.values()).filter((row) => !rowMap.has(row.id));
          if (added.length || removed.length) {
            sub.callback({ eventType: 'postgres_changes', payload: { new: added, old: removed } });
          }
          this.lastRows.set(sub, rowMap);
        } catch (err) {
          console.error('PollingChannel error:', err);
        }
      }
    }, POLL_MS);
    return this;
  }

  unsubscribe() {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}

// ── Storage stub (file uploads land here until set up separately) ───────
const storageStub = {
  from(_bucket) {
    return {
      async upload() {
        return { data: null, error: { message: 'Storage bucket not connected yet — file uploads are a follow-up step.' } };
      },
      getPublicUrl(_path) {
        return { data: { publicUrl: null } };
      },
    };
  },
};

export const supabase = {
  from(table) {
    return new QueryBuilder(table);
  },
  channel(name) {
    return new PollingChannel(name);
  },
  removeChannel(channel) {
    if (channel && typeof channel.unsubscribe === 'function') channel.unsubscribe();
  },
  storage: storageStub,
};

// ── Backend health check ─────────────────────────────────────────
// db.js silently falls back to per-browser localStorage any time /api/query
// fails (missing DATABASE_URL, DB unreachable, table not migrated, etc).
// That fallback is what keeps the app usable offline/locally, but it also
// means a broken backend produces no visible error — teams/players just
// quietly stop showing up on other devices. This lets the UI (see
// SyncStatusBanner) surface that state instead of it being invisible.
let _healthCache = null; // { ok, checkedAt, error }
export async function checkBackendHealth(forceRecheck = false) {
  if (_healthCache && !forceRecheck && Date.now() - _healthCache.checkedAt < 60000) {
    return _healthCache;
  }
  try {
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'nova_teams', action: 'select', columns: 'id', limit: 1 }),
    });
    const json = await res.json();
    _healthCache = {
      ok: !json.error,
      checkedAt: Date.now(),
      error: json.error ? (json.error.message || 'Unknown error') : null,
    };
  } catch (err) {
    _healthCache = { ok: false, checkedAt: Date.now(), error: err.message || 'Network error' };
  }
  return _healthCache;
}

export default supabase;

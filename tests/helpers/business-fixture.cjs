const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const { loadTs } = require('./load-ts.cjs');
const { createCloudSync } = loadTs('src/services/cloudSync.ts');
async function fixture(t) {
  const { cloudResponse } = await import('../../server/cloudflare/cloud-api.mjs');
  const { adminResponse, weeklyAdmin } = await import('../../server/cloudflare/admin-auth.mjs');
  const db = new DatabaseSync(':memory:'); t.after(() => db.close());
  for (const name of ['schema.sql', 'cloud-schema.sql', 'diagnostics-schema.sql', 'store-schema.sql']) db.exec(fs.readFileSync('server/cloudflare/' + name, 'utf8'));
  db.prepare("INSERT INTO stores(id, name, active) VALUES('seabra-2', 'Seabra 2', 1)").run();
  const statement = (sql, args = []) => ({ bind: (...values) => statement(sql, values), first: async () => db.prepare(sql).get(...args), all: async () => ({ results: db.prepare(sql).all(...args) }), run: async () => ({ meta: { changes: db.prepare(sql).run(...args).changes } }) });
  const env = { DB: { prepare: statement }, ADMIN_PASSWORD_SECRET: 'test-only-secret-not-for-deployment-1234', ADMIN_VIEW_TOKEN: 'owner-panel-password' };
  const call = (path, data, token) => cloudResponse(new Request('https://example.com/cloud' + path, { method: data === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) }), env);
  const session = async storeId => {
    const admin = await weeklyAdmin(env.ADMIN_PASSWORD_SECRET, Date.now(), 0, storeId);
    const value = await (await call('/login', { storeId, username: 'admin', password: admin.password })).json();
    assert.ok(value.token); return { token: value.token, storeId, username: 'admin' };
  };
  const a = await session('seabra-1'), b = await session('seabra-2');
  const modules = (storeId, preorders, cash, customers = false, preparation = false) => { db.prepare('INSERT INTO store_modules(store_id, preorders, cash) VALUES(?, ?, ?) ON CONFLICT(store_id) DO UPDATE SET preorders = excluded.preorders, cash = excluded.cash').run(storeId, Number(preorders), Number(cash)); db.prepare('INSERT INTO store_customer_modules(store_id, enabled) VALUES(?, ?) ON CONFLICT(store_id) DO UPDATE SET enabled = excluded.enabled').run(storeId, Number(customers)); db.prepare('INSERT INTO store_preparation_modules(store_id, enabled) VALUES(?, ?) ON CONFLICT(store_id) DO UPDATE SET enabled = excluded.enabled').run(storeId, Number(preparation)); };
  const cash = async (data, s = a) => { const response = await call('/cash', data, s.token); return { status: response.status, value: await response.json() }; };
  function tablet(saved = new Map(), s = a) {
    let offline = false, loseCashAck = false;
    const cloud = createCloudSync({ getItem: async key => saved.get(key) ?? null, setItem: async (key, value) => saved.set(key, value) }, 'https://example.com/cloud', randomUUID, async () => ({}), async (url, options) => {
      if (offline) throw Error('offline');
      const response = await cloudResponse(new Request(url, options), env);
      if (loseCashAck && url.endsWith('/cash')) { loseCashAck = false; throw Error('lost acknowledgement'); }
      return response;
    }, s.storeId);
    return { cloud, saved, session: s, set offline(value) { offline = value; }, set loseCashAck(value) { loseCashAck = value; } };
  }
  return { db, env, call, cash, a, b, modules, tablet, adminResponse };
}
module.exports = { fixture };

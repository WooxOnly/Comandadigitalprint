const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID, randomBytes, pbkdf2Sync } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const ts = require('typescript');
const exportsTS = {};
new Function('exports', 'require', ts.transpileModule(fs.readFileSync('src/services/cloudSync.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(exportsTS, (name) => name === '../../shared/cloud-validation.mjs' ? require('../shared/cloud-validation.mjs') : require(name));
const { createCloudSync } = exportsTS;
async function fixture() {
  const { cloudResponse } = await import('../server/cloudflare/cloud-api.mjs');
  const { weeklyAdmin } = await import('../server/cloudflare/admin-auth.mjs');
  const database = new DatabaseSync(':memory:');
  database.exec(fs.readFileSync('server/cloudflare/schema.sql', 'utf8'));
  database.exec(fs.readFileSync('server/cloudflare/cloud-schema.sql', 'utf8'));
  database.exec(fs.readFileSync('server/cloudflare/diagnostics-schema.sql', 'utf8'));
  const statement = (sql, args = []) => ({
    bind: (...values) => statement(sql, values),
    first: async () => database.prepare(sql).get(...args),
    all: async () => ({ results: database.prepare(sql).all(...args) }),
    run: async () => { const result = database.prepare(sql).run(...args); return { meta: { changes: result.changes } }; },
  });
  const env = { ADMIN_PASSWORD_SECRET: 'test-only-secret-not-for-deployment-1234', DB: { prepare: statement } };
  const request = (path, data, token) => cloudResponse(new Request('https://example.com/cloud' + path, { method: data === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) }), env);
  const admin = await weeklyAdmin(env.ADMIN_PASSWORD_SECRET);
  const login = await (await request('/login', { username: 'admin', password: admin.password })).json();
  function tablet(saved = new Map(), seed = {}) {
    let offline = false, loseAck = false, failWrite = false, afterWrite;
    const storage = { getItem: async (key) => saved.get(key) ?? null, setItem: async (key, value) => { if (failWrite) throw Error('disk full'); saved.set(key, value); } };
    const fetcher = async (url, options) => {
      if (offline) throw Error('offline');
      const result = await cloudResponse(new Request(url, options), env);
      if (afterWrite && url.endsWith('/change')) { const callback = afterWrite; afterWrite = null; await callback(); }
      if (loseAck && url.endsWith('/change')) { loseAck = false; throw Error('response lost'); }
      return result;
    };
    const cloud = createCloudSync(storage, 'https://example.com/cloud', randomUUID, async () => seed, fetcher);
    return { cloud, saved, set offline(v) { offline = v; }, set loseAck(v) { loseAck = v; }, set failWrite(v) { failWrite = v; }, set afterWrite(v) { afterWrite = v; } };
  }
  return { database, request, token: login.token, tablet };
}
const order = (tabletId) => ({ id: tabletId + '-' + randomUUID(), tabletId, plate: '7', customer: 'Teste', createdAt: new Date().toISOString(), items: [{ id: 'pizza', name: 'Pizza de dois sabores', category: 'Pizzas', quantity: 2, note: 'Sem cebola', flavors: ['Calabresa', 'Atum'], extras: [{ name: 'Bacon', placement: 'second' }] }] });

test('an acknowledgement for an older edit cannot remove a newer queued edit', async () => {
  const f = await fixture();
  try {
    const a = f.tablet(); await a.cloud.setSession({ username: 'admin', token: f.token }); await a.cloud.sync();
    let arrived, release;
    const waiting = new Promise((resolve) => { arrived = resolve; });
    const hold = new Promise((resolve) => { release = resolve; });
    a.afterWrite = async () => { arrived(); await hold; };
    await a.cloud.write({ 'order-settings': { requireCustomer: true } });
    await waiting;
    await a.cloud.write({ 'order-settings': { requireCustomer: false } });
    release(); await a.cloud.sync();
    assert.equal(a.cloud.pending('order-settings'), true);
    assert.deepEqual(await a.cloud.get('order-settings'), { requireCustomer: false });
    await a.cloud.sync();
    assert.equal(a.cloud.pending('order-settings'), false);
    assert.deepEqual(JSON.parse(f.database.prepare("SELECT data FROM cloud_records WHERE key = 'order-settings'").get().data), { requireCustomer: false });
  } finally { f.database.close(); }
});

test('two tablets queue offline orders, survive restart, retry lost acknowledgements and restore on a fresh tablet', async () => {
  const f = await fixture();
  try {
    const a = f.tablet(), b = f.tablet();
    for (const t of [a, b]) { await t.cloud.setSession({ username: 'admin', token: f.token }); await t.cloud.sync(); t.offline = true; }
    const aId = a.cloud.identity(), bId = b.cloud.identity(); assert.notEqual(aId, bId);
    const first = order(aId), second = order(bId);
    await a.cloud.write({ ['order:' + first.id]: first }); await a.cloud.sync();
    await b.cloud.write({ ['order:' + second.id]: second }); await b.cloud.sync();
    assert.equal(a.cloud.pending('order:' + first.id), true);
    assert.equal(b.cloud.pending('order:' + second.id), true);
    const restarted = f.tablet(a.saved); await restarted.cloud.load(); assert.equal(restarted.cloud.identity(), aId);
    await restarted.cloud.setSession({ username: 'admin', token: f.token });
    restarted.loseAck = true; await restarted.cloud.sync();
    assert.equal(restarted.cloud.pending('order:' + first.id), true);
    await restarted.cloud.sync();
    assert.equal(restarted.cloud.pending('order:' + first.id), false);
    b.offline = false; await b.cloud.sync(); await restarted.cloud.sync();
    assert.equal((await b.cloud.list('order:')).length, 2);
    assert.equal((await restarted.cloud.list('order:')).length, 2);
    assert.equal(f.database.prepare("SELECT count(*) AS n FROM cloud_events WHERE key LIKE 'order:%'").get().n, 2);
    const clean = f.tablet(); await clean.cloud.setSession({ username: 'admin', token: f.token }); await clean.cloud.sync();
    assert.notEqual(clean.cloud.identity(), aId);
    assert.deepEqual((await clean.cloud.list('order:')).map((o) => o.id).sort(), [first.id, second.id].sort());
    clean.failWrite = true;
    const failed = order(clean.cloud.identity());
    await assert.rejects(clean.cloud.write({ ['order:' + failed.id]: failed }));
    assert.equal(await clean.cloud.get('order:' + failed.id), undefined);
  } finally { f.database.close(); }
});

test('concurrent menu edits are preserved as a conflict and printer settings remain separate', async () => {
  const f = await fixture();
  try {
    const a = f.tablet(), b = f.tablet();
    for (const t of [a, b]) { await t.cloud.setSession({ username: 'admin', token: f.token }); await t.cloud.sync(); t.offline = true; }
    const menuA = [{ id: 'pizza', name: 'Pizza A', category: 'Pizzas', price: 0 }], menuB = [{ ...menuA[0], name: 'Pizza B' }];
    await a.cloud.write({ menu: menuA }); await a.cloud.sync();
    await b.cloud.write({ menu: menuB }); await b.cloud.sync();
    a.offline = false; await a.cloud.sync(); b.offline = false; await b.cloud.sync();
    assert.equal(b.cloud.status().status, 'CONFLICT');
    assert.deepEqual(await b.cloud.get('menu'), menuB);
    await b.cloud.resolve('menu', true); await a.cloud.sync();
    assert.deepEqual(await a.cloud.get('menu'), menuB);
    const printer = { connection: 'system', name: 'Cozinha', address: '', port: '9100', paperWidth: '58' };
    await a.cloud.write({ ['printer:' + a.cloud.identity()]: printer }); await a.cloud.sync();
    await b.cloud.write({ ['printer:' + b.cloud.identity()]: { ...printer, paperWidth: '80' } }); await b.cloud.sync(); await a.cloud.sync();
    assert.equal((await a.cloud.get('printer:' + a.cloud.identity())).paperWidth, '58');
    assert.equal((await a.cloud.get('printer:' + b.cloud.identity())).paperWidth, '80');
  } finally { f.database.close(); }
});

test('cloud access requires login; shared users authenticate after reinstall and disabling invalidates their sessions', async () => {
  const f = await fixture();
  try {
    assert.equal((await f.request('/changes')).status, 401);
    assert.equal((await f.request('/login', { username: 'admin', password: 'wrong' })).status, 401);
    const salt = randomBytes(16).toString('hex');
    const staff = { username: 'staff', active: true, login: { salt, hash: pbkdf2Sync('123456', Buffer.from(salt, 'hex'), 100000, 32, 'sha256').toString('hex'), iterations: 100000 } };
    const admin = f.tablet(); await admin.cloud.setSession({ username: 'admin', token: f.token }); await admin.cloud.sync();
    await admin.cloud.write({ 'user:staff': staff, 'user:other': { ...staff, username: 'other' } }); await admin.cloud.sync();
    const response = await f.request('/login', { username: 'staff', password: '123456' }); assert.equal(response.status, 200);
    const login = await response.json(); assert.equal(login.credential.username, 'staff');
    const changes = await (await f.request('/changes', undefined, login.token)).json();
    assert.ok(changes.changes.some((c) => c.key === 'user:staff')); assert.ok(!changes.changes.some((c) => c.key === 'user:other'));
    assert.equal((await f.request('/change', { key: 'user:other', value: { ...staff, username: 'other' }, base: 0, id: randomUUID() }, login.token)).status, 403);
    await admin.cloud.write({ 'user:staff': { ...staff, active: false } }); await admin.cloud.sync();
    assert.equal((await f.request('/changes', undefined, login.token)).status, 401);
    assert.equal((await f.request('/login', { username: 'staff', password: '123456' })).status, 401);
  } finally { f.database.close(); }
});

test('changes paginate without losing orders, and writes cannot mutate or overwrite an existing order', async () => {
  const f = await fixture();
  try {
    const a = f.tablet(); await a.cloud.setSession({ username: 'admin', token: f.token }); await a.cloud.sync();
    a.offline = true; const entries = {};
    for (let i = 0; i < 55; i++) { const value = order(a.cloud.identity()); entries['order:' + value.id] = value; }
    await a.cloud.write(entries); await a.cloud.sync(); a.offline = false; await a.cloud.sync();
    const b = f.tablet(); await b.cloud.setSession({ username: 'admin', token: f.token }); await b.cloud.sync();
    assert.equal((await b.cloud.list('order:')).length, 55);
    const [key, value] = Object.entries(entries)[0];
    await assert.rejects(b.cloud.write({ [key]: { ...value, customer: 'changed' } }));
    const revision = f.database.prepare('SELECT revision FROM cloud_records WHERE key = ?').get(key).revision;
    assert.equal((await f.request('/change', { key, value: { ...value, customer: 'changed' }, base: revision, id: randomUUID() }, f.token)).status, 409);
  } finally { f.database.close(); }
});

 test('diagnostic uploads are authenticated, idempotent, redacted and separate from shared order data', async () => {
  const f = await fixture();
  try {
    const log = { id: randomUUID(), deviceId: randomUUID(), createdAt: new Date().toISOString(), event: 'print.failed', code: 'PRINT_TIMEOUT', password: 'must-not-be-stored' };
    assert.equal((await f.request('/diagnostics', log)).status, 401);
    for (let i = 0; i < 2; i++) assert.equal((await f.request('/diagnostics', log, f.token)).status, 200);
    const rows = f.database.prepare('SELECT * FROM diagnostics').all();
    assert.equal(rows.length, 1); assert.doesNotMatch(JSON.stringify(rows), /must-not-be-stored/);
    assert.equal((await f.request('/diagnostics', { ...log, event: '<invalid>' }, f.token)).status, 400);
    const changes = await (await f.request('/changes', undefined, f.token)).json();
    assert.equal(changes.changes.some(c => c.key.startsWith('log:')), false);
    const { adminResponse } = await import('../server/cloudflare/admin-auth.mjs');
    assert.equal((await adminResponse(new Request('https://example.com/admin/logs'), {})).status, 401);
  } finally { f.database.close(); }
});

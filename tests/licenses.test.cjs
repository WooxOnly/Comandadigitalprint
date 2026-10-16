const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID, generateKeyPairSync, webcrypto } = require('node:crypto');
const { fixture } = require('./helpers/business-fixture.cjs');
const { loadTs } = require('./helpers/load-ts.cjs');
const { createLicenseService } = loadTs('src/services/license.ts');
const { nextLicenseMonth, LICENSE_DAY, decodeLicenseCode } = require('../shared/license.mjs');
const api = require('../server/cloudflare/licenses.mjs');
const audience = 'https://example.com';
async function setup(t) {
  const f = await fixture(t), pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  f.env.LICENSE_SIGNING_PRIVATE_JWK = JSON.stringify(pair.privateKey.export({ format: 'jwk' }));
  const key = await webcrypto.subtle.importKey('jwk', pair.publicKey.export({ format: 'jwk' }), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const verify = (payload, signature) => webcrypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, Buffer.from(signature, 'hex'), Buffer.from(payload));
  const group = randomUUID();
  f.db.prepare('INSERT INTO manager_clients(id,name,store_ids) VALUES(?,?,?)').run(group, 'Customer', '["seabra-1","seabra-2"]');
  const license = () => api.clientLicense(f.env, group);
  const owner = async (input, context = {}) => api.licenseAdminResponse(new Request(audience + '/admin/license', { method: 'POST', headers: { Origin: audience, 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: group, revision: (await license()).revision, ...input }) }), f.env, { browserLogin: { accountId: 'owner-account' }, sameOrigin: true, language: 'pt', ...context });
  const tablet = (options = {}) => {
    const saved = options.saved || new Map(), deviceId = options.deviceId || randomUUID();
    let time = Date.now(), count = 0, offline = false;
    const service = createLicenseService({ storeId: 'seabra-1', audience, uuid: () => deviceId, verify, storage: { getItem: async key => saved.get(key) ?? null, setItem: async (key, value) => { saved.set(key, value); } }, now: () => time, fetcher: async (url, init) => { count++; if (offline) throw Error('offline'); const parsed = new URL(url); return Response.json(await api.tabletLicense(new Request(url, init), f.env, parsed.searchParams.get('storeId'), parsed.searchParams.get('deviceId'), time)); } });
    return { service, saved, deviceId, get count() { return count; }, set time(value) { time = value; }, get time() { return time; }, set offline(value) { offline = value; } };
  };
  return { ...f, group, license, owner, tablet, verify };
}

test('monthly anniversaries clamp short months and recover the original billing day', () => {
  const jan = Date.UTC(2028, 0, 31, 15), feb = nextLicenseMonth(jan, 31);
  assert.equal(new Date(feb).toISOString(), '2028-02-29T15:00:00.000Z');
  assert.equal(new Date(nextLicenseMonth(feb, 31)).toISOString(), '2028-03-31T15:00:00.000Z');
});
test('one customer license covers all its stores and never another customer', async t => {
  const f = await setup(t), initial = await f.license();
  assert.equal(initial.autoRenew, true); assert.equal(initial.state, 'active');
  assert.equal(await api.licenseClient(f.env, 'seabra-1'), f.group);
  assert.equal(await api.licenseClient(f.env, 'seabra-2'), f.group);
  f.db.prepare('INSERT INTO stores(id,name) VALUES(?,?)').run('other-store', 'Other');
  assert.equal(await api.licenseClient(f.env, 'other-store'), 'store:other-store');
  assert.equal((await f.owner({ action: 'block' })).status, 200);
  for (const actor of [f.a, f.b]) assert.equal((await f.call('/changes', undefined, actor.token)).status, 403);
  await api.requireStoreLicense(f.env, 'other-store');
  assert.equal((await f.owner({ action: 'resume' })).status, 200);
  assert.equal((await f.call('/changes', undefined, f.a.token)).status, 200);
});
test('automatic renewal extends calendar months, but never renews a blocked or nonrenewing license', async t => {
  const f = await setup(t), first = await f.license(), time = first.expiresAt + 90 * LICENSE_DAY;
  const renewed = await api.clientLicense(f.env, f.group, time);
  assert.ok(renewed.expiresAt > time); assert.equal(renewed.revision, first.revision + 1);
  f.db.prepare("UPDATE client_licenses SET status='blocked', expires_at=? WHERE client_id=?").run(first.expiresAt, f.group);
  assert.equal((await api.clientLicense(f.env, f.group, time)).expiresAt, first.expiresAt);
  f.db.prepare("UPDATE client_licenses SET status='active', auto_renew=0 WHERE client_id=?").run(f.group);
  assert.equal((await api.clientLicense(f.env, f.group, time)).state, 'expired');
});
test('license changes require owner authentication, same origin and current revision', async t => {
  const f = await setup(t), initial = await f.license();
  assert.equal((await f.owner({ action: 'block' }, { browserLogin: false })).status, 401);
  assert.equal((await f.owner({ action: 'block' }, { sameOrigin: false })).status, 403);
  assert.equal((await f.owner({ action: 'block', revision: initial.revision - 1 })).status, 409);
  const token = await f.adminResponse(new Request(audience + '/admin/license?clientId=' + f.group, { headers: { Authorization: 'Bearer ' + f.a.token } }), f.env);
  assert.equal(token.status, 401);
  assert.equal((await f.license()).status, 'active');
});
test('owner can set expiration, stop renewal, renew manually and audit without storing codes', async t => {
  const f = await setup(t), expiry = Date.now() - 1000;
  assert.equal((await f.owner({ action: 'save', expiresAt: expiry, autoRenew: false })).status, 200);
  assert.equal((await f.license()).state, 'expired');
  assert.equal((await f.owner({ action: 'renew' })).status, 200);
  assert.equal((await f.license()).state, 'active');
  const events = f.db.prepare('SELECT * FROM client_license_events').all();
  assert.deepEqual(events.map(row => row.action), ['save', 'renew']);
  assert.ok(events.every(row => row.actor === 'owner-account'));
});
test('tablet checks daily, keeps a valid cached license offline and blocks exactly at expiration', async t => {
  const f = await setup(t), tablet = f.tablet();
  await tablet.service.refresh(); assert.equal(tablet.service.snapshot().status, 'active');
  await tablet.service.refresh(); assert.equal(tablet.count, 1);
  const expiry = tablet.service.snapshot().expiresAt;
  tablet.offline = true; tablet.time += LICENSE_DAY;
  await tablet.service.refresh(); assert.equal(tablet.count, 2); assert.equal(tablet.service.snapshot().status, 'active');
  await tablet.service.refresh(); assert.equal(tablet.count, 2, 'failed daily checks do not repeat in a loop');
  tablet.time = expiry - 1; await tablet.service.refresh(); assert.equal(tablet.service.snapshot().status, 'active');
  tablet.time = expiry; await tablet.service.refresh(); assert.equal(tablet.service.snapshot().status, 'expired');
  tablet.time = expiry - LICENSE_DAY; await tablet.service.refresh(); assert.equal(tablet.service.snapshot().status, 'expired', 'clock rollback never extends validity');
});
test('remote block is enforced when received even if the cached expiration is in the future', async t => {
  const f = await setup(t), tablet = f.tablet(); await tablet.service.refresh();
  await f.owner({ action: 'block' });
  await tablet.service.refresh(true); assert.equal(tablet.service.snapshot().status, 'blocked');
  const restarted = f.tablet({ saved: tablet.saved }); restarted.offline = true;
  await restarted.service.refresh(); assert.equal(restarted.service.snapshot().status, 'blocked');
});
test('never-verified offline tablet can activate using a signed device-bound temporary code', async t => {
  const f = await setup(t), tablet = f.tablet(); tablet.offline = true;
  await tablet.service.refresh(); assert.equal(tablet.service.snapshot().status, 'unverified');
  const expiresAt = Date.now() + 2 * LICENSE_DAY;
  const response = await f.owner({ action: 'offline', storeId: 'seabra-1', deviceId: tablet.deviceId, expiresAt });
  assert.equal(response.status, 200); const { code } = await response.json();
  await tablet.service.applyCode(code); assert.equal(tablet.service.snapshot().status, 'active');
  assert.equal(tablet.service.snapshot().expiresAt, expiresAt);
  const restarted = f.tablet({ saved: tablet.saved }); restarted.offline = true;
  await restarted.service.refresh(); assert.equal(restarted.service.snapshot().status, 'active');
  restarted.time = expiresAt; await restarted.service.refresh(); assert.equal(restarted.service.snapshot().status, 'expired');
  const other = f.tablet(); other.offline = true; await other.service.refresh();
  await assert.rejects(other.service.applyCode(code), /INVALID_LICENSE/);
  const decoded = decodeLicenseCode(code); assert.ok(await f.verify(decoded.payload, decoded.signature));
  assert.ok(!JSON.stringify(f.db.prepare('SELECT * FROM client_license_events').all()).includes(code));
});
test('temporary codes reject tampering, expiration, wrong store/customer, excessive duration and stale permissions', async t => {
  const f = await setup(t), tablet = f.tablet(); tablet.offline = true; await tablet.service.refresh();
  for (const extra of [{ expiresAt: Date.now() - 1 }, { expiresAt: Date.now() + 32 * LICENSE_DAY }, { storeId: 'missing-store' }, { deviceId: 'bad' }]) assert.equal((await f.owner({ action: 'offline', storeId: 'seabra-1', deviceId: tablet.deviceId, expiresAt: Date.now() + LICENSE_DAY, ...extra })).status, 400);
  const { code } = await (await f.owner({ action: 'offline', storeId: 'seabra-1', deviceId: tablet.deviceId, expiresAt: Date.now() + LICENSE_DAY })).json();
  await assert.rejects(tablet.service.applyCode(code.slice(0, -1) + (code.endsWith('1') ? '2' : '1')));
  await tablet.service.applyCode(code);
  await f.owner({ action: 'block' }); tablet.offline = false; tablet.time += 1000;
  await tablet.service.refresh(true); assert.equal(tablet.service.snapshot().status, 'blocked');
  await assert.rejects(tablet.service.applyCode(code), /INVALID_LICENSE/);
});
test('a temporary offline grant is superseded by the next successful server check', async t => {
  const f = await setup(t), tablet = f.tablet(); tablet.offline = true; await tablet.service.refresh();
  await f.owner({ action: 'block' });
  const { code } = await (await f.owner({ action: 'offline', storeId: 'seabra-1', deviceId: tablet.deviceId, expiresAt: Date.now() + LICENSE_DAY })).json();
  await tablet.service.applyCode(code); assert.equal(tablet.service.snapshot().status, 'active');
  tablet.offline = false; tablet.time += 1000; await tablet.service.refresh(true);
  assert.equal(tablet.service.snapshot().status, 'blocked');
});
test('missing signing credentials cannot issue a license or an offline code', async t => {
  const f = await setup(t); delete f.env.LICENSE_SIGNING_PRIVATE_JWK;
  const response = await f.call('/license?storeId=seabra-1&deviceId=' + randomUUID());
  assert.equal(response.status, 503);
  assert.equal((await f.owner({ action: 'offline', storeId: 'seabra-1', deviceId: randomUUID(), expiresAt: Date.now() + LICENSE_DAY })).status, 503);
});
test('unassigned legacy stores receive independent licenses; ambiguous ownership fails closed', async t => {
  const f = await fixture(t);
  assert.equal(await api.licenseClient(f.env, 'seabra-1'), 'store:seabra-1');
  await api.requireStoreLicense(f.env, 'seabra-1');
  for (const name of ['First', 'Second']) f.db.prepare('INSERT INTO manager_clients(id,name,store_ids) VALUES(?,?,?)').run(randomUUID(), name, '["seabra-1"]');
  await assert.rejects(api.requireStoreLicense(f.env, 'seabra-1'), error => error.status === 409);
});

test('first offline linking verifies a signature before accepting a store and preserves the device identity', async t => {
  const f = await setup(t), pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' }), saved = new Map();
  f.env.LICENSE_SIGNING_PRIVATE_JWK = JSON.stringify(pair.privateKey.export({ format: 'jwk' }));
  const runtime = loadTs('src/services/licenseRuntime.ts', {
    'expo-secure-store': { getItemAsync: async key => saved.get(key) ?? null, setItemAsync: async (key, value) => { saved.set(key, value); } },
    'expo-crypto': { randomUUID }, 'react-native-quick-crypto': { subtle: webcrypto.subtle },
    '../config/license-public-key.json': pair.publicKey.export({ format: 'jwk' }),
    '../config/auth': { ADMIN_CREDENTIAL_ENDPOINT: audience + '/auth/admin' },
    '../config/store': { getStoreId: () => 'seabra-1' },
  });
  const deviceId = await runtime.licenseTabletId();
  const { code } = await (await f.owner({ action: 'offline', storeId: 'seabra-1', deviceId, expiresAt: Date.now() + LICENSE_DAY })).json();
  assert.equal((await runtime.offlineLicenseForLink(code)).storeId, 'seabra-1');
  await runtime.tabletLicenseService().applyCode(code);
  assert.equal(runtime.tabletLicenseService().snapshot().deviceId, deviceId);
  assert.equal(runtime.tabletLicenseService().snapshot().status, 'active');
  await assert.rejects(runtime.offlineLicenseForLink(code.slice(0, -2) + '00'));
});
test('signed cached data cannot be extended by editing its expiry, and storage failures never grant access', async t => {
  const f = await setup(t), tablet = f.tablet(); await tablet.service.refresh();
  for (const [key, code] of tablet.saved) if (key.endsWith('.snapshot')) {
    const decoded = decodeLicenseCode(code); decoded.claim.expiresAt += 366 * LICENSE_DAY;
    tablet.saved.set(key, 'BH1.' + Buffer.from(JSON.stringify(decoded.claim)).toString('hex') + '.' + decoded.signature);
  }
  const restarted = f.tablet({ saved: tablet.saved }); restarted.offline = true;
  await restarted.service.refresh(); assert.equal(restarted.service.snapshot().status, 'unverified');
  const failed = createLicenseService({ storeId: 'seabra-1', audience, uuid: randomUUID, verify: f.verify, storage: { getItem: async () => { throw Error('disk'); }, setItem: async () => { throw Error('disk'); } } });
  await assert.rejects(failed.refresh()); assert.equal(failed.snapshot().status, 'storage-error');
});
test('rolling the clock back before expiry cannot freeze an active license', async t => {
  const f = await setup(t), tablet = f.tablet(); await tablet.service.refresh();
  tablet.offline = true; tablet.time -= LICENSE_DAY;
  await tablet.service.refresh(); assert.equal(tablet.service.snapshot().status, 'clock-error');
  tablet.time += LICENSE_DAY; await tablet.service.refresh();
  assert.equal(tablet.service.snapshot().status, 'active');
});

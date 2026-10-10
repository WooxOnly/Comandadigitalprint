const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Script } = require('node:vm');
const fs = require('node:fs');
const { pbkdf2Sync } = require('node:crypto');
const { fixture } = require('./helpers/business-fixture.cjs');
const origin = 'https://example.com';
const start = Date.UTC(2026, 9, 10);
const state = f => ({ ...f.db.prepare('SELECT attempts, blocked_until FROM panel_login WHERE id = 1').get() });
async function panelLogin(f, password, now, language = 'pt') {
  const page = await f.adminResponse(new Request(origin + '/admin', { headers: { 'Accept-Language': language } }), f.env, now);
  const csrfCookie = page.headers.getSetCookie().find(value => value.startsWith('__Host-comanda_csrf=')).split(';')[0];
  return f.adminResponse(new Request(origin + '/admin/login', {
    method: 'POST', headers: { Cookie: csrfCookie, 'Content-Type': 'application/x-www-form-urlencoded', 'Accept-Language': language },
    body: new URLSearchParams({ username: 'admin', password, csrf: csrfCookie.split('=')[1] }),
  }), f.env, now);
}

test('owner login allows five failures, then blocks at six, nine, twelve and fifteen for 30, 60, 90 and 120 seconds', async t => {
  const f = await fixture(t), { provisionableStores } = await import('../server/cloudflare/admin-auth.mjs');
  const waits = { 6: 30, 9: 60, 12: 90, 15: 120 };
  let now = start;
  for (let failure = 1; failure <= 15; failure++) {
    const wait = waits[failure] ?? 0;
    const result = await provisionableStores('admin', 'wrong-password', f.env, now);
    assert.equal(result.status, wait ? 429 : 401);
    assert.equal(state(f).attempts, failure);
    assert.equal(state(f).blocked_until, wait ? now + wait * 1000 : 0);
    if (wait) {
      assert.equal(result.retryAfterSeconds, wait);
      now += wait * 1000;
    } else {
      assert.equal(result.retryAfterSeconds, undefined);
    }
  }
  assert.equal((await provisionableStores('admin', f.env.ADMIN_VIEW_TOKEN, f.env, now)).status, 200);
  assert.deepEqual(state(f), { attempts: 0, blocked_until: 0 });
  for (let failure = 1; failure <= 6; failure++) {
    const result = await provisionableStores('admin', 'wrong-password', f.env, now);
    assert.equal(result.status, failure === 6 ? 429 : 401);
    assert.equal(result.retryAfterSeconds, failure === 6 ? 30 : undefined);
  }
});

test('the real panel form stays enabled without a countdown for five failures and blocks only on the sixth', async t => {
  const f = await fixture(t);
  for (let failure = 1; failure <= 6; failure++) {
    const response = await panelLogin(f, 'wrong-password', start);
    const markup = await response.text();
    assert.equal(response.status, failure === 6 ? 429 : 401);
    assert.equal(response.headers.get('Retry-After'), failure === 6 ? '30' : null);
    assert.equal(/type="submit" disabled/.test(markup), failure === 6);
    assert.equal(markup.includes('const retryDeadline='), failure === 6);
    assert.equal(state(f).attempts, failure);
    if (failure < 6) assert.match(markup, /role="alert">Usuário ou senha incorretos\./);
    else assert.ok(markup.includes('Muitas tentativas. Tente novamente em 30 segundos.'));
  }
});

test('panel and tablet linking share the counter; blocked requests do not extend or escalate it', async t => {
  const f = await fixture(t), { provisionableStores } = await import('../server/cloudflare/admin-auth.mjs');
  for (let failure = 1; failure <= 5; failure++) {
    if (failure % 2) {
      const response = await panelLogin(f, 'wrong-password', start);
      assert.equal(response.status, 401); assert.equal(response.headers.get('Retry-After'), null);
      const markup = await response.text();
      assert.ok(!markup.includes('const retryDeadline=')); assert.doesNotMatch(markup, /type="submit" disabled/);
    } else assert.equal((await provisionableStores('admin', 'wrong-password', f.env, start)).status, 401);
  }
  const sixth = await panelLogin(f, 'wrong-password', start);
  assert.equal(sixth.status, 429); assert.equal(sixth.headers.get('Retry-After'), '30');
  const before = state(f);
  for (const elapsed of [1, 1000, 10000, 29999]) {
    for (const password of ['wrong-password', f.env.ADMIN_VIEW_TOKEN]) {
      const result = await provisionableStores('admin', password, f.env, start + elapsed);
      assert.equal(result.status, 429);
      assert.equal(result.retryAfterSeconds, Math.ceil((30000 - elapsed) / 1000));
      assert.deepEqual(state(f), before);
    }
  }
  assert.equal((await panelLogin(f, f.env.ADMIN_VIEW_TOKEN, start + 30000)).status, 303);
  assert.deepEqual(state(f), { attempts: 0, blocked_until: 0 });
});

test('simultaneous failed requests preserve the five-failure grace and each later three-failure deadline', async t => {
  const f = await fixture(t), { provisionableStores } = await import('../server/cloudflare/admin-auth.mjs');
  for (const [now, attempts, wait, allowed] of [[start, 6, 30, 5], [start + 30000, 9, 60, 2]]) {
    const results = await Promise.all(Array.from({ length: 12 }, () => provisionableStores('admin', 'wrong-password', f.env, now)));
    assert.equal(results.filter(result => result.status === 401).length, allowed);
    assert.equal(results.filter(result => result.status === 429).length, 12 - allowed);
    assert.ok(results.filter(result => result.status === 429).every(result => result.retryAfterSeconds === wait));
    assert.deepEqual(state(f), { attempts, blocked_until: now + wait * 1000 });
  }
});

test('tablet provision returns the actual retry delay in JSON and the Retry-After header', async t => {
  const f = await fixture(t);
  for (let failure = 1; failure <= 6; failure++) {
    const response = await f.call('/provision', { username: 'admin', password: 'wrong-password' });
    assert.equal(response.status, failure === 6 ? 429 : 401);
    if (failure === 6) {
      assert.equal(response.headers.get('Retry-After'), '30');
      assert.deepEqual(await response.json(), { error: 'RATE_LIMIT', retryAfterSeconds: 30 });
    } else {
      assert.equal(response.headers.get('Retry-After'), null);
      assert.deepEqual(await response.json(), { error: 'BAD_LOGIN' });
    }
  }
});

test('remaining seconds survive page reload and localize correctly, including one second', async t => {
  const f = await fixture(t), { provisionableStores } = await import('../server/cloudflare/admin-auth.mjs');
  for (let failure = 0; failure < 6; failure++) await provisionableStores('admin', 'wrong-password', f.env, start);
  const words = {
    pt: ['Muitas tentativas. Tente novamente em 30 segundos.', 'Muitas tentativas. Tente novamente em 1 segundo.'],
    en: ['Too many attempts. Try again in 30 seconds.', 'Too many attempts. Try again in 1 second.'],
    es: ['Demasiados intentos. Inténtalo de nuevo en 30 segundos.', 'Demasiados intentos. Inténtalo de nuevo en 1 segundo.'],
  };
  for (const [language, messages] of Object.entries(words)) {
    for (const [elapsed, seconds, message] of [[0, 30, messages[0]], [29999, 1, messages[1]]]) {
      const page = await f.adminResponse(new Request(origin + '/admin', { headers: { 'Accept-Language': language } }), f.env, start + elapsed);
      assert.equal(page.status, 200);
      assert.equal(page.headers.get('Retry-After'), String(seconds));
      const markup = await page.text();
      assert.ok(markup.includes(message));
      assert.match(markup, /type="submit" disabled/);
      assert.ok(!markup.includes('Aguarde 15 minutos.'));
      for (const script of markup.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new Script(script[1]);
    }
  }
});

test('the policy migration clears legacy failures once, preserves credentials and sessions, and retains new limits on reruns', async t => {
  const { provisionableStores } = await import('../server/cloudflare/admin-auth.mjs');
  const schema = fs.readFileSync('server/cloudflare/store-schema.sql', 'utf8');
  const password = 'owner8ok', salt = '1234567890abcdef1234567890abcdef';
  const hash = pbkdf2Sync(password, Buffer.from(salt, 'hex'), 100000, 32, 'sha256').toString('hex');
  for (const attempts of [2, 3, 5, 6, 9]) {
    const f = await fixture(t);
    f.db.prepare('INSERT INTO panel_password(id,salt,hash,iterations,revision) VALUES(1,?,?,100000,7)').run(salt, hash);
    f.db.prepare('UPDATE store_admin_rotation SET revision = 4 WHERE store_id = ?').run(f.a.storeId);
    const login = await panelLogin(f, password, start); assert.equal(login.status, 303);
    const cookie = login.headers.getSetCookie().find(value => value.startsWith('__Host-comanda_panel=')).split(';')[0];
    const credentials = f.db.prepare('SELECT * FROM panel_password WHERE id = 1').get();
    const rotations = f.db.prepare('SELECT * FROM store_admin_rotation ORDER BY store_id').all();
    const originalRotation = f.db.prepare('SELECT * FROM admin_rotation WHERE id = 1').get();
    f.db.prepare('DELETE FROM panel_login_policy WHERE id = 1').run();
    f.db.prepare('UPDATE panel_login SET attempts = ?, blocked_until = ? WHERE id = 1').run(attempts, attempts === 2 ? 0 : start + 900000);
    f.db.exec(schema);
    assert.deepEqual(state(f), { attempts: 0, blocked_until: 0 }, `Legacy count ${attempts}`);
    assert.equal(f.db.prepare('SELECT version FROM panel_login_policy WHERE id = 1').get().version, 2);
    assert.deepEqual(f.db.prepare('SELECT * FROM panel_password WHERE id = 1').get(), credentials);
    assert.deepEqual(f.db.prepare('SELECT * FROM store_admin_rotation ORDER BY store_id').all(), rotations);
    assert.deepEqual(f.db.prepare('SELECT * FROM admin_rotation WHERE id = 1').get(), originalRotation);
    const session = await f.adminResponse(new Request(origin + '/admin/session', { headers: { Cookie: cookie } }), f.env, start);
    assert.equal(session.status, 204);
    for (let failure = 1; failure <= 5; failure++) {
      const result = await provisionableStores('admin', 'wrong-password', f.env, start);
      assert.equal(result.status, 401); assert.equal(result.retryAfterSeconds, undefined);
      assert.equal(state(f).attempts, failure);
    }
    const blocked = await provisionableStores('admin', 'wrong-password', f.env, start);
    assert.equal(blocked.status, 429); assert.equal(blocked.retryAfterSeconds, 30);
    const beforeRerun = state(f);
    for (let rerun = 0; rerun < 3; rerun++) {
      f.db.exec(schema);
      assert.deepEqual(state(f), beforeRerun);
      assert.deepEqual(f.db.prepare('SELECT * FROM panel_password WHERE id = 1').get(), credentials);
    }
    assert.equal((await provisionableStores('admin', password, f.env, start + 1)).status, 429);
    assert.equal((await provisionableStores('admin', password, f.env, start + 30000)).status, 200);
    assert.deepEqual(state(f), { attempts: 0, blocked_until: 0 });
  }
});

test('a successful login before the first block clears previous failures', async t => {
  const f = await fixture(t), { provisionableStores } = await import('../server/cloudflare/admin-auth.mjs');
  for (let failure = 0; failure < 5; failure++) await provisionableStores('admin', 'wrong-password', f.env, start);
  assert.equal((await panelLogin(f, f.env.ADMIN_VIEW_TOKEN, start)).status, 303);
  assert.deepEqual(state(f), { attempts: 0, blocked_until: 0 });
  assert.equal((await provisionableStores('admin', 'wrong-password', f.env, start)).status, 401);
  assert.deepEqual(state(f), { attempts: 1, blocked_until: 0 });
});

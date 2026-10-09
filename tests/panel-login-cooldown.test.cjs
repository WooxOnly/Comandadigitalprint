const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Script } = require('node:vm');
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

test('owner login blocks after each three failures for 30, 60, 90 and 120 seconds', async t => {
  const f = await fixture(t), { provisionableStores } = await import('../server/cloudflare/admin-auth.mjs');
  let now = start;
  for (let group = 1; group <= 4; group++) {
    for (let failure = 1; failure <= 3; failure++) {
      const result = await provisionableStores('admin', 'wrong-password', f.env, now);
      assert.equal(result.status, failure === 3 ? 429 : 401);
      assert.equal(state(f).attempts, (group - 1) * 3 + failure);
      if (failure === 3) {
        assert.equal(result.retryAfterSeconds, group * 30);
        assert.equal(state(f).blocked_until, now + group * 30000);
      }
    }
    now += group * 30000;
  }
  assert.equal((await provisionableStores('admin', f.env.ADMIN_VIEW_TOKEN, f.env, now)).status, 200);
  assert.deepEqual(state(f), { attempts: 0, blocked_until: 0 });
  for (let failure = 1; failure <= 3; failure++) {
    const result = await provisionableStores('admin', 'wrong-password', f.env, now);
    if (failure === 3) assert.equal(result.retryAfterSeconds, 30);
  }
});

test('panel and tablet linking share the counter; blocked requests do not extend or escalate it', async t => {
  const f = await fixture(t), { provisionableStores } = await import('../server/cloudflare/admin-auth.mjs');
  assert.equal((await panelLogin(f, 'wrong-password', start)).status, 401);
  assert.equal((await provisionableStores('admin', 'wrong-password', f.env, start)).status, 401);
  const third = await panelLogin(f, 'wrong-password', start);
  assert.equal(third.status, 429); assert.equal(third.headers.get('Retry-After'), '30');
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

test('simultaneous failed requests preserve the three-attempt limit and one deadline', async t => {
  const f = await fixture(t), { provisionableStores } = await import('../server/cloudflare/admin-auth.mjs');
  for (const [now, attempts, wait] of [[start, 3, 30], [start + 30000, 6, 60]]) {
    const results = await Promise.all(Array.from({ length: 12 }, () => provisionableStores('admin', 'wrong-password', f.env, now)));
    assert.equal(results.filter(result => result.status === 401).length, 2);
    assert.equal(results.filter(result => result.status === 429).length, 10);
    assert.ok(results.filter(result => result.status === 429).every(result => result.retryAfterSeconds === wait));
    assert.deepEqual(state(f), { attempts, blocked_until: now + wait * 1000 });
  }
});

test('tablet provision returns the actual retry delay in JSON and the Retry-After header', async t => {
  const f = await fixture(t);
  for (let failure = 1; failure <= 3; failure++) {
    const response = await f.call('/provision', { username: 'admin', password: 'wrong-password' });
    assert.equal(response.status, failure === 3 ? 429 : 401);
    if (failure === 3) {
      assert.equal(response.headers.get('Retry-After'), '30');
      assert.deepEqual(await response.json(), { error: 'RATE_LIMIT', retryAfterSeconds: 30 });
    }
  }
});

test('remaining seconds survive page reload and localize correctly, including one second', async t => {
  const f = await fixture(t), { provisionableStores } = await import('../server/cloudflare/admin-auth.mjs');
  for (let failure = 0; failure < 3; failure++) await provisionableStores('admin', 'wrong-password', f.env, start);
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

test('the former fifteen-minute lock is released once and its failure count is preserved', async t => {
  const f = await fixture(t), { provisionableStores } = await import('../server/cloudflare/admin-auth.mjs');
  f.db.prepare('UPDATE panel_login SET attempts = 5, blocked_until = ? WHERE id = 1').run(start + 900000);
  const result = await provisionableStores('admin', 'wrong-password', f.env, start);
  assert.equal(result.status, 429); assert.equal(result.retryAfterSeconds, 60);
  assert.deepEqual(state(f), { attempts: 6, blocked_until: start + 60000 });
  assert.equal((await provisionableStores('admin', 'wrong-password', f.env, start + 1000)).retryAfterSeconds, 59);
  assert.deepEqual(state(f), { attempts: 6, blocked_until: start + 60000 });
});

test('a successful login before the first block clears previous failures', async t => {
  const f = await fixture(t), { provisionableStores } = await import('../server/cloudflare/admin-auth.mjs');
  for (let failure = 0; failure < 2; failure++) await provisionableStores('admin', 'wrong-password', f.env, start);
  assert.equal((await panelLogin(f, f.env.ADMIN_VIEW_TOKEN, start)).status, 303);
  assert.deepEqual(state(f), { attempts: 0, blocked_until: 0 });
  assert.equal((await provisionableStores('admin', 'wrong-password', f.env, start)).status, 401);
  assert.deepEqual(state(f), { attempts: 1, blocked_until: 0 });
});

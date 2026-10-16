import { nextLicenseMonth, licenseState, encodeLicenseClaim, LICENSE_DAY } from '../../shared/license.mjs';
import { translate } from './manager-i18n.mjs';
import { readBody } from './manager-auth.mjs';

const fail = (message, status = 400) => { throw Object.assign(Error(message), { status }); };
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
export async function licenseClient(env, storeId) {
  const { results } = await env.DB.prepare('SELECT id FROM manager_clients WHERE EXISTS (SELECT 1 FROM json_each(store_ids) WHERE value = ?) ORDER BY id LIMIT 2').bind(storeId).all();
  if (results.length > 1) fail('A loja está vinculada a mais de um cliente.', 409);
  return results[0]?.id || 'store:' + storeId;
}
async function clientExists(env, id) {
  const row = id.startsWith('store:')
    ? await env.DB.prepare('SELECT id FROM stores WHERE id = ? AND NOT EXISTS (SELECT 1 FROM manager_clients, json_each(store_ids) WHERE value = stores.id)').bind(id.slice(6)).first()
    : await env.DB.prepare('SELECT id FROM manager_clients WHERE id = ?').bind(id).first();
  if (!row) fail('Cliente não encontrado.', 404);
}
export async function clientLicense(env, id, now = Date.now()) {
  await clientExists(env, id);
  let row = await env.DB.prepare('SELECT * FROM client_licenses WHERE client_id = ?').bind(id).first();
  if (!row) {
    await env.DB.prepare('INSERT OR IGNORE INTO client_licenses(client_id, expires_at, anchor_day, updated_at) VALUES(?, ?, ?, ?)').bind(id, nextLicenseMonth(now), new Date(now).getUTCDate(), now).run();
    row = await env.DB.prepare('SELECT * FROM client_licenses WHERE client_id = ?').bind(id).first();
  }
  if (row.status === 'active' && row.auto_renew && row.expires_at <= now) {
    let expiry = row.expires_at;
    for (let count = 0; expiry <= now && count < 2400; count++) expiry = nextLicenseMonth(expiry, row.anchor_day);
    if (expiry <= now) fail('Licença temporariamente indisponível.', 503);
    // Optimistic revision prevents a simultaneous administrator block being lost.
    await env.DB.prepare("UPDATE client_licenses SET expires_at = ?, revision = revision + 1, updated_at = ? WHERE client_id = ? AND revision = ? AND status = 'active' AND auto_renew = 1").bind(expiry, now, id, row.revision).run();
    row = await env.DB.prepare('SELECT * FROM client_licenses WHERE client_id = ?').bind(id).first();
  }
  return { clientId: id, status: row.status, expiresAt: row.expires_at, anchorDay: row.anchor_day, autoRenew: !!row.auto_renew, revision: row.revision, state: licenseState({ status: row.status, expiresAt: row.expires_at }, now) };
}
export async function requireStoreLicense(env, storeId, now = Date.now()) {
  const value = await clientLicense(env, await licenseClient(env, storeId), now);
  if (value.state !== 'active') fail(value.state === 'blocked' ? 'LICENSE_BLOCKED' : 'LICENSE_EXPIRED', 403);
}
export async function signLicense(env, claim) {
  if (!env.LICENSE_SIGNING_PRIVATE_JWK) fail('Licença temporariamente indisponível.', 503);
  const key = await crypto.subtle.importKey('jwk', JSON.parse(env.LICENSE_SIGNING_PRIVATE_JWK), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const payload = encodeLicenseClaim(claim), bytes = new TextEncoder().encode(payload);
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, bytes);
  return 'BH1.' + hex(bytes) + '.' + hex(signature);
}
export async function tabletLicense(request, env, storeId, deviceId, now = Date.now()) {
  if (!/^[a-f0-9-]{36}$/.test(deviceId || '')) fail('INVALID_DATA');
  const license = await clientLicense(env, await licenseClient(env, storeId), now);
  const claim = { version: 1, kind: 'snapshot', audience: new URL(request.url).origin, clientId: license.clientId, storeId, deviceId, status: license.status, revision: license.revision, issuedAt: now, expiresAt: license.expiresAt };
  return { code: await signLicense(env, claim) };
}
export async function licenseAdminResponse(request, env, { browserLogin, sameOrigin, language, now = Date.now() }) {
  const url = new URL(request.url);
  if (url.pathname !== '/admin/license') return null;
  const reply = (value, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  if (!browserLogin) return reply({ error: translate(language, 'Acesso não autorizado.') }, 401);
  if (!['GET', 'POST'].includes(request.method)) return reply({ error: translate(language, 'Método indisponível.') }, 405);
  if (request.method === 'POST' && (!sameOrigin || !request.headers.get('Content-Type')?.startsWith('application/json'))) return reply({ error: translate(language, 'Acesso não permitido.') }, 403);
  try {
    if (request.method === 'GET') return reply({ license: await clientLicense(env, url.searchParams.get('clientId') || '', now) });
    const input = JSON.parse(await readBody(request, 4096));
    if (!input || typeof input.clientId !== 'string' || input.clientId.length > 80 || !Number.isSafeInteger(input.revision)) fail('Formulário inválido.');
    const previous = await clientLicense(env, input.clientId, now);
    if (previous.revision !== input.revision) fail('Cadastro alterado em outra sessão. Atualize a página.', 409);
    const actor = browserLogin.accountId || browserLogin.id || 'owner';
    if (input.action === 'offline') {
      if (!Number.isSafeInteger(input.expiresAt) || input.expiresAt <= now || input.expiresAt > now + 31 * LICENSE_DAY || !/^[a-f0-9-]{36}$/.test(input.deviceId || '') || typeof input.storeId !== 'string') fail('Confira o tablet e o prazo da liberação.');
      if (await licenseClient(env, input.storeId) !== input.clientId) fail('Esta loja não pertence ao cliente selecionado.');
      if (!await env.DB.prepare('SELECT id FROM stores WHERE id = ?').bind(input.storeId).first()) fail('Loja não encontrada.', 404);
      const claim = { version: 1, kind: 'offline', audience: url.origin, clientId: input.clientId, storeId: input.storeId, deviceId: input.deviceId, status: 'active', revision: previous.revision, issuedAt: now, expiresAt: input.expiresAt };
      const code = await signLicense(env, claim);
      // Retain an audit event, never the reusable code or signature.
      await env.DB.prepare('INSERT INTO client_license_events(id, client_id, action, actor, created_at, expires_at, device_id) VALUES(?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), input.clientId, 'offline', String(actor), now, input.expiresAt, input.deviceId).run();
      return reply({ code, expiresAt: input.expiresAt });
    }
    if (!['save', 'block', 'resume', 'renew'].includes(input.action)) fail('Formulário inválido.');
    let status = previous.status, expiresAt = previous.expiresAt, autoRenew = previous.autoRenew, anchorDay = previous.anchorDay;
    if (input.action === 'block') status = 'blocked';
    if (input.action === 'resume') status = 'active';
    if (input.action === 'renew') { const base = Math.max(now, expiresAt); if (expiresAt < now) anchorDay = new Date(now).getUTCDate(); expiresAt = nextLicenseMonth(base, anchorDay); }
    if (input.action === 'save') {
      if (typeof input.autoRenew !== 'boolean' || !Number.isSafeInteger(input.expiresAt) || input.expiresAt < now - 366 * LICENSE_DAY || input.expiresAt > now + 5 * 366 * LICENSE_DAY) fail('Confira a validade da licença.');
      autoRenew = input.autoRenew; expiresAt = input.expiresAt; anchorDay = new Date(expiresAt).getUTCDate();
    }
    const [update] = await env.DB.batch([
      env.DB.prepare('UPDATE client_licenses SET status = ?, expires_at = ?, auto_renew = ?, anchor_day = ?, revision = revision + 1, updated_at = ? WHERE client_id = ? AND revision = ? RETURNING client_id').bind(status, expiresAt, Number(autoRenew), anchorDay, now, input.clientId, previous.revision),
      env.DB.prepare('INSERT INTO client_license_events(id, client_id, action, actor, created_at, expires_at) SELECT ?, ?, ?, ?, ?, ? WHERE changes() = 1').bind(crypto.randomUUID(), input.clientId, input.action, String(actor), now, expiresAt),
    ]);
    if (!update.results?.length) fail('Cadastro alterado em outra sessão. Atualize a página.', 409);
    return reply({ license: await clientLicense(env, input.clientId, now) });
  } catch (error) { return reply({ error: translate(language, error.status ? error.message : 'Licença temporariamente indisponível.') }, error.status || 503); }
}

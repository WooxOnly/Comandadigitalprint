import { digest, hex } from './manager-auth.mjs';
import { translate } from './manager-i18n.mjs';
export const normalizeEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
export const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(value);
const TTL = 24 * 60 * 60 * 1000;
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const tokenHash = async token => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
export function invitationConfiguration(env) {
  try {
    const origin = new URL(env.PASSWORD_RESET_ORIGIN), provider = env.PASSWORD_RESET_PROVIDER ?? 'resend';
    const apiKey = provider === 'resend' ? env.RESEND_API_KEY : provider === 'brevo' ? env.BREVO_API_KEY : null;
    if (typeof apiKey !== 'string' || !apiKey.trim() || !validEmail(normalizeEmail(env.PASSWORD_RESET_FROM)) || origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) return null;
    return { origin: origin.origin, from: normalizeEmail(env.PASSWORD_RESET_FROM), provider, apiKey };
  } catch { return null; }
}
export async function sendManagerInvitation(env, id, revision, language, now = Date.now(), fetcher = fetch) {
  const config = invitationConfiguration(env);
  if (!config) fail(503, 'Envio de convites indisponível. Configure o serviço de e-mail.');
  const user = await env.DB.prepare('SELECT * FROM manager_users WHERE id = ? AND revision = ? AND active = 1').bind(id, revision).first();
  if (!user || !validEmail(user.username)) fail(409, 'Confira o e-mail, a situação e a versão do acesso antes de enviar o convite.');
  const client = await env.DB.prepare('SELECT active FROM manager_clients WHERE id = ?').bind(user.client_id).first();
  if (!client?.active) fail(400, 'Ative o cliente antes de enviar um convite.');
  const previous = await env.DB.prepare('SELECT needs_password, sent_at FROM manager_user_invitations WHERE user_id = ?').bind(id).first();
  if (previous?.sent_at && now - previous.sent_at < 60000) fail(429, 'Aguarde um minuto antes de reenviar o convite.');
  const token = hex(crypto.getRandomValues(new Uint8Array(32))), hash = await tokenHash(token), expires = now + TTL;
  const result = await env.DB.batch([
    env.DB.prepare('UPDATE manager_users SET revision = revision + 1 WHERE id = ? AND revision = ? AND active = 1 RETURNING revision').bind(id, revision),
    env.DB.prepare(`INSERT INTO manager_user_invitations(user_id, token_hash, password_revision, expires_at, needs_password, delivery_status, sent_at)
      SELECT id, ?, revision, ?, ?, 'pending', ? FROM manager_users WHERE id = ? AND revision = ? AND changes() = 1
      ON CONFLICT(user_id) DO UPDATE SET token_hash = excluded.token_hash, password_revision = excluded.password_revision,
        expires_at = excluded.expires_at, needs_password = excluded.needs_password, delivery_status = excluded.delivery_status, used_at = NULL, sent_at = excluded.sent_at RETURNING user_id`)
      .bind(hash, expires, previous?.needs_password ?? 0, now, id, revision + 1),
  ]);
  if (!result[0].results?.length || !result[1].results?.length) fail(409, 'Cadastro alterado em outra sessão. Atualize a página.');
  const link = config.origin + '/gestor/convite#token=' + token;
  const subject = translate(language, 'Convite para o Portal do cliente · BistroHub');
  const text = [translate(language, 'Você recebeu um convite para acessar o Portal do cliente BistroHub.'), translate(language, 'Crie sua senha pelo link abaixo:'), link,
    translate(language, 'O convite expira em 24 horas e pode ser usado uma única vez.'),
    translate(language, 'Se você não reconhece este convite, ignore este e-mail.')].join('\n\n');
  let sent = false;
  try {
    const brevo = config.provider === 'brevo';
    const response = await fetcher(brevo ? 'https://api.brevo.com/v3/smtp/email' : 'https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(10000), headers: brevo
        ? { 'api-key': config.apiKey, 'Content-Type': 'application/json', Accept: 'application/json' }
        : { Authorization: 'Bearer ' + config.apiKey, 'Content-Type': 'application/json', 'Idempotency-Key': 'bistro-invite-' + hash },
      body: JSON.stringify(brevo ? { sender: { email: config.from, name: 'BistroHub' }, to: [{ email: user.username }], subject, textContent: text, headers: { 'Idempotency-Key': 'bistro-invite-' + hash } }
        : { from: config.from, to: [user.username], subject, text }),
    });
    sent = response.ok;
  } catch { /* Never log tokens, credentials, addresses or provider responses. */ }
  const updated = await env.DB.prepare(`UPDATE manager_user_invitations SET delivery_status = ?, token_hash = CASE WHEN ? = 1 THEN token_hash ELSE NULL END WHERE user_id = ? AND token_hash = ? AND password_revision = (SELECT revision FROM manager_users WHERE id = ?)`).bind(sent ? 'sent' : 'failed', Number(sent), id, hash, id).run();
  if (!updated.meta.changes) fail(409, 'Cadastro alterado em outra sessão. Atualize a página.');
  return { sent, expiresAt: sent ? expires : null };
}
export async function acceptManagerInvitation(env, token, password, now = Date.now()) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || typeof password !== 'string' || password.length < 8 || password.length > 256) fail(400, 'Convite inválido ou expirado. Peça um novo convite ao administrador.');
  const hash = await tokenHash(token), salt = hex(crypto.getRandomValues(new Uint8Array(16))), passwordHash = await digest(password, salt);
  // Both updates run in one D1 transaction. Exact fresh salt/hash and the revision
  // tie consumption to this one acceptance, even with concurrent submissions.
  const result = await env.DB.batch([
    env.DB.prepare(`UPDATE manager_users SET salt = ?, hash = ?, revision = revision + 1 WHERE active = 1 AND EXISTS (
      SELECT 1 FROM manager_user_invitations i JOIN manager_clients c ON c.id = manager_users.client_id
      WHERE i.user_id = manager_users.id AND i.token_hash = ? AND i.delivery_status = 'sent' AND i.used_at IS NULL
        AND i.expires_at > ? AND i.password_revision = manager_users.revision AND c.active = 1) RETURNING id`)
      .bind(salt, passwordHash, hash, now),
    env.DB.prepare(`UPDATE manager_user_invitations SET used_at = ?, needs_password = 0, delivery_status = 'accepted', token_hash = NULL
      WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? AND EXISTS (
        SELECT 1 FROM manager_users u WHERE u.id = manager_user_invitations.user_id AND u.active = 1
          AND u.salt = ? AND u.hash = ? AND u.revision = manager_user_invitations.password_revision + 1) RETURNING user_id`)
      .bind(now, hash, now, salt, passwordHash),
  ]);
  if (result[0].results?.length !== 1 || result[1].results?.length !== 1) fail(400, 'Convite inválido ou expirado. Peça um novo convite ao administrador.');
  return { ok: true };
}

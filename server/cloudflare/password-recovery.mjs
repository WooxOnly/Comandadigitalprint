import { hex, digest } from './manager-auth.mjs';
import { translate } from './manager-i18n.mjs';

const encode = value => new TextEncoder().encode(value);
const TTL = 15 * 60 * 1000;
const EMAIL_WINDOW = 60 * 60 * 1000;
const email = value => typeof value === 'string' && value.length <= 254 && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value);
const validToken = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const tokenDigest = async token => hex(await crypto.subtle.digest('SHA-256', encode(token)));

function configuration(env) {
  try {
    const origin = new URL(env.PASSWORD_RESET_ORIGIN);
    if (!env.DB || !env.ADMIN_PASSWORD_SECRET || typeof env.RESEND_API_KEY !== 'string' || !env.RESEND_API_KEY.trim()
      || !email(env.ADMIN_RECOVERY_EMAIL) || !email(env.PASSWORD_RESET_FROM) || origin.protocol !== 'https:'
      || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) return null;
    return { origin: origin.origin, recipient: env.ADMIN_RECOVERY_EMAIL, from: env.PASSWORD_RESET_FROM };
  } catch { return null; }
}
export const recoveryReady = env => !!configuration(env);

async function allow(env, key, maximum, window, now) {
  const row = await env.DB.prepare(`INSERT INTO panel_recovery_limits(key, attempts, reset_at) VALUES(?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET attempts = CASE WHEN reset_at <= ? THEN 1 ELSE attempts + 1 END,
      reset_at = CASE WHEN reset_at <= ? THEN excluded.reset_at ELSE reset_at END
    WHERE reset_at <= ? OR attempts < ? RETURNING attempts`).bind(key, now + window, now, now, now, maximum).first();
  return !!row;
}
async function ipKey(request, env, purpose) {
  const key = await crypto.subtle.importKey('raw', encode(env.ADMIN_PASSWORD_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, encode('password-recovery:' + purpose + ':' + (request.headers.get('CF-Connecting-IP') || 'unknown'))));
}

export async function requestRecovery(request, env, username, language, now = Date.now(), context) {
  const config = configuration(env);
  if (!config) return { status: 503, message: 'A recuperação por e-mail ainda não está disponível. Tente novamente mais tarde.' };
  const key = await ipKey(request, env, 'request');
  if (!await allow(env, key, 5, TTL, now)) return { status: 429, message: 'Muitas solicitações de recuperação. Tente novamente mais tarde.' };
  await env.DB.prepare('DELETE FROM panel_recovery_limits WHERE reset_at <= ?').bind(now).run();
  await env.DB.prepare('DELETE FROM panel_password_recovery WHERE expires_at <= ?').bind(now).run();
  const response = { status: 200, message: 'Se os dados corresponderem ao cadastro, enviaremos um link de recuperação para o e-mail cadastrado.', success: true };
  const normalized = username.trim().toLowerCase();
  if (normalized !== (env.ADMIN_PANEL_USER || 'admin').toLowerCase() && normalized !== config.recipient.toLowerCase()) return response;
  // Unknown accounts do not exhaust the owner's delivery quota. All accounts
  // receive the same response, including when this quota is exhausted.
  if (!await allow(env, 'owner-email', 5, EMAIL_WINDOW, now)) return response;
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  const hash = await tokenDigest(token);
  const state = await env.DB.prepare('SELECT revision FROM panel_password WHERE id = 1').first();
  await env.DB.prepare('INSERT INTO panel_password_recovery(token_hash, password_revision, expires_at) VALUES(?, ?, ?)').bind(hash, state?.revision || 0, now + TTL).run();
  const link = config.origin + '/admin/reset-password?token=' + token;
  const deliver = async () => {
    try {
      const result = await fetch('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(10000),
        headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': 'bistro-reset-' + hash },
        body: JSON.stringify({ from: config.from, to: [config.recipient], subject: translate(language, 'Redefinição de senha · BistroHub'), text: [
          translate(language, 'Use este link para redefinir a senha do painel BistroHub:'), link,
          translate(language, 'O link expira em 15 minutos e pode ser usado uma única vez.'),
          translate(language, 'Se você não solicitou esta alteração, ignore este e-mail. Sua senha permanece a mesma.'),
        ].join('\n\n') }),
      });
      if (!result.ok) throw new Error('Delivery unavailable');
    } catch {
      // Keep tokens/passwords/provider responses out of logs and do not disclose
      // account existence through a different public response on delivery failure.
      await env.DB.prepare('DELETE FROM panel_password_recovery WHERE token_hash = ?').bind(hash).run();
      console.error('BistroHub password recovery email delivery failed');
    }
  };
  if (context?.waitUntil) context.waitUntil(deliver()); else await deliver();
  return response;
}

export async function recoveryTokenValid(env, token, now = Date.now()) {
  if (!env.DB || !validToken(token)) return false;
  const row = await env.DB.prepare(`SELECT r.token_hash FROM panel_password_recovery r
    WHERE r.token_hash = ? AND r.used_at IS NULL AND r.expires_at > ?
      AND r.password_revision = COALESCE((SELECT revision FROM panel_password WHERE id = 1), 0)`)
    .bind(await tokenDigest(token), now).first();
  return !!row;
}

export async function resetPassword(request, env, token, password, now = Date.now()) {
  if (!env.DB || !env.ADMIN_PASSWORD_SECRET) return { status: 503, message: 'Não foi possível processar a recuperação agora. Tente novamente mais tarde.' };
  await env.DB.prepare('DELETE FROM panel_recovery_limits WHERE reset_at <= ?').bind(now).run();
  if (!await allow(env, await ipKey(request, env, 'reset'), 10, TTL, now)) return { status: 429, message: 'Muitas solicitações de recuperação. Tente novamente mais tarde.' };
  if (!validToken(token)) return { status: 400, message: 'Link de recuperação inválido ou expirado. Solicite um novo link.' };
  const tokenHash = await tokenDigest(token);
  const salt = hex(crypto.getRandomValues(new Uint8Array(16))), hash = await digest(password, salt);
  // All steps run in one D1 transaction. Later writes are guarded by the exact
  // salt/hash generated here, so only the successful reset consumes the token or
  // clears failed logins. The revision comparison also resolves concurrent links.
  const result = await env.DB.batch([
    env.DB.prepare(`INSERT INTO panel_password(id, salt, hash, iterations, revision)
      SELECT 1, ?, ?, 100000, r.password_revision + 1 FROM panel_password_recovery r
      WHERE r.token_hash = ? AND r.used_at IS NULL AND r.expires_at > ?
        AND r.password_revision = COALESCE((SELECT revision FROM panel_password WHERE id = 1), 0)
      ON CONFLICT(id) DO UPDATE SET salt = excluded.salt, hash = excluded.hash,
        iterations = excluded.iterations, revision = excluded.revision RETURNING revision`).bind(salt, hash, tokenHash, now),
    env.DB.prepare(`UPDATE panel_password_recovery SET used_at = ?
      WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
        AND EXISTS(SELECT 1 FROM panel_password WHERE id = 1 AND salt = ? AND hash = ?
          AND revision = panel_password_recovery.password_revision + 1) RETURNING used_at`).bind(now, tokenHash, now, salt, hash),
    env.DB.prepare(`UPDATE panel_login SET attempts = 0, blocked_until = 0 WHERE id = 1
      AND EXISTS(SELECT 1 FROM panel_password_recovery WHERE token_hash = ? AND used_at = ?)
      AND EXISTS(SELECT 1 FROM panel_password WHERE id = 1 AND salt = ? AND hash = ?)`).bind(tokenHash, now, salt, hash),
  ]);
  if (result[0].results?.length !== 1 || result[1].results?.length !== 1) return { status: 400, message: 'Link de recuperação inválido ou expirado. Solicite um novo link.' };
  return { status: 303 };
}

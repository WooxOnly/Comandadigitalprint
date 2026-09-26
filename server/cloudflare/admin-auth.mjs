// The secret stays on the server. Monday 00:00 UTC starts a new password week.
const WEEK = 7 * 24 * 60 * 60 * 1000;
const MONDAY = Date.UTC(1970, 0, 5);
const encode = (value) => new TextEncoder().encode(value);
const hex = (value) => Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, '0')).join('');
export async function weeklyAdmin(secret, timestamp = Date.now(), revision = 0) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('Admin secret not configured');
  const week = Math.floor((timestamp - MONDAY) / WEEK);
  const key = await crypto.subtle.importKey('raw', encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const derive = async (purpose) => hex(await crypto.subtle.sign('HMAC', key, encode(`${purpose}:${week}:${revision}`)));
  const password = (await derive('admin-password')).slice(0, 24);
  const salt = (await derive('admin-salt')).slice(0, 32);
  const saltBytes = Uint8Array.from(salt.match(/../g), (value) => parseInt(value, 16));
  const passwordKey = await crypto.subtle.importKey('raw', encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: 100000 }, passwordKey, 256));
  return { username: 'admin', week, revision, salt, hash, iterations: 100000, password, nextRotation: new Date(MONDAY + (week + 1) * WEEK).toISOString() };
}
function panelLogin(request, env) {
  if (!env.ADMIN_VIEW_TOKEN) return false;
  const authorization = request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Basic ')) return false;
  try { return atob(authorization.slice(6)) === (env.ADMIN_PANEL_USER || 'admin') + ':' + env.ADMIN_VIEW_TOKEN; } catch { return false; }
}
export async function adminResponse(request, env) {
  const pathname = new URL(request.url).pathname;
  const browserLogin = panelLogin(request, env);
  const tokenLogin = !!env.ADMIN_VIEW_TOKEN && request.headers.get('Authorization') === 'Bearer ' + env.ADMIN_VIEW_TOKEN;
  const protectedRoute = pathname === '/admin' || pathname === '/auth/admin/password';
  if (protectedRoute && env.DB) {
    const now = Date.now();
    try {
      const state = await env.DB.prepare('SELECT blocked_until FROM panel_login WHERE id = 1').first();
      if (state?.blocked_until > now) return new Response('Muitas tentativas. Aguarde 15 minutos.', { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': String(Math.ceil((state.blocked_until - now) / 1000)) } });
      const valid = pathname === '/admin' ? browserLogin : browserLogin || tokenLogin;
      if (!valid && request.headers.has('Authorization')) {
        await env.DB.prepare('UPDATE panel_login SET attempts = CASE WHEN blocked_until > 0 THEN 1 ELSE attempts + 1 END, blocked_until = CASE WHEN blocked_until = 0 AND attempts >= 4 THEN ? ELSE 0 END WHERE id = 1').bind(now + 900000).run();
      } else if (valid) await env.DB.prepare('UPDATE panel_login SET attempts = 0, blocked_until = 0 WHERE id = 1').run();
    } catch { return new Response('Login temporariamente indisponível.', { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
  }
  if (pathname === '/admin' && request.method === 'GET') {
    if (!panelLogin(request, env)) return new Response('Faça login para acessar o painel.', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Painel Seabra", charset="UTF-8"', 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' } });
    const nonce = crypto.randomUUID();
    return new Response(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Senha do admin</title>
      <style>body{font:18px system-ui;background:#f5f3ef;color:#214b40;max-width:460px;margin:10vh auto;padding:24px}input,button{box-sizing:border-box;width:100%;padding:14px;margin:12px 0;font:inherit}button{background:#214b40;color:white;border:0;border-radius:8px}output{display:block;overflow-wrap:anywhere;white-space:pre-wrap}</style>
      <h1>Senha semanal do admin</h1><form><button name="action" value="view">Consultar senha</button><button name="action" value="rotate">Gerar nova senha agora</button></form><p>A troca manual vale até a próxima segunda-feira, quando uma nova senha será gerada automaticamente. Aparelhos offline mantêm a última senha recebida.</p><output aria-live="polite"></output>
      <script nonce="${nonce}">const form=document.querySelector('form'),output=document.querySelector('output');form.addEventListener('submit',async event=>{event.preventDefault();const rotate=event.submitter?.value==='rotate';if(rotate&&!confirm('Gerar outra senha agora? Os aparelhos conectados passarão a usar a nova senha.'))return;const buttons=document.querySelectorAll('button');buttons.forEach(button=>button.disabled=true);output.textContent='Consultando…';try{const response=await fetch('/auth/admin/password',{method:rotate?'POST':'GET',credentials:'same-origin',cache:'no-store'});if(!response.ok)throw Error();const data=await response.json();output.textContent='Usuário: admin\\nSenha: '+data.password+'\\nPróxima troca: '+new Date(data.nextRotation).toLocaleString('pt-BR');setTimeout(()=>{output.textContent=''},60000)}catch{output.textContent='Não foi possível consultar. Confira seu login e a conexão.'}finally{buttons.forEach(button=>button.disabled=false)}});document.addEventListener('visibilitychange',()=>{if(document.hidden)output.textContent=''})</script></html>`, { headers: {
      'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'`,
    } });
  }
  if (pathname !== '/auth/admin' && pathname !== '/auth/admin/password') return null;
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers });
  const privateRoute = pathname.endsWith('/password');
  if (request.method !== 'GET' && !(privateRoute && request.method === 'POST')) return json({ error: 'Method not allowed' }, 405);
  if (privateRoute && !browserLogin && !tokenLogin) return json({ error: 'Unauthorized' }, 401);
  if (privateRoute && request.method === 'POST' && browserLogin && request.headers.get('Origin') !== new URL(request.url).origin) return json({ error: 'Forbidden' }, 403);
  try {
    if (request.method === 'POST') {
      if (!env.DB) throw new Error('Database unavailable');
      await env.DB.prepare('UPDATE admin_rotation SET revision = revision + 1 WHERE id = 1').run();
    }
    const state = env.DB ? await env.DB.prepare('SELECT revision FROM admin_rotation WHERE id = 1').first() : { revision: 0 };
    if (!state || !Number.isSafeInteger(state.revision) || state.revision < 0) throw new Error('Invalid rotation state');
    const { password, ...credential } = await weeklyAdmin(env.ADMIN_PASSWORD_SECRET, Date.now(), state.revision);
    // Only the verifier is public; the random 96-bit password requires the owner token.
    return json(privateRoute ? { username: credential.username, password, nextRotation: credential.nextRotation } : credential);
  } catch { return json({ error: 'Admin service unavailable' }, 503); }
}

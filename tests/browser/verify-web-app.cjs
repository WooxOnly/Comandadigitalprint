// Actual Expo export and providers. Only the backend is isolated SQLite with
// synthetic signing keys/accounts. Never uses or writes a remote store.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), https = require('node:https');
const { execFileSync } = require('node:child_process'), { generateKeyPairSync } = require('node:crypto');
const { chromium, webkit } = require('playwright-core');
const { fixture } = require('../helpers/business-fixture.cjs');
(async () => {
 const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bistro-operational-web-')), cleanup = [], errors = [];
 const f = await fixture({ after: fn => cleanup.push(fn) }), pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
 f.env.LICENSE_SIGNING_PRIVATE_JWK = JSON.stringify(pair.privateKey.export({ format: 'jwk' }));
 f.modules('seabra-1', true, true, true, true);
 const pastDate = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 15, 12).toISOString();
 const insert = f.db.prepare('INSERT INTO store_events(store_id,mutation,key,data,actor,created_at) VALUES(?,?,?,?,?,?)');
 for(let i=0;i<205;i++) {
  const id='history-fixture-'+String(i).padStart(3,'0');
  insert.run('seabra-1','order-'+id,'order:'+id,JSON.stringify({id,plate:'1',customer:'Historical fixture '+i,createdAt:pastDate,items:[{id:'item',name:'Item',category:'Group',quantity:1,note:''}]}),'admin',pastDate);
  insert.run('seabra-1','prep-'+id,'preparation:'+id,JSON.stringify({orderId:id,status:'completed',updatedAt:pastDate}),'admin',pastDate);
 }
 for(const [i,status] of ['received','preparing','ready'].entries()){
  const id='action-fixture-'+i,issued=Date.now()-15*60000,at=offset=>new Date(issued+offset*60000).toISOString();
  insert.run('seabra-1','order-'+id,'order:'+id,JSON.stringify({id,plate:'9',customer:'Kitchen action '+i,createdAt:at(0),items:[{id:'item',name:'Kitchen item',category:'Group',quantity:1,note:''}]}),'admin',at(0));
  insert.run('seabra-1','prep-'+id,'preparation:'+id,JSON.stringify({orderId:id,status,updatedAt:at(i),...(i?{startedAt:at(1),startedBy:'admin'}:{}),...(i===2?{readyAt:at(2),readyBy:'admin'}:{})}),'admin',at(i));
 }
 const bootstrapRecords = [], queryRequests = [];

 const worker = (await import('../../server/cloudflare/worker.mjs')).default;
 const { weeklyAdmin } = await import('../../server/cloudflare/admin-auth.mjs');
 const weekly = (await weeklyAdmin(f.env.ADMIN_PASSWORD_SECRET)).password;
 execFileSync('npx', ['expo', 'export', '--clear', '--platform', 'web', '--output-dir', path.join(directory, 'dist')], { env: { ...process.env, EXPO_PUBLIC_WEB_APP: '1', EXPO_PUBLIC_WEB_BASE_PATH: '/app', APP_VARIANT: 'homologacao', EXPO_PUBLIC_WEB_LICENSE_PUBLIC_KEY: JSON.stringify(pair.publicKey.export({ format: 'jwk' })) }, stdio: ['ignore', fs.openSync(path.join(directory, 'export.log'), 'w'), fs.openSync(path.join(directory, 'export-errors.log'), 'w')] });
 execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', path.join(directory, 'key.pem'), '-out', path.join(directory, 'cert.pem'), '-days', '1', '-subj', '/CN=localhost'], { stdio: 'ignore' });
 const server = https.createServer({ key: fs.readFileSync(path.join(directory, 'key.pem')), cert: fs.readFileSync(path.join(directory, 'cert.pem')) }, async (req, res) => {
  try {
   const web = (await import('../../server/cloudflare/web-worker.mjs')).default;
   const chunks = []; for await (const chunk of req) chunks.push(chunk); const body = Buffer.concat(chunks);
   const request = new Request('https://' + req.headers.host + req.url, { method: req.method, headers: req.headers, ...(body.length ? { body } : {}) });
   if(new URL(request.url).pathname==='/cloud/orders') queryRequests.push(new URL(request.url));
   const response = await web.fetch(request, {
    BACKEND: { fetch: incoming => worker.fetch(incoming, f.env) },
    WEB_ASSETS: { fetch: async incoming => {
     const requested = new URL(incoming.url).pathname;
     let file = path.join(directory, 'dist', requested); if (requested === '/') file = path.join(directory, 'dist/index.html');
     if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return new Response(null, {status:404});
     const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf' };
     return new Response(fs.readFileSync(file), {headers:{'Content-Type':types[path.extname(file)] || 'application/octet-stream'}});
    } },
   });
   if(new URL(request.url).pathname==='/cloud/bootstrap' && response.ok) bootstrapRecords.push(...(await response.clone().json()).records);
   res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { errors.push(error.message); res.writeHead(500); res.end('Fixture error'); }
 });
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const browser = await (process.env.WEB_APP_ENGINE === 'webkit' ? webkit.launch() : chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] }));
 const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1024, height: 1366 }, hasTouch: true }); const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));page.on('response', async response => { if(response.url().includes('/cloud/license')) fs.writeFileSync(path.join(directory,'license-response.json'), JSON.stringify({status:response.status(),body:await response.text()})); });
 const base = 'https://localhost:' + server.address().port;
 try {
  await page.goto(base); await page.getByLabel('Usuário ou e-mail do painel', { exact: true }).fill('admin');
  await page.getByLabel('Senha do painel', { exact: true }).fill(f.env.ADMIN_VIEW_TOKEN); await page.getByRole('button', { name: 'Ver lojas', exact: true }).tap();
  await page.getByRole('radio').filter({ hasText: 'Seabra 1' }).tap(); await page.getByRole('button', { name: 'Vincular tablet', exact: true }).tap();
  await page.getByRole('button', { name: 'Entrar', exact: true }).waitFor({ timeout: 30000 });
  await page.getByLabel('Senha', { exact: true }).fill(weekly); await page.getByRole('button', { name: 'Entrar', exact: true }).tap();
  await page.getByTestId('nav-home').waitFor({ timeout: 30000 });
  await page.getByText('Dados sincronizados',{exact:true}).waitFor({timeout:30000});
  assert.equal(bootstrapRecords.some(row=>row.key.startsWith('order:history-fixture-')),false,'Initial web data must not download old completed history');
  async function alignedStatus() {
   const status = await page.getByTestId('cloud-status-frame').boundingBox();
   const content = await page.locator('[data-testid="screen-content-frame"]:visible').last().boundingBox();
   assert.ok(status && content && Math.abs(status.x-content.x)<1 && Math.abs(status.width-content.width)<1,'Synchronization and screen content must share the same horizontal bounds');
  }

  for (const size of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1024, height: 1366 }, { width: 1366, height: 1024 }, { width: 1376, height: 900 }, { width: 1920, height: 1080 }, { width: 2560, height: 1440 }]) {
   await page.setViewportSize(size);
   for (const tab of ['order', 'menu', 'history', 'preparation', 'preorders', 'customers', 'cash', 'home']) {
    const control = page.getByTestId('nav-' + tab);
    if (size.width >= 1920) await control.click(); else await control.tap();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
   }
   await alignedStatus();
   const large = size.width >= 1000 && size.height >= 700, tablet = size.width >= 700 && size.height >= 600;
   const expectedNav = size.width > size.height ? large ? 28 : tablet ? 24 : 18 : 18;
   const expectedShortcut = size.width > size.height ? large ? 32 : tablet ? 28 : 25 : size.width >= 760 ? 22 : 25;
   const iconSize = async target => target.evaluate(node=>{const css=getComputedStyle(node);return node.querySelector('img')?node.getBoundingClientRect().width:parseFloat(css.fontSize)});
   assert.equal(await iconSize(page.getByTestId('nav-home').getByTestId('navigation-icon')),expectedNav);
   assert.equal(await iconSize(page.getByTestId('home-module-order').getByTestId('navigation-icon')),expectedShortcut);
   const cards = await page.locator('[data-testid^="home-module-"]').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().height));
   assert.ok(Math.max(...cards)-Math.min(...cards)<1,'Home cards retain equal heights after increasing icons');
   await page.getByTestId('nav-printer').tap();
   await page.getByLabel('Senha de Configurações',{exact:true}).waitFor();
   const settingsStatus = await page.getByTestId('cloud-status-frame').boundingBox();
   await page.getByTestId('nav-home').tap();
   const homeStatus = await page.getByTestId('cloud-status-frame').boundingBox();
   assert.ok(Math.abs(settingsStatus.x-homeStatus.x)<1 && Math.abs(settingsStatus.width-homeStatus.width)<1,'Settings gate must retain the same synchronization alignment');
   await page.getByTestId('nav-printer').tap();
   const settingsCode = await page.evaluate(()=>{const date=new Date();return String(date.getMonth()+1+date.getDate()+date.getFullYear()+(date.getHours()%12||12))});
   await page.getByLabel('Senha de Configurações',{exact:true}).fill(settingsCode);
   await page.getByRole('button',{name:'Desbloquear',exact:true}).tap();
   await page.getByText('Módulos da empresa',{exact:true}).waitFor();
   await alignedStatus();
   await page.getByTestId('nav-home').tap();
   await page.screenshot({ path: path.join(directory, 'ipad-' + size.width + '.png') });
  }
  // Actual providers/storage: touch/card details, direct transitions and explicit completion.
  await page.setViewportSize({width:1376,height:900});await page.getByTestId('nav-preparation').tap();
  const card=page.getByTestId('preparation-card-action-fixture-0');
  await card.getByRole('button',{name:'Em preparo',exact:true}).tap();await card.getByRole('button',{name:'Pronto',exact:true}).waitFor();
  assert.equal(await page.getByTestId('preparation-finish-confirmation').count(),0);assert.equal(await page.getByTestId('preparation-details').count(),0);
  await card.getByText(/Kitchen action 0/).tap();const details=page.getByTestId('preparation-details');await details.waitFor();
  await details.getByRole('button',{name:'Alterar status',exact:true}).tap();await details.getByText(/9 · Pronto/).waitFor();assert.equal(await page.getByTestId('preparation-finish-confirmation').count(),0);
  await details.getByRole('button',{name:'Alterar status',exact:true}).tap();const confirmation=page.getByTestId('preparation-finish-confirmation');await confirmation.waitFor();
  await confirmation.getByRole('button',{name:'Cancelar',exact:true}).tap();await details.getByText(/9 · Pronto/).waitFor();
  await details.getByRole('button',{name:'Alterar status',exact:true}).tap();await confirmation.getByRole('button',{name:'Confirmar',exact:true}).tap();await details.getByText(/9 · Finalizado/).waitFor();await details.getByRole('button',{name:'Fechar',exact:true}).tap();await details.waitFor({state:'detached'});await card.waitFor({state:'detached'});
  await page.setViewportSize({width:1032,height:1376});const ready=page.getByTestId('preparation-card-action-fixture-2');await ready.focus();await page.keyboard.press('Enter');await details.waitFor();await details.getByRole('button',{name:'Fechar',exact:true}).tap();await details.waitFor({state:'detached'});
  await ready.getByRole('button',{name:'Finalizar',exact:true}).tap();await confirmation.waitFor();assert.equal(await details.count(),0,'Action button must not also open the card details');await confirmation.getByRole('button',{name:'Confirmar',exact:true}).tap();await ready.waitFor({state:'detached'});
  await page.getByTestId('nav-order').tap();
  await page.getByRole('radio', { name: 'Para levar', exact: true }).tap();
  await page.getByRole('textbox', { name: 'Nome do cliente, opcional', exact: true }).fill('Apresentação iPad');
  await page.getByTestId('confirm-order-identification').tap();
  await page.getByRole('button', { name: /^Adicionar / }).first().tap();
  // Non-pizza products use the same customization dialog as the native app.
  const add = page.getByRole('button', { name: 'Adicionar ao pedido', exact: true });
  await add.waitFor(); await add.tap();
  await page.getByTestId('finish-order').tap();
  await page.getByRole('button', { name: 'Fechar prévia', exact: true }).waitFor();
  const receipt = page.frameLocator('iframe[title="BistroHub — Receipt"]');
  await receipt.getByText('Apresentação iPad', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Ampliar zoom', exact: true }).tap();
  await page.waitForFunction(() => document.querySelector('iframe')?.contentDocument?.documentElement.style.zoom === '100%');
  await page.screenshot({ path: path.join(directory, 'receipt-ipad.png') });
  await page.getByRole('button', { name: 'Fechar prévia', exact: true }).tap();
  await page.getByTestId('nav-history').tap();
  await page.getByTestId('history-order').first().waitFor();
  await page.getByTestId('history-date-filter').tap();
  await page.getByRole('radio',{name:'Mês anterior',exact:true}).tap();
  await page.getByRole('button',{name:'Aplicar',exact:true}).tap();
  await page.waitForFunction(()=>document.querySelectorAll('[data-testid="history-order"]').length===100);
  await page.getByRole('button',{name:'Carregar mais pedidos',exact:true}).tap();
  await page.waitForFunction(()=>document.querySelectorAll('[data-testid="history-order"]').length===200);
  await page.getByRole('button',{name:'Carregar mais pedidos',exact:true}).tap();
  await page.waitForFunction(()=>document.querySelectorAll('[data-testid="history-order"]').length===205);
  assert.ok(queryRequests.some(url=>url.searchParams.has('after')),'History must request subsequent pages explicitly');
  await page.getByRole('button',{name:'Ver detalhes',exact:true}).first().tap();
  await page.getByText(/^Cliente: Historical fixture/).waitFor();
  // A persisted store/cache must survive reload, while login is still required.
  await page.reload(); await page.getByRole('button', { name: 'Entrar', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Vincular tablet', exact: true }).count(), 0);
  assert.deepEqual(errors, []); console.log(JSON.stringify({ ok: true, engine: process.env.WEB_APP_ENGINE || 'chromium', actualExpoExport: true, actualProviders: true, touchNavigation: true, screenshots: directory }));
 } catch (error) { await page.screenshot({ path: path.join(directory, 'failure.png') }); fs.writeFileSync(path.join(directory, 'failure.txt'), await page.locator('body').innerText()); console.error({ directory, errors }); throw error; }
 finally { await browser.close(); await new Promise(resolve => server.close(resolve)); cleanup.forEach(fn => fn()); }
})().catch(error => { console.error(error); process.exitCode = 1; });

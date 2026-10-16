// NODE_PATH=<temporary tooling>/node_modules node tests/browser/verify-layouts.cjs
// Needs playwright-core, esbuild, Chromium and openssl; no project dependency.
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const https = require('node:https'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { fixture } = require('../helpers/business-fixture.cjs');
const { buildTabletPreview } = require('./tablet-preview.cjs');
const viewports = [{width:320,height:568},{width:600,height:960},{width:960,height:600},{width:800,height:1280},{width:1280,height:800},{width:390,height:844},{width:844,height:390}];
async function selectPortalLanguage(page, language) {
  const picker = page.locator('#language');
  await picker.waitFor();
  assert.equal(await picker.locator('button').count(), 3);
  assert.deepEqual(await picker.locator('button').allTextContents(), ['', '', '']);
  assert.equal(await picker.locator('svg[aria-hidden=true]').count(), 3);
  const choice = picker.locator(`[data-language=${language}]`);
  if (await choice.getAttribute('aria-pressed') !== 'true') {
    await Promise.all([page.waitForEvent('framenavigated', frame => frame === page.mainFrame()), choice.click()]);
  }
  assert.equal(await page.locator('#language [aria-pressed=true]').getAttribute('data-language'), language);
}
async function verifyLatestManagerQuery(page) {
  await page.waitForFunction(()=>!document.querySelector('#consult').disabled);
  let firstReady, secondReady, releaseFirst, releaseSecond;
  const firstStarted=new Promise(resolve=>firstReady=resolve),secondStarted=new Promise(resolve=>secondReady=resolve);
  const firstGate=new Promise(resolve=>releaseFirst=resolve),secondGate=new Promise(resolve=>releaseSecond=resolve);
  let requests=0;
  const pattern='**/gestor/api/production?*';
  await page.route(pattern,async route=>{
    const index=++requests,response=await route.fetch(),data=await response.json();
    if(index===1){data.summary.count=987654;firstReady();await firstGate;}
    if(index===2){secondReady();await secondGate;}
    await route.fulfill({response,json:data});
  });
  try {
    await page.locator('#from').fill('2026-10-01');await page.locator('#to').fill('2026-10-02');await page.locator('#consult').click();await firstStarted;
    await page.locator('#from').fill('2026-10-03');await page.locator('#to').fill('2026-10-04');
    await page.locator('#filters').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
    releaseFirst();await secondStarted;
    assert.equal((await page.locator('#metrics').innerText()).replace(/\D/g,'').includes('987654'),false,'An outdated report must not appear while the latest query is pending');
    releaseSecond();await page.waitForFunction(()=>!document.querySelector('#consult').disabled);
    assert.equal(requests,2);assert.equal(await page.locator('#from').inputValue(),'2026-10-03');
  } finally {releaseFirst();releaseSecond();await page.unroute(pattern);}
}
async function verifyLoginCooldowns(browser, base, errors, directory) {
  const { loginPage } = await import('../../server/cloudflare/admin-panel.mjs');
  const { translate } = await import('../../server/cloudflare/manager-i18n.mjs');
  const labels = {
    pt: { name: 'Português', username: 'Usuário ou e-mail do painel', password: 'Senha do painel', submit: 'Ver lojas' },
    en: { name: 'English', username: 'Portal username or email', password: 'Portal password', submit: 'View stores' },
    es: { name: 'Español', username: 'Usuario o correo del portal', password: 'Contraseña del portal', submit: 'Ver tiendas' },
  };
  let cases = 0;
  for (const [language, words] of Object.entries(labels)) {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    try {
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      const time = new Date();
      // pauseAt advances the installed clock; pausing at the install timestamp
      // can already be in the past when another browser check is running.
      await page.clock.install({ time }); await page.clock.pauseAt(new Date(time.getTime() + 60000));
      let requests = 0;
      await page.route('**/cloud/provision', route => {
        requests++;
        return route.fulfill({ status: 429, contentType: 'application/json', headers: { 'Retry-After': '30', 'Access-Control-Allow-Origin': '*' }, body: '{"error":"RATE_LIMIT","retryAfterSeconds":30}' });
      });
      await page.goto(base + '/tablet-preview.html?language=' + language + '#/link');
      await page.getByRole('radio', { name: words.name, exact: true }).click();
      await page.getByLabel(words.username, { exact: true }).fill('synthetic-user');
      await page.getByLabel(words.password, { exact: true }).fill('synthetic-password');
      const submit = page.getByText(words.submit, { exact: true });
      await submit.click();
      const blocked = seconds => translate(language, 'Muitas tentativas. Tente novamente em {count} segundos.', { count: seconds });
      await page.getByText(blocked(30), { exact: true }).waitFor();
      assert.equal(await page.locator('[aria-disabled=true]').filter({ hasText: words.submit }).count(), 1);
      await page.getByLabel(words.password, { exact: true }).press('Enter');
      assert.equal(requests, 1, 'Keyboard submission must not bypass the wait');
      for (const viewport of viewports.slice(0, 2)) {
        await page.setViewportSize(viewport); await fits(page, `tablet cooldown ${language} ${viewport.width}x${viewport.height}`, true); cases++;
      }
      await page.clock.runFor(29000);
      await page.getByText(blocked(1), { exact: true }).waitFor();
      await page.clock.runFor(1000);
      await page.getByText(translate(language, 'Você já pode tentar novamente.'), { exact: true }).waitFor();
      assert.equal(await page.locator('[aria-disabled=true]').filter({ hasText: words.submit }).count(), 0);
      assert.equal(requests, 1, 'Expiry must enable retry without submitting automatically');
      // Exercise the actual server-rendered countdown with virtual browser time.
      // Password enforcement and exact deadlines are verified with the DB tests.
      await page.setContent(loginPage('cooldown-preview', blocked(30), '', language, 30));
      const panelButton = page.locator('form button[type=submit]');
      assert.equal(await panelButton.isDisabled(), true);
      for (const viewport of viewports.slice(0, 2)) {
        await page.setViewportSize(viewport); await fits(page, `panel cooldown ${language} ${viewport.width}x${viewport.height}`, true); cases++;
      }
      await page.clock.runFor(29000); assert.equal(await page.locator('#login-message').textContent(), blocked(1));
      await page.clock.runFor(1000); assert.equal(await panelButton.isDisabled(), false);
      assert.equal(await page.locator('#login-message').textContent(), translate(language, 'Você já pode tentar novamente.'));
      await page.screenshot({ path: path.join(directory, 'login-cooldown-' + language + '.png') });
    } finally { await context.close(); }
  }
  return cases;
}
async function fits(page, label, controls = false) {
  const result = await page.evaluate(checkControls => {
    const overflow = document.documentElement.scrollWidth > innerWidth + 1, outside = [];
    if (checkControls) for (const element of document.querySelectorAll('input,button,select,[role=button],[role=tab]')) {
      const rect = element.getBoundingClientRect(); if (!rect.width || !rect.height) continue;
      if (rect.left >= -1 && rect.right <= innerWidth + 1) continue;
      let ancestor = element.parentElement, scroll = false;
      while (ancestor) { if (['auto','scroll'].includes(getComputedStyle(ancestor).overflowX) && ancestor.scrollWidth > ancestor.clientWidth) {scroll = true; break;} ancestor = ancestor.parentElement; }
      if (!scroll) outside.push({text:(element.textContent || element.getAttribute('aria-label') || element.tagName).slice(0,90),left:rect.left,right:rect.right});
    }
    return {overflow,outside};
  }, controls);
  assert.deepEqual(result, {overflow:false,outside:[]}, label);
}
(async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bistro-layout-')), cleanup = [];
  await buildTabletPreview(directory);
  execFileSync('openssl', ['req','-x509','-newkey','rsa:2048','-nodes','-keyout',path.join(directory,'key.pem'),'-out',path.join(directory,'cert.pem'),'-days','1','-subj','/CN=localhost'], {stdio:'ignore'});
  const f = await fixture({after:fn=>cleanup.push(fn)}), worker = (await import('../../server/cloudflare/worker.mjs')).default;
  const {digest} = await import('../../server/cloudflare/manager-auth.mjs');
  const {translate:portalTranslation} = await import('../../server/cloudflare/manager-i18n.mjs');
  const {loadTs} = require('../helpers/load-ts.cjs'), {translate:appTranslation} = loadTs('src/i18n/translations.ts');
  f.modules('seabra-1',true,true,true,true);
  f.db.prepare('INSERT INTO manager_clients(id,name,store_ids,active,revision) VALUES(?,?,?,?,1)').run('11111111-1111-4111-8111-111111111111','Synthetic group','["seabra-1"]',1);
  const salt='0123456789abcdef0123456789abcdef',password='manager-layout-password';
  f.db.prepare('INSERT INTO manager_users(id,client_id,name,username,salt,hash,active,revision) VALUES(?,?,?,?,?,?,1,1)').run('manager','11111111-1111-4111-8111-111111111111','Gestor','manager',salt,await digest(password,salt));
  const server = https.createServer({key:fs.readFileSync(path.join(directory,'key.pem')),cert:fs.readFileSync(path.join(directory,'cert.pem'))}, async (req,res) => {
    try {
      if (req.url.startsWith('/tablet-preview')) { const file=req.url.startsWith('/tablet-preview.js')?'tablet-preview.js':'tablet-preview.html';res.writeHead(200,{'Content-Type':file.endsWith('js')?'text/javascript':'text/html; charset=utf-8'});res.end(fs.readFileSync(path.join(directory,file)));return; }
      const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);
      const response=await worker.fetch(new Request('https://'+req.headers.host+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})}),f.env);
      const headers=Object.fromEntries(response.headers);if(response.headers.has('Set-Cookie'))headers['set-cookie']=response.headers.getSetCookie();res.writeHead(response.status,headers);res.end(Buffer.from(await response.arrayBuffer()));
    }catch(error){console.error(error);res.writeHead(500);res.end('Preview error');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='https://localhost:'+server.address().port;
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  let cases=0;const errors=[];
  try {
    const context=await browser.newContext({ignoreHTTPSErrors:true,locale:'en-US'}),page=await context.newPage();page.on('pageerror',error=>{errors.push(error.message);console.error('PAGEERROR',error.message)});
    if(process.env.LAYOUT_ONLY!=='tablet'){await page.goto(base+'/admin');await page.locator('[name=username]').fill('admin');await page.locator('[name=password]').fill(f.env.ADMIN_VIEW_TOKEN);await page.locator('button[type=submit]').click();await page.waitForSelector('#home');await page.goto(base+'/admin#clients');
    for(const language of ['pt','en','es']){
      await page.goto(base+'/admin#clients');await selectPortalLanguage(page,language);await page.waitForSelector('#clients');
      await page.goto(base+'/admin#clients');assert.equal(await page.locator('#clients').isVisible(),true);assert.equal(await page.locator('#store-picker').count(),0);
      for(const viewport of viewports){await page.setViewportSize(viewport);await fits(page,`admin clients ${language} ${viewport.width}x${viewport.height}`,true);cases++;}
      await page.locator('#clients a[href="/admin?groupId=11111111-1111-4111-8111-111111111111"]').click();await page.waitForSelector('#locations');
      for(const viewport of viewports){await page.setViewportSize(viewport);await fits(page,`admin group locations ${language} ${viewport.width}x${viewport.height}`,true);cases++;}
      await page.locator('#locations a[href*="storeId=seabra-1"]').click();await page.waitForSelector('#stores');
      assert.equal(await page.locator('.edit-store').count(),1);assert.equal(await page.locator('#new-panel-password').getAttribute('minlength'),'8');
      for(const viewport of viewports){await page.setViewportSize(viewport);for(const view of ['home','clients','password','client-password','errors','printing','activity','stores','account']){await page.evaluate(view=>location.hash=view,view);await page.waitForFunction(view=>!document.querySelector('#'+view).hidden,view);await fits(page,`admin ${language} ${view} ${viewport.width}x${viewport.height}`,true);cases++;}}
      await page.goto(base+'/admin/gestores?groupId=11111111-1111-4111-8111-111111111111');assert.equal(await page.locator('#language [aria-pressed=true]').getAttribute('data-language'),language);
      for(const viewport of viewports){await page.setViewportSize(viewport);await fits(page,`admin provisioning ${language} ${viewport.width}x${viewport.height}`,true);cases++;}
      await page.locator('#client-name').fill('Grupo '+language);await page.locator('#stores input').first().check();await page.locator('#client-form button').click();await page.waitForFunction(message=>document.querySelector('#message').textContent===message,portalTranslation(language,'Cliente salvo.'));
      await page.goto(base+'/admin');
    }
    const another=await browser.newContext({ignoreHTTPSErrors:true,locale:'pt-BR'}),second=await another.newPage();second.on('pageerror',error=>errors.push(error.message));
    await second.goto(base+'/admin');await second.locator('[name=username]').fill('admin');await second.locator('[name=password]').fill(f.env.ADMIN_VIEW_TOKEN);await second.locator('button[type=submit]').click();await second.waitForSelector('#home');assert.equal(await second.locator('#language [aria-pressed=true]').getAttribute('data-language'),'es');await another.close();
    await page.goto(base+'/gestor');await page.locator('[name=username]').fill('manager');await page.locator('[name=password]').fill(password);await page.locator('form button').click();await page.waitForSelector('#filters');
    await verifyLatestManagerQuery(page);cases++;
    for(const language of ['pt','en','es']){
      await selectPortalLanguage(page,language);await page.waitForFunction(()=>document.querySelector('#consult')&&!document.querySelector('#consult').disabled);
      for(const area of ['production','sales']){await page.locator('#area-'+area).click();await page.waitForFunction(()=>!document.querySelector('#consult').disabled);for(const viewport of viewports){await page.setViewportSize(viewport);await fits(page,`manager ${language} ${area} ${viewport.width}x${viewport.height}`,true);cases++;}}
    }
    }
    if(process.env.LAYOUT_ONLY!=='portal'){
    const routes=['/','/order','/menu','/history','/history/detail','/printer','/settings-access','/preparation','/customers','/preorders','/cash','/cash-reports','/backups','/login','/link'];
    for(const language of ['pt','en','es']){
      await page.goto(base+'/tablet-preview.html?language='+language);await page.waitForFunction(()=>!!window.qa);
      for(const route of routes){
        await page.evaluate(route=>location.hash=route,route);await page.waitForTimeout(100);
        assert.deepEqual(errors,[],`JavaScript errors on ${route}`);
        if(route==='/customers')await page.getByText(appTranslation('Novo cliente',language),{exact:true}).click();
        if(route==='/preorders')await page.getByText(appTranslation('Nova encomenda',language),{exact:true}).click();
        if(route==='/backups')await page.getByText(appTranslation('Verificar backups',language),{exact:true}).click();
        if(route==='/cash-reports'){await page.getByText(appTranslation('Consultar relatório',language),{exact:true}).click();await page.getByText(appTranslation('Exportar CSV',language),{exact:true}).waitFor();}
        if(route==='/settings-access'){
          await page.getByText(appTranslation('Acesso protegido',language),{exact:true}).waitFor();
          await page.getByLabel(appTranslation('Senha de Configurações',language),{exact:true}).fill('draft-settings-password');
          assert.equal(await page.getByRole('radio').count(),0,'Settings language selection requires unlocking first');
          assert.equal(await page.getByText(appTranslation('Salvar configurações',language),{exact:true}).count(),0,'Settings remain locked');
        }
        if(route==='/link')await page.getByRole('radio',{name:{pt:'Português',en:'English',es:'Español'}[language],exact:true}).click();
        if(['/link','/login','/printer'].includes(route)){
          const flags=page.getByRole('radio').filter({has:page.locator('img')});
          assert.equal(await flags.count(),3);
          assert.equal(await page.getByRole('radio',{name:{pt:'Português',en:'English',es:'Español'}[language],exact:true}).getAttribute('aria-checked'),'true');
          assert.deepEqual(await flags.allTextContents(),['','','']);
          await page.waitForFunction(()=>Array.from(document.querySelectorAll('[role=radio] img')).every(img=>img.complete&&img.naturalWidth>0));
        }
        if(route==='/menu')await page.getByText('Produto sintético com descrição longa e acentuação · '+'Detalhes e opções '.repeat(8),{exact:true}).first().click();
        for(const viewport of viewports){await page.setViewportSize(viewport);await page.waitForTimeout(40);await fits(page,`APK components ${language} ${route} ${viewport.width}x${viewport.height}`,true);cases++;if(route==='/link'&&[600,960].includes(viewport.width))await page.screenshot({path:path.join(directory,`language-flags-${language}-${viewport.width}x${viewport.height}.png`)});if(['/login','/settings-access','/printer'].includes(route)&&[600,960].includes(viewport.width))await page.screenshot({path:path.join(directory,`language-flags-${route.slice(1)}-${language}-${viewport.width}x${viewport.height}.png`)});}
        if(route==='/settings-access'){
          assert.equal(await page.getByRole('radio').count(),0);
          assert.equal(await page.getByLabel(appTranslation('Senha de Configurações',language),{exact:true}).inputValue(),'draft-settings-password','Rotation preserves the protected access draft');
        }
      }
      await page.evaluate(()=>location.hash='/order');await page.waitForTimeout(100);
      const customer=page.locator('input[aria-label="'+appTranslation('Nome do cliente, opcional',language)+'"]');await customer.fill('Rotação · São José · Español');
      await page.setViewportSize({width:600,height:960});await page.setViewportSize({width:960,height:600});assert.equal(await customer.inputValue(),'Rotação · São José · Español');
      await page.evaluate(()=>window.qa.openProduct());await page.waitForTimeout(100);for(const viewport of viewports){await page.setViewportSize(viewport);await fits(page,`product dialog ${language} ${viewport.width}x${viewport.height}`,true);cases++;}await page.evaluate(()=>window.qa.setSelectedProduct(null));
      await page.evaluate(()=>window.qa.openReceipt());await page.waitForSelector('iframe[title=Receipt]');await page.waitForTimeout(400);
      for(const viewport of viewports){await page.setViewportSize(viewport);await page.waitForTimeout(80);await fits(page,`8 print destinations ${language} ${viewport.width}x${viewport.height}`,true);const button=page.getByText(appTranslation('Imprimir comanda',language),{exact:true}),rect=await button.boundingBox();if(!(rect.y>=0&&rect.y+rect.height<=viewport.height+1)){await page.screenshot({path:path.join(directory,'receipt-failed.png')});console.error({language,viewport,rect,screenshot:path.join(directory,'receipt-failed.png')});}assert.ok(rect.y>=0&&rect.y+rect.height<=viewport.height+1,'Receipt print button must remain reachable');cases++;}
      await page.screenshot({path:path.join(directory,'receipt-'+language+'-landscape.png')});await page.getByRole('button',{name:appTranslation('Fechar prévia',language),exact:true}).click();
      console.log(JSON.stringify({language,cases,errors}));
    }
    cases+=await verifyLoginCooldowns(browser,base,errors,directory);
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,cases,viewports,languages:['pt','en','es'],screenshots:directory,evidence:'Portals in Chromium; shipping APK components rendered through React Native Web with synthetic providers. Android hardware validation remains separate.'}));
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));cleanup.reverse().forEach(fn=>fn());}
})().catch(error=>{console.error(error);process.exitCode=1});

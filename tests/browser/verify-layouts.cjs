// NODE_PATH=<temporary tooling>/node_modules node tests/browser/verify-layouts.cjs
// Needs playwright-core, esbuild, Chromium and openssl; no project dependency.
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const https = require('node:https'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { fixture } = require('../helpers/business-fixture.cjs');
const { buildTabletPreview } = require('./tablet-preview.cjs');
const viewports = [{width:600,height:960},{width:960,height:600},{width:800,height:1280},{width:1280,height:800},{width:390,height:844},{width:844,height:390}];
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
  f.db.prepare('INSERT INTO manager_clients(id,name,store_ids,active,revision) VALUES(?,?,?,?,1)').run('group','Synthetic group','["seabra-1"]',1);
  const salt='0123456789abcdef0123456789abcdef',password='manager-layout-password';
  f.db.prepare('INSERT INTO manager_users(id,client_id,name,username,salt,hash,active,revision) VALUES(?,?,?,?,?,?,1,1)').run('manager','group','Gestor','manager',salt,await digest(password,salt));
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
    if(process.env.LAYOUT_ONLY!=='tablet'){await page.goto(base+'/admin');await page.locator('[name=username]').fill('admin');await page.locator('[name=password]').fill(f.env.ADMIN_VIEW_TOKEN);await page.locator('button[type=submit]').click();await page.waitForSelector('#store-picker');
    for(const language of ['pt','en','es']){
      await Promise.all([page.waitForEvent('framenavigated',frame=>frame===page.mainFrame()),page.locator('#language').selectOption(language)]);await page.waitForSelector('#store-picker');
      assert.equal(await page.locator('#language').inputValue(),language);
      for(const viewport of viewports){await page.setViewportSize(viewport);for(const view of ['password','errors','printing','activity','stores']){await page.evaluate(view=>location.hash=view,view);await page.waitForFunction(view=>!document.querySelector('#'+view).hidden,view);await fits(page,`admin ${language} ${view} ${viewport.width}x${viewport.height}`,true);cases++;}}
      await page.goto(base+'/admin/gestores');assert.equal(await page.locator('#language').inputValue(),language);
      for(const viewport of viewports){await page.setViewportSize(viewport);await fits(page,`admin provisioning ${language} ${viewport.width}x${viewport.height}`,true);cases++;}
      await page.locator('#client-name').fill('Grupo '+language);await page.locator('#stores input').first().check();await page.locator('#client-form button').click();await page.waitForFunction(message=>document.querySelector('#message').textContent===message,portalTranslation(language,'Cliente salvo.'));
      await page.goto(base+'/admin#stores');
    }
    const another=await browser.newContext({ignoreHTTPSErrors:true,locale:'pt-BR'}),second=await another.newPage();second.on('pageerror',error=>errors.push(error.message));
    await second.goto(base+'/admin');await second.locator('[name=username]').fill('admin');await second.locator('[name=password]').fill(f.env.ADMIN_VIEW_TOKEN);await second.locator('button[type=submit]').click();await second.waitForSelector('#store-picker');assert.equal(await second.locator('#language').inputValue(),'es');await another.close();
    await page.goto(base+'/gestor');await page.locator('[name=username]').fill('manager');await page.locator('[name=password]').fill(password);await page.locator('form button').click();await page.waitForSelector('#filters');
    for(const language of ['pt','en','es']){
      await Promise.all([page.waitForEvent('framenavigated',frame=>frame===page.mainFrame()),page.locator('#language').selectOption(language)]);await page.waitForFunction(()=>document.querySelector('#consult')&&!document.querySelector('#consult').disabled);
      for(const area of ['production','sales']){await page.locator('#area-'+area).click();await page.waitForFunction(()=>!document.querySelector('#consult').disabled);for(const viewport of viewports){await page.setViewportSize(viewport);await fits(page,`manager ${language} ${area} ${viewport.width}x${viewport.height}`,true);cases++;}}
    }
    }
    const routes=['/','/order','/menu','/history','/history/detail','/printer','/preparation','/customers','/preorders','/cash','/cash-reports','/backups','/login','/link'];
    for(const language of ['pt','en','es']){
      await page.goto(base+'/tablet-preview.html?language='+language);await page.waitForFunction(()=>!!window.qa);
      for(const route of routes){
        await page.evaluate(route=>location.hash=route,route);await page.waitForTimeout(100);
        assert.deepEqual(errors,[],`JavaScript errors on ${route}`);
        if(route==='/customers')await page.getByText(appTranslation('Novo cliente',language),{exact:true}).click();
        if(route==='/preorders')await page.getByText(appTranslation('Nova encomenda',language),{exact:true}).click();
        if(route==='/backups')await page.getByText(appTranslation('Verificar backups',language),{exact:true}).click();
        if(route==='/cash-reports'){await page.getByText(appTranslation('Consultar relatório',language),{exact:true}).click();await page.getByText(appTranslation('Exportar CSV',language),{exact:true}).waitFor();}
        if(route==='/link')await page.getByText({pt:'Português',en:'English',es:'Español'}[language],{exact:true}).click();
        if(route==='/menu')await page.getByText('Produto sintético com descrição longa e acentuação · '+'Detalhes e opções '.repeat(8),{exact:true}).first().click();
        for(const viewport of viewports){await page.setViewportSize(viewport);await page.waitForTimeout(40);await fits(page,`APK components ${language} ${route} ${viewport.width}x${viewport.height}`,true);cases++;}
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
    assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,cases,viewports,languages:['pt','en','es'],screenshots:directory,evidence:'Portals in Chromium; shipping APK components rendered through React Native Web with synthetic providers. Android hardware validation remains separate.'}));
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));cleanup.reverse().forEach(fn=>fn());}
})().catch(error=>{console.error(error);process.exitCode=1});

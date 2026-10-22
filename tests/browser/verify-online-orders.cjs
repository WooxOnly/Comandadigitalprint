const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite'),{chromium}=require('playwright-core');
(async()=>{
 const {onlinePublicResponse,onlineManagerResponse,onlineAdminResponse}=await import('../../server/cloudflare/online-api.mjs'),{defaultOnlineSettings}=await import('../../server/cloudflare/online-orders.mjs');
 const db=new DatabaseSync(':memory:');for(const name of ['schema.sql','cloud-schema.sql','diagnostics-schema.sql','store-schema.sql','migrations/20261022-online-orders.sql'])db.exec(fs.readFileSync('server/cloudflare/'+name,'utf8'));
 const statement=(sql,args=[])=>({bind:(...values)=>statement(sql,values),first:async()=>db.prepare(sql).get(...args),all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:{changes:db.prepare(sql).run(...args).changes}})});
 const env={DB:{prepare:statement,batch:async statements=>{db.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}},ADMIN_PASSWORD_SECRET:'test-online-browser-secret-123456789012345'};
 const now=Date.parse('2026-10-22T14:00:00Z'),stamp=new Date(now).toISOString();
 db.prepare("INSERT INTO online_client_modules(client_id,enabled,scheduling,tables_enabled,updated_at) VALUES('store:seabra-1',1,1,1,?)").run(stamp);
 db.prepare("INSERT INTO online_store_presets(store_id,table_count,qr_mode,updated_at) VALUES('seabra-1',10,'per-table',?)").run(stamp);
 db.prepare("INSERT INTO online_store_settings(store_id,data,updated_at) VALUES('seabra-1',?,?)").run(JSON.stringify({...defaultOnlineSettings(),published:true}),stamp);
 db.prepare("INSERT INTO client_licenses(client_id,expires_at,anchor_day,updated_at) VALUES('store:seabra-1',?,22,?)").run(now+366*86400000,now);
 const menu=Array.from({length:14},(_,i)=>({id:'product-'+i,name:i===0?'Pizza inteira — um nome longo / Whole pizza with a long product name':'Produto '+i,category:i<7?'Pizzas':'Lanches',price:8+i,...(i<7?{kind:'pizza'}:{})}));
 db.prepare("INSERT INTO store_events(store_id,mutation,key,data,actor,created_at) VALUES('seabra-1','browser-seed','menu',?,'test',?)").run(JSON.stringify(menu),stamp);
 let origin;
 const server=http.createServer(async(req,res)=>{try{
  const chunks=[];for await(const chunk of req)chunks.push(chunk);const headers=new Headers(req.headers);const url=origin+req.url;
  if(req.method==='POST')headers.set('Origin',origin);
  const request=new Request(url,{method:req.method,headers,...(chunks.length?{body:Buffer.concat(chunks)}:{})});
  const language=new URL(url).searchParams.get('_language')||'en';
  headers.set('Accept-Language',language);
  let response;
  const actualRequest=new Request(request,{headers});
  if(req.url.startsWith('/admin/'))response=await onlineAdminResponse(actualRequest,env,{browserLogin:{username:'owner'},sameOrigin:true,language,now});
  else if(req.url.startsWith('/gestor/'))response=await onlineManagerResponse(actualRequest,env,{client:{id:'store:seabra-1',store_ids:'["seabra-1"]'},user:{id:'browser-manager'}},language,now);
  else response=await onlinePublicResponse(actualRequest,env,now);
  if(!response){res.writeHead(404);res.end();return}res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(error){console.error(error);res.writeHead(500);res.end('error')}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),errors=[];
 const dir='/workspace/online-order-previews';fs.mkdirSync(dir,{recursive:true});let cases=0;
 try{
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
  // Browser's wall-clock should match the server's controlled business-time fixture.
  await page.clock.setFixedTime(new Date(now));await page.addInitScript(()=>sessionStorage.removeItem('bistro-online-cart:seabra-1:public'));
  for(const language of ['pt','en','es'])for(const theme of ['light','dark'])for(const size of [{width:390,height:844},{width:844,height:390},{width:768,height:1024},{width:1024,height:768},{width:1440,height:900}]){
   await page.emulateMedia({colorScheme:theme});await page.setViewportSize(size);await page.goto(origin+'/pedir/seabra-1?_language='+language);await page.waitForSelector('.online-product');assert.equal(await page.locator('.online-product').count(),14);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await page.locator('.online-product button').first().click();await page.locator('#second-flavor').selectOption('product-1');await page.locator('#item-note').fill('Sem cebola');await page.locator('#product-form button[type=submit]').click();assert.ok(await page.locator('#cart').textContent());
   await page.screenshot({path:path.join(dir,language+'-'+theme+'-'+size.width+'x'+size.height+'.png'),fullPage:true});cases++;
  }
  await page.goto(origin+'/pedir/seabra-1?_language=en');await page.locator('.online-product button').last().click();await page.locator('#product-form button[type=submit]').click();await page.locator('#customer').fill('Browser test');await page.locator('#contact').fill('5551234567');await page.locator('#submit').click();await page.waitForFunction(()=>document.querySelector('#online-result').textContent.includes('Order received.'));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM online_requests').get().n,1);
  const id=db.prepare('SELECT id FROM online_requests').get().id;
  await page.goto(origin+'/gestor/online?storeId=seabra-1&view=orders');await page.waitForSelector('#online-inbox article');page.once('dialog',d=>d.accept());await page.locator('#online-inbox button').first().click();await page.waitForFunction(()=>document.querySelector('#online-inbox').textContent.includes('Accepted'));
  assert.equal(db.prepare('SELECT status FROM online_requests WHERE id=?').get(id).status,'accepted');cases++;
  for(const route of ['/admin/online?storeId=seabra-1','/gestor/online?storeId=seabra-1'])for(const size of [{width:390,height:844},{width:1024,height:768}]){
   await page.setViewportSize(size);await page.goto(origin+route);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,route+' '+size.width);assert.ok(await page.locator('#save').isDisabled());cases++;
  }
  await page.goto(origin+'/admin/online/qr?storeId=seabra-1&table=3');await page.waitForSelector('.online-qr svg');await page.locator('.online-qr').screenshot({path:path.join(dir,'table-3-qr.png')});const target=await page.locator('.online-print-link a').getAttribute('href');await page.goto(target);assert.equal(await page.locator('#table').inputValue(),'3');cases++;
  assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,cases,screenshots:dir,evidence:'Public cart, pizza selection, authenticated settings and receipt/acceptance in Chromium; five device/orientation sizes; no native background-push or hardware claim.'}));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));db.close()}
})().catch(error=>{console.error(error);process.exitCode=1});

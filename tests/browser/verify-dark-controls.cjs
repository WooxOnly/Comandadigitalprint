// Shipping components, synthetic device services. Checks reported contrast/layout regressions.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright-core'),{buildTabletPreview}=require('./tablet-preview.cjs');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bistro-dark-controls-'));await buildTabletPreview(dir);
 const server=http.createServer((q,r)=>{const name=q.url.startsWith('/tablet-preview.js')?'tablet-preview.js':'tablet-preview.html';r.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':'text/html; charset=utf-8');r.end(fs.readFileSync(path.join(dir,name)))});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}),errors=[];let cases=0;
 try{for(const language of ['pt','en','es']){
 const p=await browser.newPage({colorScheme:'dark'});p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port+'/tablet-preview.html?language='+language+'#/order');await p.waitForFunction(()=>!!window.qa);
 await p.evaluate(()=>{window.qa.setHistory(previous=>previous.map(o=>({...o,createdAt:new Date().toISOString(),customer:'Cliente 20 caracteres'})));window.qa.setPreparation([{orderId:'synthetic-order',status:'preparing',startedAt:new Date(Date.now()-13*60000).toISOString(),updatedAt:new Date().toISOString()}]);});
 for(const viewport of [{width:1280,height:800},{width:800,height:1280}]){await p.setViewportSize(viewport);
 for(const route of ['/','/order','/menu','/history','/preparation']){await p.evaluate(r=>location.hash=r,route);await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 if(route==='/order'){
 const panel=p.getByTestId('current-order-panel'),items=p.getByTestId('current-order-items'),finish=p.getByTestId('finish-order');const a=await finish.boundingBox(),b=await items.boundingBox();assert.ok(b.y-a.y-a.height>=6,'Gap below Finish order');
 const colors=await p.getByTestId('order-service-options').locator('[role=radio]').evaluateAll(buttons=>buttons.map(b=>({selected:b.getAttribute('aria-checked'),ink:getComputedStyle(b.querySelector('feFlood')).floodColor,background:getComputedStyle(b).backgroundColor})));
 assert.equal(colors[0].ink,'rgb(255, 255, 255)');assert.equal(colors[1].ink,'rgb(243, 165, 136)');assert.notEqual(colors[0].background,colors[1].background);assert.ok(await panel.isVisible());
 }
 if(route==='/history'){
 const card=p.getByTestId('history-order').first();assert.equal(await card.getByRole('button').count(),2);assert.equal(await card.getByRole('button').allTextContents().then(v=>v.join('')),'');const badge=await card.getByTestId('history-preparation-status').boundingBox();const customer=await card.getByText('Cliente 20 caracteres',{exact:false}).first().boundingBox();assert.ok(Math.abs(badge.y-customer.y)<12,'Status alongside customer');
 const backgrounds=await card.evaluate(n=>{const values=[];for(let v=n.parentElement;v;v=v.parentElement)values.push(getComputedStyle(v).backgroundColor);return values});assert.ok(!backgrounds.includes('rgb(255, 255, 255)'),'No white History background');
 }
 if(route==='/preparation'){const text=await p.getByTestId('preparation-card-synthetic-order').textContent();assert.match(text,/- 13m/);assert.ok(!/13 minut/.test(text));}
 await p.screenshot({path:path.join(dir,language+'-'+viewport.width+'-'+(route==='/'?'home':route.slice(1))+'.png')});cases++;
 }}await p.close();}assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,cases,screenshots:dir}));}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});

const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright-core'),{buildTabletPreview}=require('./tablet-preview.cjs'),{loadTs}=require('../helpers/load-ts.cjs'),{translate}=loadTs('src/i18n/translations.ts');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bistro-history-'));await buildTabletPreview(dir);
 const server=http.createServer((q,r)=>{const file=q.url.startsWith('/tablet-preview.js')?'tablet-preview.js':'tablet-preview.html';r.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'text/html; charset=utf-8');r.end(fs.readFileSync(path.join(dir,file)))});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const errors=[];let cases=0;
 try{for(const language of ['pt','en','es'])for(const theme of ['light','dark'])for(const viewport of [{width:390,height:844},{width:800,height:1280},{width:1280,height:800}]){
  const p=await browser.newPage({viewport,colorScheme:theme});p.on('pageerror',e=>errors.push(e.message));const t=text=>translate(text,language);
  await p.goto('http://127.0.0.1:'+server.address().port+'/tablet-preview.html?language='+language+'#/history');await p.waitForFunction(()=>!!window.qa);
  const badge=p.getByTestId('history-preparation-status').first();await badge.getByText(t('Aguardando'),{exact:true}).waitFor();
  await p.evaluate(()=>window.qa.setHistory(previous=>previous.map(order=>({...order,createdAt:'2026-10-19T09:00:00Z'}))));
  const record={orderId:'synthetic-order',status:'preparing',updatedAt:'2026-10-19T09:05:00Z',startedAt:'2026-10-19T09:01:00Z'};
  await p.evaluate(r=>window.qa.setPreparation([r]),record);await badge.getByText(t('Em preparo'),{exact:true}).waitFor();
  await p.evaluate(()=>location.hash='/history/detail');const timeline=p.getByTestId('history-preparation-timeline');await timeline.waitFor();await timeline.getByText(t('Início do preparo'),{exact:true}).waitFor();assert.ok((await timeline.textContent()).includes('09:01')||(await timeline.textContent()).includes('9:01'));
  for(const status of ['ready','completed']){await p.evaluate(r=>window.qa.setPreparation([r]),{...record,status,readyAt:'2026-10-19T09:04:00Z',...(status==='completed'?{completedAt:'2026-10-19T09:04:00Z'}:{})});await badge.getByText(t(status==='ready'?'Pronto':'Finalizado'),{exact:true}).waitFor();}
  const summary=await p.getByText(t('Cliente')+': Cliente sintético',{exact:true}).boundingBox(),box=await timeline.boundingBox();if(viewport.width>=850)assert.ok(box.x>summary.x+summary.width,'Timeline to right');else assert.ok(box.y>summary.y,'Timeline below on narrow screen');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'No page overflow');
  if(language==='pt'&&theme==='light'&&viewport.width===1280){fs.mkdirSync('/workspace/artifacts/historico-preparo',{recursive:true});await p.screenshot({path:'/workspace/artifacts/historico-preparo/detalhes.png',fullPage:true});}
  await p.evaluate(()=>{window.qa.setPreparation([{orderId:'synthetic-order',status:'completed',updatedAt:'2026-10-19T09:05:00Z'}]);});await p.waitForFunction(text=>[...document.querySelectorAll('[data-testid=history-preparation-timeline] *')].filter(e=>e.childElementCount===0&&e.textContent===text).length===3,t('Horário não registrado'));assert.equal(await timeline.getByText(t('Horário não registrado'),{exact:true}).count(),3);
  await p.evaluate(()=>{window.qa.setPreparation([]);window.qa.setModules({preparation:false});});await timeline.waitFor({state:'hidden'});
  await p.close();cases++;
 }assert.deepEqual(errors,[]);console.log('History preparation UI passed: '+cases+' cases');}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

// Shipping React Native screen and AppShell through React Native Web; only device services and providers are synthetic.
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright-core');
const {buildTabletPreview}=require('./tablet-preview.cjs');
const {loadTs}=require('../helpers/load-ts.cjs');
const {translate}=loadTs('src/i18n/translations.ts');
const viewports=[{width:1280,height:800},{width:1200,height:800},{width:960,height:600},{width:800,height:1280},{width:600,height:960}];
(async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'bistro-preparation-board-'));await buildTabletPreview(directory);
 const server=http.createServer((request,response)=>{const file=request.url.startsWith('/tablet-preview.js')?'tablet-preview.js':'tablet-preview.html';response.writeHead(200,{'Content-Type':file.endsWith('.js')?'application/javascript':'text/html; charset=utf-8'});response.end(fs.readFileSync(path.join(directory,file)));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),errors=[];let cases=0;
 try{
  for(const language of ['pt','en','es']){
   const context=await browser.newContext(),page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
   try{
    await page.goto(base+'/tablet-preview.html?language='+language+'#/preparation');await page.waitForFunction(()=>!!window.qa);if(process.env.PREPARATION_ROLE==='cook')await page.evaluate(()=>window.qa.setProfile({username:'chef',role:'cook'}));
    await page.evaluate(()=>{const issued=Date.now()-26*3600000;const history=Array.from({length:12},(_,n)=>({id:'kitchen-'+n,plate:String(n+1),tabletLabel:'1',dailyNumber:n+1,customer:'Cliente com nome longo · Customer · Cliente',serviceMode:n%2?'takeout':'dine_in',createdAt:new Date(issued+n*3600000).toISOString(),items:Array.from({length:8},(_,i)=>({id:'item-'+i,productId:'pizza',name:'Pizza '+i+' · Produto com nome longo e acentuação',category:'Pizzas',quantity:i+1,note:'Sem cebola · No onions · Sin cebolla',flavors:['Calabresa','Mussarela'],extras:[]}))}));window.qa.setHistory(history.reverse());});
    for(const viewport of viewports){
     await page.setViewportSize(viewport);await page.getByTestId('preparation-card-kitchen-0').waitFor();
     await page.waitForFunction(()=>document.querySelectorAll('[data-testid^="preparation-card-"]').length===6);
     await page.waitForFunction(()=>Array.from(document.querySelectorAll('[data-testid^="preparation-card-"]')).every(element=>{const b=element.getBoundingClientRect();return b.width>150&&b.height>=145&&b.left>=0&&b.right<=innerWidth+1&&b.bottom<=innerHeight-40}));
     const geometry=await page.evaluate(()=>Array.from(document.querySelectorAll('[data-testid^="preparation-card-"]')).map(element=>{const b=element.getBoundingClientRect();return{id:element.getAttribute('data-testid'),left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height}}));
     assert.deepEqual(geometry.map(card=>card.id),Array.from({length:6},(_,n)=>'preparation-card-kitchen-'+n));
     for(const card of geometry){assert.ok(card.left>=0&&card.right<=viewport.width+1&&card.top>=0&&card.bottom<=viewport.height-40,'Six cards visible '+language+' '+JSON.stringify(viewport)+' '+JSON.stringify(card));assert.ok(card.height>=145);}
     const rows=[...new Set(geometry.map(card=>Math.round(card.top)))];assert.equal(rows.length,viewport.width>viewport.height?2:3);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
     await page.screenshot({path:path.join(directory,language+'-'+viewport.width+'x'+viewport.height+'.png')});cases++;
    }
    await page.getByRole('button',{name:translate('Próximos pedidos',language),exact:true}).click();await page.getByTestId('preparation-card-kitchen-6').waitFor();assert.equal(await page.getByTestId('preparation-card-kitchen-0').count(),0);
    await page.getByRole('button',{name:translate('Pedidos anteriores',language),exact:true}).click();
    const first=page.getByTestId('preparation-card-kitchen-0');await first.getByRole('button',{name:new RegExp(translate('Detalhes do pedido',language))}).click();
    await page.getByText('8× Pizza 7 · Produto com nome longo e acentuação',{exact:true}).waitFor();
    assert.equal(await page.getByText('Sem cebola · No onions · Sin cebolla',{exact:true}).count(),8,'All notes appear in details');
    assert.equal(await page.evaluate(()=>window.qa.printCalls.length),0,'Opening details never prints');
    await page.getByRole('button',{name:translate('Fechar',language),exact:true}).click();
    await page.evaluate(()=>window.qa.setKitchenReprint(false));assert.equal(await page.getByRole('button',{name:translate('Reimprimir',language),exact:true}).count(),0);
    await page.evaluate(()=>window.qa.setKitchenReprint(true));await first.getByRole('button',{name:translate('Reimprimir',language),exact:true}).click();
    assert.deepEqual(await page.evaluate(()=>window.qa.printCalls),[{id:'kitchen-0',isNew:false,source:'preparation'}]);
    cases+=4;
   }finally{await context.close();}
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,cases,viewports,languages:['pt','en','es'],screenshots:directory,evidence:'Six shipping KDS cards visible, chronological paging, complete details, portal flag visibility and manual reprint preview dispatch. Android device and physical printing remain separate.'}));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});

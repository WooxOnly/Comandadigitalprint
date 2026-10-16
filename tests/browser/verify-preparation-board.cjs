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
   const context=await browser.newContext({hasTouch:true}),page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
   try{
    await page.goto(base+'/tablet-preview.html?language='+language+'#/preparation');await page.waitForFunction(()=>!!window.qa);if(process.env.PREPARATION_ROLE==='cook')await page.evaluate(()=>window.qa.setProfile({username:'chef',role:'cook'}));
    await page.evaluate(()=>{const issued=Date.now()-26*3600000;const history=Array.from({length:24},(_,n)=>({id:'kitchen-'+n,plate:String(n+1),tabletLabel:'1',dailyNumber:n+1,customer:'Cliente com nome longo · Customer · Cliente',serviceMode:n%2?'takeout':'dine_in',createdAt:new Date(issued+n*3600000).toISOString(),items:Array.from({length:8},(_,i)=>({id:'item-'+i,productId:'pizza',name:'Pizza '+i+' · Produto com nome longo e acentuação',category:'Pizzas',quantity:i+1,note:'Sem cebola · No onions · Sin cebolla',flavors:['Calabresa','Mussarela'],extras:[]}))}));window.qa.setHistory(history.reverse());});
    for(const viewport of viewports){
     await page.setViewportSize(viewport);await page.getByTestId('preparation-card-kitchen-0').waitFor();
     const expectedCount=[1280,1200].includes(viewport.width)?12:8;const expectedRows=viewport.width>viewport.height?(expectedCount===12?3:2):4;
     await page.waitForFunction(count=>document.querySelectorAll('[data-testid^="preparation-card-"]').length===count,expectedCount);
     await page.waitForFunction(()=>Array.from(document.querySelectorAll('[data-testid^="preparation-card-"]')).every(element=>{const b=element.getBoundingClientRect();return b.width>150&&b.height>=145&&b.left>=0&&b.right<=innerWidth+1&&b.bottom<=innerHeight-40}));
     await page.waitForFunction(expected=>new Set([...document.querySelectorAll('[data-testid^="preparation-card-"]')].map(node=>Math.round(node.getBoundingClientRect().top))).size===expected,expectedRows);
     const geometry=await page.evaluate(()=>Array.from(document.querySelectorAll('[data-testid^="preparation-card-"]')).map(element=>{const b=element.getBoundingClientRect();return{id:element.getAttribute('data-testid'),left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height}}));
     assert.deepEqual(geometry.map(card=>card.id),Array.from({length:expectedCount},(_,n)=>'preparation-card-kitchen-'+n));
     for(const card of geometry){assert.ok(card.left>=0&&card.right<=viewport.width+1&&card.top>=0&&card.bottom<=viewport.height-40,'Responsive cards visible '+language+' '+JSON.stringify(viewport)+' '+JSON.stringify(card));assert.ok(card.height>=145&&card.height<=221);}
     const rows=[...new Set(geometry.map(card=>Math.round(card.top)))];assert.equal(rows.length,expectedRows);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
     const body=page.getByTestId('preparation-items-kitchen-0');
     assert.equal(await body.getByText('8× Pizza 7 · Produto com nome longo e acentuação',{exact:true}).count(),1,'All items remain available inside the compact card');
     assert.equal(await body.getByText('1× Pizza 0 · Produto com nome longo e acentuação',{exact:true}).evaluate(node=>getComputedStyle(node).textOverflow==='ellipsis'||getComputedStyle(node).whiteSpace==='nowrap'),false,'Long names wrap without ellipses');
     await body.evaluate(node=>{node.scrollTop=node.scrollHeight});
     const last=await body.getByText('8× Pizza 7 · Produto com nome longo e acentuação',{exact:true}).boundingBox(),bounds=await body.boundingBox();assert.ok(last.y<bounds.y+bounds.height&&last.y+last.height>bounds.y&&last.y+last.height<=bounds.y+bounds.height+1,'The end of the last item can be reached inside the card, including when its wrapped text is taller than the viewport');
     await body.evaluate(node=>{node.scrollTop=0});
     await page.screenshot({path:path.join(directory,language+'-'+viewport.width+'x'+viewport.height+'.png')});cases++;
    }
    await page.setViewportSize({width:1280,height:800});await page.waitForFunction(()=>document.querySelectorAll('[data-testid^="preparation-card-"]').length===12);
    const box=await page.getByTestId('preparation-pages').boundingBox();
    // Drive the actual RN Web responder with DOM touches. Physical Android
    // gesture arbitration is a separate device check, as with printing/audio.
    async function swipe(dx,dy=0){await page.waitForTimeout(80);await page.evaluate(async({box,dx,dy})=>{const x=box.x+box.width*.5,y=box.y+75,target=document.elementFromPoint(x,y);let touch;function dispatch(type,px,py,end=false){touch=new Touch({identifier:1,target,clientX:px,clientY:py,pageX:px,pageY:py,screenX:px,screenY:py});target.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches:end?[]:[touch],targetTouches:end?[]:[touch],changedTouches:[touch]}));}dispatch('touchstart',x,y);for(let step=1;step<=6;step++){dispatch('touchmove',x+dx*step/6,y+dy*step/6);await new Promise(resolve=>setTimeout(resolve,20));}dispatch('touchend',x+dx,y+dy,true);},{box,dx,dy});}
    await swipe(-180);await page.getByTestId('preparation-card-kitchen-12').waitFor();assert.equal(await page.getByTestId('preparation-card-kitchen-0').count(),0);
    await swipe(180);await page.getByTestId('preparation-card-kitchen-0').waitFor();await swipe(5,-70);assert.equal(await page.getByTestId('preparation-card-kitchen-0').count(),1,'Vertical scrolling does not turn the page');
    await swipe(-180);await page.getByTestId('preparation-card-kitchen-12').waitFor();await page.setViewportSize({width:800,height:1280});await page.waitForFunction(()=>document.querySelectorAll('[data-testid^="preparation-card-"]').length===8);assert.equal(await page.getByTestId('preparation-card-kitchen-12').count(),1,'Rotation keeps the previously visible order on screen');
    await page.getByRole('button',{name:translate('Pedidos anteriores',language),exact:true}).click();cases+=4;
    await page.getByRole('button',{name:translate('Próximos pedidos',language),exact:true}).click();await page.getByTestId('preparation-card-kitchen-8').waitFor();assert.equal(await page.getByTestId('preparation-card-kitchen-0').count(),0);
    await page.getByRole('button',{name:translate('Pedidos anteriores',language),exact:true}).click();
    const first=page.getByTestId('preparation-card-kitchen-0');await first.getByRole('button',{name:new RegExp(translate('Detalhes do pedido',language))}).click();
    await page.getByTestId('preparation-details').getByText('8× Pizza 7 · Produto com nome longo e acentuação',{exact:true}).waitFor();
    assert.equal(await page.getByTestId('preparation-details').getByText('Sem cebola · No onions · Sin cebolla',{exact:true}).count(),8,'All notes appear in details');
    assert.equal(await page.evaluate(()=>window.qa.printCalls.length),0,'Opening details never prints');
    await page.getByRole('button',{name:translate('Fechar',language),exact:true}).click();
    await page.evaluate(()=>window.qa.setKitchenReprint(false));assert.equal(await page.getByRole('button',{name:translate('Reimprimir',language),exact:true}).count(),0);
    await page.evaluate(()=>window.qa.setKitchenReprint(true));await first.getByRole('button',{name:translate('Reimprimir',language),exact:true}).click();
    assert.deepEqual(await page.evaluate(()=>window.qa.printCalls),[{id:'kitchen-0',isNew:false,source:'preparation'}]);
    cases+=4;
   }finally{await context.close();}
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,cases,viewports,languages:['pt','en','es'],screenshots:directory,evidence:'12 landscape / 8 portrait compact KDS cards, horizontal swipe paging, rotation anchor, vertical item scrolling, full wrapping text and independently scrollable item lists, chronological paging, complete details, portal flag visibility and manual reprint preview dispatch. Android device and physical printing remain separate.'}));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});

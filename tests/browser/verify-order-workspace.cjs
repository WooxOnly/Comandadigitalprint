// Actual app components with synthetic providers; Android device validation remains separate.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright-core'),{buildTabletPreview}=require('./tablet-preview.cjs');
const {loadTs}=require('../helpers/load-ts.cjs'),{translate}=loadTs('src/i18n/translations.ts');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bistro-approved-order-'));await buildTabletPreview(dir);
 const server=http.createServer((req,res)=>{const name=req.url.startsWith('/tablet-preview.js')?'tablet-preview.js':'tablet-preview.html';res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'text/html');res.end(fs.readFileSync(path.join(dir,name)));});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});let checks=0;const errors=[];
 const catalog=['Camarão frito ao alho / Fried shrimp and garlic — 1 lb','Mandioca frita / Fried yuca','Picanha acebolada / Picanha and onions plate','Frango a passarinho / Fried chicken bites','Hambúrguer duplo com bacon e queijo','Batata frita / French fries'].map((name,i)=>({id:'long-'+i,name,category:'Aperitivos',price:30,description:'Ingredientes: alho, azeite e ervas. '+('Descrição completa do restaurante. '.repeat(8))}));
 try{for(const language of ['pt','en','es'])for(const theme of ['light','dark']){
 const page=await browser.newPage({viewport:{width:1280,height:800},colorScheme:theme});page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/tablet-preview.html?language='+language+'#/order');await page.waitForFunction(()=>!!window.qa);await page.evaluate(c=>window.qa.setCatalog(c),catalog);
 const words=['Confirmar dados','Nome do cliente, opcional','Outro número de mesa','Editar','Fechar','Observação do produto'].map(text=>translate(text,language));
 // Real input drafts and collapse/expand; information is read-only and never opens add-product.
 const customer=page.getByRole('textbox',{name:words[1],exact:true});await customer.fill('Will');await page.getByRole('textbox',{name:words[2],exact:true}).fill('18');await page.getByTestId('confirm-order-identification').click();await page.getByTestId('edit-order-identification').waitFor();
 await page.waitForFunction(()=>{const cards=[...document.querySelectorAll('[data-testid^="order-product-long-"]')];return cards.length===6&&Math.abs(cards[0].getBoundingClientRect().y-cards[1].getBoundingClientRect().y)<1});
 assert.equal(await page.getByRole('checkbox').count(),0);const card=page.getByTestId('order-product-long-0');assert.equal(await card.getByText(catalog[0].name,{exact:true}).count(),1);
 await card.getByTestId('product-info-long-0').click();const dialog=page.getByTestId('product-ingredients-dialog');await dialog.waitFor();assert.equal(await dialog.getByText(catalog[0].description,{exact:true}).count(),1);assert.equal(await page.evaluate(()=>window.qa.printCalls.length),0);await dialog.getByRole('button').click();
 await page.screenshot({path:path.join(dir,language+'-'+theme+'-landscape.png')});await page.evaluate(()=>window.qa.setModules({cash:false}));await page.waitForTimeout(50);assert.doesNotMatch(await card.textContent(),/30[.,]00/);await page.evaluate(()=>window.qa.setModules({cash:true}));
 for(const size of [{width:960,height:600},{width:800,height:1280},{width:390,height:844},{width:1280,height:800}]){await page.setViewportSize(size);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);const result=await card.evaluate(el=>{const name=el.querySelector('[role=button]'),r=el.getBoundingClientRect();return {name: name.textContent, fits:name.scrollWidth<=name.clientWidth+1,width:r.width}});assert.ok(result.fits,JSON.stringify(result));assert.equal(await card.getByText(catalog[0].name,{exact:true}).evaluate(el=>getComputedStyle(el).textOverflow==='ellipsis'||getComputedStyle(el).whiteSpace==='nowrap'),false);checks++;}
 await page.getByTestId('edit-order-identification').click();assert.equal(await customer.inputValue(),'Will');assert.equal(await page.getByRole('textbox',{name:words[2],exact:true}).inputValue(),'18');await page.screenshot({path:path.join(dir,language+'-'+theme+'-identity.png')});await page.getByTestId('confirm-order-identification').click();
 // Plus retains the existing customization/notes dialog.
 await card.getByRole('button',{name:translate('Adicionar ',language)+catalog[0].name,exact:true}).click();
 await page.getByRole('textbox',{name:words[5],exact:true}).waitFor();checks+=5;await page.close();
 }assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,checks,screenshots:dir,evidence:'Actual app components in Chromium, synthetic device providers; not physical Android validation.'}));}
 finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});

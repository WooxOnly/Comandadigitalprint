const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright-core'),{buildTabletPreview}=require('./tablet-preview.cjs');
const {loadTs}=require('../helpers/load-ts.cjs'),{translate}=loadTs('src/i18n/translations.ts');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bistro-preorders-'));await buildTabletPreview(dir);
 const server=http.createServer((req,res)=>{const name=req.url.startsWith('/tablet-preview.js')?'tablet-preview.js':'tablet-preview.html';res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'text/html');res.end(fs.readFileSync(path.join(dir,name)));});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});let checks=0;const errors=[];
 try{for(const language of ['pt','en','es'])for(const theme of ['light','dark']){
  const page=await browser.newPage({viewport:{width:1280,height:800},colorScheme:theme});page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));const t=text=>translate(text,language);
  await page.goto('http://127.0.0.1:'+server.address().port+'/tablet-preview.html?language='+language+'#/preorders');await page.waitForFunction(()=>!!window.qa);
  await page.getByRole('button',{name:t('Nova encomenda'),exact:true}).click();await page.getByRole('button',{name:t('Salvar encomenda'),exact:true}).click();assert.ok(await page.getByText(t('Campo obrigatório.'),{exact:true}).count()>=5);checks++;
  await page.getByRole('textbox',{name:t('Cliente'),exact:true}).fill('Ana');await page.getByRole('textbox',{name:t('Contato'),exact:true}).fill('5551234567');
  for(const [key,value] of Object.entries({month:'2',day:'9',year:'2028',hour:'9',minute:'5'}))await page.getByTestId('scheduled-'+key).fill(value);
  await page.evaluate(()=>window.qa.setCatalog([{id:'starter',name:'Camarão ao alho',category:'Aperitivos',price:12,kind:'regular',description:'Ingredientes da loja'}]));
  await page.getByRole('button').filter({hasText:'Camarão ao alho'}).click();await page.getByRole('textbox',{name:t('Observação do produto'),exact:true}).fill('Sem cebola');
  await page.getByRole('button',{name:t('Adicionar à encomenda'),exact:true}).click();await page.getByRole('textbox',{name:t('Observações'),exact:true}).waitFor();assert.equal(await page.getByRole('textbox',{name:t('Observações'),exact:true}).inputValue(),'Sem cebola');checks++;
  await page.setViewportSize({width:800,height:1280});assert.equal(await page.getByTestId('scheduled-year').inputValue(),'2028');await page.setViewportSize({width:1280,height:800});checks++;
  await page.screenshot({path:path.join(dir,language+'-'+theme+'.png')});await page.getByRole('button',{name:t('Salvar encomenda'),exact:true}).click();await page.waitForFunction(()=>window.qa.savedPreorders.length===1);const saved=await page.evaluate(()=>window.qa.savedPreorders[0]);assert.equal(saved.customer,'Ana');assert.equal(saved.items[0].note,'Sem cebola');assert.equal(new Date(saved.dueAt).getMonth(),1);checks+=3;
  await page.getByRole('button',{name:t('Cancelar encomenda'),exact:true}).first().click();await page.getByRole('radio',{name:'will',exact:true}).click();await page.getByLabel(t('Senha'),{exact:true}).fill('wrong');await page.getByRole('button',{name:t('Confirmar cancelamento'),exact:true}).click();await page.getByText(t('Usuário ou senha incorretos.'),{exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.qa.cancellations.length),0);checks++;
  await page.getByLabel(t('Senha'),{exact:true}).fill('synthetic-approval');await page.getByRole('button',{name:t('Confirmar cancelamento'),exact:true}).click();await page.waitForFunction(()=>window.qa.cancellations.length===1);assert.equal(await page.evaluate(()=>window.qa.cancellations[0].username),'will');checks++;
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);checks++;await page.close();
 }assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,screenshots:dir,note:'Real app components with synthetic providers, not physical Android validation.'}));}
 finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});

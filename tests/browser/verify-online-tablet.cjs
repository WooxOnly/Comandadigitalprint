const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright-core'),{buildTabletPreview}=require('./tablet-preview.cjs');
(async()=>{
 const dir='/workspace/online-tablet-previews';fs.mkdirSync(dir,{recursive:true});await buildTabletPreview(dir);
 const server=http.createServer((req,res)=>{const file=req.url.startsWith('/tablet-preview.js')?'tablet-preview.js':'tablet-preview.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'text/html');res.end(fs.readFileSync(path.join(dir,file)))});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),errors=[];let cases=0;
 try{for(const language of ['pt','en','es'])for(const theme of ['light','dark']){
  const page=await browser.newPage({colorScheme:theme});page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/tablet-preview.html?language='+language);await page.waitForFunction(()=>!!window.qa);
  await page.evaluate(()=>window.qa.setOnline({enabled:true,receiving:true,pending:1,requests:[{id:'11111111-1111-4111-8111-111111111111',customer:'Cliente com nome longo / Long name',contact:'5551234567',address:'',notes:'Sem cebola / No onions',fulfillment:'table',table:'3',scheduledFor:null,timeZone:'America/New_York',createdAt:'2026-10-22T14:00:00Z',updatedAt:'2026-10-22T14:00:00Z',status:'pending',actor:null,subtotalCents:2700,items:[{productId:'test',name:'Pizza inteira com um nome longo / Whole pizza with a long name',quantity:2,note:'Sem cebola',unitPriceCents:1350}]}]}));
  for(const size of [{width:390,height:844},{width:844,height:390},{width:768,height:1024},{width:1024,height:768},{width:1440,height:900}]){
   await page.setViewportSize(size);await page.getByTestId('nav-online').click();await page.waitForSelector('[data-testid^=online-request-]');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.equal(await page.locator('[data-testid^=online-request-]').count(),1);await page.screenshot({path:path.join(dir,language+'-'+theme+'-'+size.width+'x'+size.height+'.png')});cases++;
  }
  await page.evaluate(()=>window.qa.setProfile({username:'cook',role:'cook'}));await page.waitForFunction(()=>!document.querySelector('[data-testid=nav-online]'));assert.equal(await page.locator('[data-testid^=online-request-]').count(),0);cases++;await page.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,cases,screenshots:dir,evidence:'Shipping native screen/nav rendered in Chromium, PT/EN/ES, light/dark and portrait/landscape; real Android notification/audio remains unverified.'}));
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});

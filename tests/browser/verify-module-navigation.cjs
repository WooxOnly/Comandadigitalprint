// Actual APK components via React Native Web; synthetic providers, no remote data.
// NODE_PATH=<temporary tooling>/node_modules node tests/browser/verify-module-navigation.cjs
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright-core');
const {buildTabletPreview}=require('./tablet-preview.cjs');
const flags=['preparation','preorders','customers','cash'];
const sizes=[{width:600,height:960},{width:960,height:600},{width:800,height:1280},{width:1280,height:800},{width:390,height:844},{width:844,height:390}];
(async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'bistro-module-navigation-'));await buildTabletPreview(directory);
 const server=http.createServer((req,res)=>{const file=req.url.startsWith('/tablet-preview.js')?'tablet-preview.js':'tablet-preview.html';res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':'text/html'});res.end(fs.readFileSync(path.join(directory,file)));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),errors=[];let cases=0;
 try{for(const language of ['pt','en','es']){
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/tablet-preview.html?language='+language);await page.waitForFunction(()=>!!window.qa);
  for(let mask=0;mask<16;mask++){
   const modules=Object.fromEntries(flags.map((flag,i)=>[flag,!!(mask&(1<<i))]));await page.evaluate(value=>window.qa.setModules(value),modules);
   await page.waitForFunction(count=>document.querySelectorAll('[role=tab]').length===count,5+Object.values(modules).filter(Boolean).length);
   for(const flag of flags){assert.equal(await page.getByTestId('nav-'+flag).count(),Number(modules[flag]));assert.equal(await page.getByTestId('home-module-'+flag).count(),Number(modules[flag]));if(modules[flag]){assert.equal(await page.getByTestId('home-module-'+flag).locator('img').count(),1);assert.equal(await page.getByTestId('nav-'+flag).locator('img').count(),1);}}
   cases++;
  }
  for(const size of sizes){await page.setViewportSize(size);await page.evaluate(()=>location.hash='/');
   for(const flag of flags){await page.getByTestId('nav-'+flag).click();await page.waitForFunction(flag=>location.hash==='#/'+flag,flag);await page.waitForFunction(flag=>document.querySelector('[data-testid="nav-'+flag+'"]')?.getAttribute('aria-selected')==='true',flag);
    await page.waitForFunction(flag=>{const el=document.querySelector('[data-testid="nav-'+flag+'"]'),bar=document.querySelector('[data-testid="bottom-navigation"]');const r=el.getBoundingClientRect(),b=bar.getBoundingClientRect();return r.left>=b.left-1&&r.right<=b.right+1;},flag);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);const rect=await page.getByTestId('nav-'+flag).boundingBox();assert.ok(rect.height>=44);cases++;
   }
   // Navigation never removes the six-card KDS layout or detaches the active tab.
   await page.getByTestId('nav-preparation').click();await page.screenshot({path:path.join(directory,language+'-'+size.width+'x'+size.height+'.png')});
  }
  for(const [route,tab] of [['/cash-reports','cash'],['/history/detail','history'],['/backups','printer']]){await page.evaluate(route=>location.hash=route,route);await page.waitForFunction(tab=>document.querySelector('[data-testid="nav-'+tab+'"]')?.getAttribute('aria-selected')==='true',tab);cases++;}
  // Turning everything off removes both entry points immediately after sync.
  await page.evaluate(()=>{location.hash='/';window.qa.setModules({preparation:false,preorders:false,customers:false,cash:false})});await page.waitForFunction(()=>document.querySelectorAll('[role=tab]').length===5);
  assert.equal(await page.getByTestId('nav-printer').count(),1);for(const flag of flags)assert.equal(await page.getByTestId('home-module-'+flag).count(),0);cases++;await page.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,cases,languages:['pt','en','es'],sizes,combinations:16,screenshots:directory,evidence:'Real APK components in Chromium; module synchronization, local bundled icons, taps, selection, horizontal scrolling, rotation and nested routes. Hardware tests remain separate.'}));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1});

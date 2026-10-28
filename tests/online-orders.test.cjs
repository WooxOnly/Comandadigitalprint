const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const {randomUUID}=require('node:crypto');
const {fixture}=require('./helpers/business-fixture.cjs');
const origin='https://example.com',now=Date.parse('2026-10-22T14:00:00Z');
async function onlineFixture(t){
 const f=await fixture(t);f.env.DB.batch=async statements=>{f.db.exec('BEGIN');try{const results=[];for(const item of statements){const result=await item.all();results.push({...result,meta:{changes:f.db.prepare('SELECT changes() AS n').get().n}})}f.db.exec('COMMIT');return results}catch(error){f.db.exec('ROLLBACK');throw error}};f.db.exec(fs.readFileSync('server/cloudflare/migrations/20261022-online-orders.sql','utf8'));
 const api=await import('../server/cloudflare/online-api.mjs'),core=await import('../server/cloudflare/online-orders.mjs');
 const client=await import('../server/cloudflare/licenses.mjs');
 for(const store of ['seabra-1','seabra-2']){
  const clientId=await client.licenseClient(f.env,store);
  f.db.prepare('INSERT INTO online_client_modules(client_id,enabled,scheduling,tables_enabled,updated_at) VALUES(?,1,1,1,?)').run(clientId,new Date(now).toISOString());
  f.db.prepare("INSERT INTO online_store_presets(store_id,table_count,qr_mode,updated_at) VALUES(?,10,'per-table',?)").run(store,new Date(now).toISOString());
  const settings={...core.defaultOnlineSettings(),published:true};
  f.db.prepare('INSERT INTO online_store_settings(store_id,data,updated_at) VALUES(?,?,?)').run(store,JSON.stringify(settings),new Date(now).toISOString());
  // Explicit active test licenses, never a public read initializing subscriptions.
  await client.clientLicense(f.env,clientId,now);
  f.db.prepare('UPDATE client_licenses SET expires_at=? WHERE client_id=?').run(now+86400000*300,clientId);
 }
 const publicCall=(path,data,headers={})=>api.onlinePublicResponse(new Request(origin+path,{method:data===undefined?'GET':'POST',headers:{'Accept-Language':'en',...(data===undefined?{}:{Origin:origin,'Content-Type':'application/json'}),...headers},...(data===undefined?{}:{body:JSON.stringify(data)})}),f.env,now);
 const page=await publicCall('/pedir/seabra-1'),csrfCookie=page.headers.get('set-cookie').split(';')[0],csrf=csrfCookie.slice(csrfCookie.indexOf('=')+1);
 const menu=[{id:'p1',name:'Bread <test>',category:'Breakfast',price:5},{id:'p2',name:'Pizza',category:'Pizzas',price:10,kind:'pizza'},{id:'p3',name:'Cheese',category:'Pizzas',price:12,kind:'pizza'}];
 for(const store of ['seabra-1','seabra-2'])f.db.prepare('INSERT INTO store_events(store_id,mutation,key,data,actor,created_at) VALUES(?,?,?,?,?,?)').run(store,randomUUID(),'menu',JSON.stringify(menu),'test',new Date(now).toISOString());
 const input=()=>({id:randomUUID(),customer:'Test customer',contact:'5551234567',paymentMethod:'cash',address:'',notes:'No onions',fulfillment:'pickup',table:'',scheduledFor:'',quotedSubtotalCents:1000,items:[{productId:'p1',quantity:2,note:''}],csrf});
 const send=(data,headers={})=>publicCall('/pedir/seabra-1/submit',data,{Cookie:csrfCookie,...headers});
 const settings=(change,store='seabra-1')=>{const row=f.db.prepare('SELECT data FROM online_store_settings WHERE store_id=?').get(store);f.db.prepare('UPDATE online_store_settings SET data=?,revision=revision+1 WHERE store_id=?').run(JSON.stringify({...JSON.parse(row.data),...change}),store)};
 return{...f,...api,...core,publicCall,input,send,settings,csrfCookie,csrf};
}
test('additive online submission uses catalog prices, is idempotent and never creates an operational sale/preparation',async t=>{
 const f=await onlineFixture(t),input=f.input();
 let r=await f.send(input);assert.equal(r.status,200);const receipt=await r.json();assert.equal(receipt.status,'pending');assert.match(receipt.token,/^[a-f0-9]{64}$/);
 r=await f.send(input);assert.equal(r.status,200);assert.deepEqual(await r.json(),receipt);
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM online_requests').get().n,1);
 assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM store_records WHERE key LIKE 'order:%' OR key LIKE 'preparation:%'").get().n,0);
 r=await f.send({...input,customer:'Changed'});assert.equal(r.status,409);
 r=await f.send({...f.input(),quotedSubtotalCents:1});assert.equal(r.status,409);assert.equal((await r.json()).code,'PRICE_CHANGED');
 r=await f.publicCall('/pedir/seabra-1/status?id='+input.id,undefined,{Authorization:'Bearer '+receipt.token});assert.equal((await r.json()).status,'pending');
 r=await f.publicCall('/pedir/seabra-1/status?id='+input.id);assert.equal(r.status,403);
 r=await f.publicCall('/pedir/seabra-2/status?id='+input.id,undefined,{Authorization:'Bearer '+receipt.token});assert.equal(r.status,403);
});
test('public writes enforce origin, CSRF, availability, module and current table channel',async t=>{
 const f=await onlineFixture(t);
 assert.equal((await f.send(f.input(),{Origin:'https://evil.example'})).status,403);
 assert.equal((await f.send({...f.input(),csrf:'bad'})).status,403);
 assert.equal((await f.send({...f.input(),fulfillment:'table',table:'1'})).status,403);
 f.db.prepare("INSERT INTO store_events(store_id,mutation,key,data,actor,created_at) VALUES('seabra-1',?,'product-option:p1',?,'test',?)").run(randomUUID(),JSON.stringify({productId:'p1',available:false,favorite:false}),new Date(now).toISOString());
 assert.equal((await f.send(f.input())).status,409);
 f.db.prepare('UPDATE online_client_modules SET enabled=0').run();assert.equal((await f.publicCall('/pedir/seabra-1')).status,404);
});
test('signed table QR works only with entitlement, valid table and automatic channel; switching preserves requests',async t=>{
 const f=await onlineFixture(t);const qr=await f.onlineSign(f.env,'table:seabra-1:per-table:3'),query=new URLSearchParams({dine:'1',table:'3',qr});
 const send=input=>f.publicCall('/pedir/seabra-1/submit?'+query,input,{Cookie:f.csrfCookie});
 let r=await send({...f.input(),fulfillment:'table',table:'3'});assert.equal(r.status,200);
 r=await send({...f.input(),fulfillment:'table',table:'4'});assert.equal(r.status,400);
 f.settings({channel:'whatsapp',whatsapp:'15551234567'});
 r=await send({...f.input(),fulfillment:'table',table:'3'});assert.equal(r.status,403);
 r=await f.publicCall('/pedir/seabra-1?'+query);assert.equal(r.status,403);
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM online_requests').get().n,1);
 const inbox=await f.onlineInbox(f.env,'seabra-1');assert.equal(inbox.receiving,false);assert.equal(inbox.requests.length,0);
});
test('immediate orders require opening; scheduled orders may arrive while closed for a future valid store-local time',async t=>{
 const f=await onlineFixture(t),closed=f.defaultOnlineSettings().hours;closed[4]={closed:false,open:'16:00',close:'22:00'};f.settings({hours:closed});
 let r=await f.send(f.input());assert.equal(r.status,409);assert.equal((await r.json()).code,'STORE_CLOSED');
 r=await f.send({...f.input(),scheduledFor:'2026-10-23T18:00'});assert.equal(r.status,200);
 r=await f.send({...f.input(),scheduledFor:'2026-10-23T00:30'});assert.equal(r.status,409);
 f.db.prepare('UPDATE online_client_modules SET scheduling=0').run();r=await f.send({...f.input(),scheduledFor:'2026-10-23T18:00'});assert.equal(r.status,403);
 assert.throws(()=>f.onlineScheduledTime('2026-11-01T01:30','America/New_York',now),/INVALID_SCHEDULE/);
});
test('WhatsApp only prepares detailed message and never auto-inserts the order',async t=>{
 const f=await onlineFixture(t);f.settings({channel:'whatsapp',whatsapp:'15551234567'});
 const r=await f.send(f.input());assert.equal(r.status,200);const v=await r.json();assert.equal(v.channel,'whatsapp');assert.ok(v.url.startsWith('https://wa.me/15551234567?text='));assert.ok(v.message.includes('Test customer'));assert.ok(v.message.includes('2 × Bread <test>'));assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM online_requests').get().n,0);
});
test('native requests are store-scoped and cook denied; acceptance is atomic, audited and independent of payment',async t=>{
 const f=await onlineFixture(t),input=f.input();await f.send(input);
 let r=await f.call('/online',undefined,f.a.token);assert.equal(r.status,200);assert.equal((await r.json()).requests.length,1);
 r=await f.call('/online/decision',{id:input.id,status:'accepted'},f.b.token);assert.equal(r.status,404);
 const responses=await Promise.all([f.call('/online/decision',{id:input.id,status:'accepted'},f.a.token),f.call('/online/decision',{id:input.id,status:'declined'},f.a.token)]);assert.ok(responses.some(r=>r.status===200));assert.ok(responses.some(r=>r.status===409));
 const row=f.db.prepare('SELECT status,actor FROM online_requests WHERE id=?').get(input.id);assert.notEqual(row.status,'pending');assert.equal(row.actor,'admin');
 assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM store_records WHERE key LIKE 'order:%'").get().n,0);
});
test('manager cannot escalate entitlements, cross tenants or save stale settings; admin presets guard revisions',async t=>{
 const f=await onlineFixture(t),config=await f.onlineConfig(f.env,'seabra-1'),session={client:{id:config.clientId,store_ids:JSON.stringify(['seabra-1'])},user:{id:'manager-1'}};
 const call=(path,data,options={})=>f.onlineManagerResponse(new Request(origin+path,{method:data?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...options},...(data?{body:JSON.stringify(data)}:{})}),f.env,session,'en',now);
 let r=await call('/gestor/api/online?storeId=seabra-2');assert.equal(r.status,403);
 r=await call('/gestor/api/online?storeId=seabra-1',{revision:config.revision,settings:config.settings,entitlements:{enabled:true}});assert.equal(r.status,409);
 r=await call('/gestor/api/online?storeId=seabra-1',{revision:config.revision,settings:{...config.settings,soundAlert:true}});assert.equal(r.status,200);
 r=await call('/gestor/api/online?storeId=seabra-1',{revision:config.revision,settings:config.settings});assert.equal(r.status,409);
 const request=data=>new Request(origin+'/admin/api/online?storeId=seabra-1',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(data)}),ctx={browserLogin:{username:'owner'},sameOrigin:true,language:'en',now};
 const data={entitlements:config.entitlements,preset:config.preset};r=await f.onlineAdminResponse(request(data),f.env,ctx);assert.equal(r.status,200);
 const before=f.db.prepare('SELECT * FROM online_store_presets').all();r=await f.onlineAdminResponse(request({...data,preset:{...data.preset,tableCount:9}}),f.env,ctx);assert.equal(r.status,409);assert.deepEqual(f.db.prepare('SELECT * FROM online_store_presets').all(),before);
});
test('generated public and admin page scripts compile and escape catalog and company markup',async t=>{
 const f=await onlineFixture(t),pages=await import('../server/cloudflare/online-pages.mjs');
 const config=await f.onlineConfig(f.env,'seabra-1');config.store.name='<script>bad()</script>';
 for(const language of ['pt','en','es'])for(const markup of [pages.onlinePublicPage('nonce',config,language,f.csrf,null,[{id:'test',name:'</script><script>bad()</script>',category:'test',price:2}]),pages.onlineSettingsPage('nonce',config,language,true),pages.onlineSettingsPage('nonce',config,language,false),pages.onlinePhotosPage('nonce',config,language,[{id:'p1',name:'Photo product'}],[])]){
 assert.ok(!markup.includes('<script>bad()'));
 for(const script of markup.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new Function(script[1]);
 }
});

test('public branding is opt-in and owner-only module endpoints reject unauthenticated sessions',async t=>{
 const f=await onlineFixture(t);
 let r=await f.publicCall('/pedir/seabra-1/logo');assert.equal(r.status,404);
 r=await f.adminResponse(new Request(origin+'/admin/api/online?storeId=seabra-1'),f.env);assert.equal(r.status,401);
 r=await f.adminResponse(new Request(origin+'/admin/online?storeId=seabra-1'),f.env);assert.equal(r.status,303);
 // Signed cloud token for a synthetic cook; no owner or manager session is granted.
 f.db.prepare("INSERT INTO store_events(store_id,mutation,key,data,actor,created_at) VALUES('seabra-1',?,'user:testcook',?,'test',?)").run(randomUUID(),JSON.stringify({username:'testcook',active:true,role:'cook'}),new Date(now).toISOString());
 const revision=f.db.prepare("SELECT revision FROM store_records WHERE store_id='seabra-1' AND key='user:testcook'").get().revision;
 const payload=btoa(JSON.stringify({storeId:'seabra-1',username:'testcook',revision,expires:Date.now()+60000}));
 const token=payload+'.'+require('node:crypto').createHmac('sha256',f.env.ADMIN_PASSWORD_SECRET).update('cloud-session:'+payload).digest('hex');
 r=await f.call('/online',undefined,token);assert.equal(r.status,403);
 r=await f.call('/online/decision',{id:randomUUID(),status:'accepted'},token);assert.equal(r.status,403);
});
test('generic internal QR requires a valid entered table and cannot bypass administrator entitlements',async t=>{
 const f=await onlineFixture(t);f.db.prepare("UPDATE online_store_presets SET qr_mode='generic',revision=revision+1 WHERE store_id='seabra-1'").run();
 const qr=await f.onlineSign(f.env,'table:seabra-1:generic:'),query=new URLSearchParams({dine:'1',qr});
 const send=input=>f.publicCall('/pedir/seabra-1/submit?'+query,input,{Cookie:f.csrfCookie});
 let r=await send({...f.input(),fulfillment:'table',table:'2'});assert.equal(r.status,200);
 r=await send({...f.input(),fulfillment:'table',table:'11'});assert.equal(r.status,400);
 f.db.prepare('UPDATE online_client_modules SET tables_enabled=0').run();r=await send({...f.input(),fulfillment:'table',table:'2'});assert.equal(r.status,403);
});
test('checkout requires a phone number and one of three payment preferences, without recording a payment',async t=>{
 const f=await onlineFixture(t);
 for(const patch of [{contact:'letters only'},{contact:'123'},{paymentMethod:''},{paymentMethod:'paid'},{customer:' '}]){const r=await f.send({...f.input(),...patch});assert.equal(r.status,400)}
 for(const paymentMethod of ['cash','credit','debit']){const input={...f.input(),paymentMethod},r=await f.send(input);assert.equal(r.status,200);const row=f.db.prepare('SELECT data FROM online_requests WHERE id=?').get(input.id);assert.equal(JSON.parse(row.data).paymentMethod,paymentMethod)}
 assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM store_records WHERE key LIKE 'order:%'").get().n,0);
});
test('portal has configuration/photos only; receiving and acceptance remain exclusive to authenticated tablet APIs',async t=>{
 const f=await onlineFixture(t),cfg=await f.onlineConfig(f.env,'seabra-1'),session={client:{id:cfg.clientId,store_ids:'["seabra-1"]'},user:{id:'manager'}};
 for(const path of ['/gestor/api/online/inbox','/gestor/api/online/decision'])assert.equal(await f.onlineManagerResponse(new Request(origin+path+'?storeId=seabra-1'),f.env,session,'en',now),null);
 const page=await f.onlineManagerResponse(new Request(origin+'/gestor/online?storeId=seabra-1&view=orders'),f.env,session,'en',now),markup=await page.text();assert.ok(!markup.includes('online-inbox'));assert.ok(markup.includes('view=photos'));
});
test('product photos require store authorization, valid catalog product and bounded raster content',async t=>{
 const f=await onlineFixture(t),cfg=await f.onlineConfig(f.env,'seabra-1'),session={client:{id:cfg.clientId,store_ids:'["seabra-1"]'},user:{id:'manager'}};
 const call=(store,data)=>f.onlineManagerResponse(new Request(origin+'/gestor/api/online/photos?storeId='+store,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(data)}),f.env,session,'en',now);
 const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH0sAAAAASUVORK5CYII=';
 assert.equal((await call('seabra-2',{productId:'p1',image})).status,403);
 assert.equal((await call('seabra-1',{productId:'missing',image})).status,404);
 assert.equal((await call('seabra-1',{productId:'p1',image:'data:image/svg+xml;base64,PHN2Zz4='})).status,400);
 assert.equal((await call('seabra-1',{productId:'p1',image})).status,200);
 let r=await f.publicCall('/pedir/seabra-1/photo?id=p1');assert.equal(r.status,200);assert.equal(r.headers.get('Content-Type'),'image/png');
 assert.equal((await call('seabra-1',{productId:'p1',image:null})).status,200);r=await f.publicCall('/pedir/seabra-1/photo?id=p1');assert.equal(r.status,404);
});

test('disabled online module hides native requests and blocks decisions without deleting historical requests',async t=>{const f=await onlineFixture(t),input=f.input();await f.send(input);f.db.prepare('UPDATE online_client_modules SET enabled=0').run();const inbox=await f.onlineInbox(f.env,'seabra-1');assert.equal(inbox.enabled,false);assert.deepEqual(inbox.requests,[]);await assert.rejects(()=>f.onlineDecision(f.env,'seabra-1',{id:input.id,status:'accepted'},'admin'),/MODULE_DISABLED/);assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM online_requests').get().n,1)});

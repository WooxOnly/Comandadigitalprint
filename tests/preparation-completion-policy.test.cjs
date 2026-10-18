const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {fixture}=require('./helpers/business-fixture.cjs'),{loadTs}=require('./helpers/load-ts.cjs');
const {nextPreparation,completeWhenReady,preparationDurations}=require('../shared/preparation-times.mjs');
const origin='https://example.com';
async function owner(f){const response=await f.adminResponse(new Request(origin+'/admin'),f.env),csrf=response.headers.getSetCookie().find(c=>c.startsWith('__Host-comanda_csrf=')).split(';')[0];const login=await f.adminResponse(new Request(origin+'/admin/login',{method:'POST',headers:{Cookie:csrf,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username:'admin',password:f.env.ADMIN_VIEW_TOKEN,csrf:csrf.split('=')[1]})}),f.env);assert.equal(login.status,303);return login.headers.getSetCookie().find(c=>c.startsWith('__Host-comanda_panel=')).split(';')[0];}
const policy=(f,cookie,useFinishButton)=>f.adminResponse(new Request(origin+'/admin/stores',{method:'PATCH',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({id:'seabra-1',name:'Seabra 1',preparationSettings:{allowReprint:true,...(useFinishButton===undefined?{}:{useFinishButton})}})}),f.env);
async function preparing(f){const id=randomUUID(),createdAt=new Date(Date.now()-120000).toISOString(),value={id,plate:'1',customer:'Will',createdAt,items:[{id:'item',name:'Pizza',category:'Pizzas',quantity:1,note:''}]};const write=(key,value,base=0)=>f.call('/change',{id:randomUUID(),key,value,base},f.a.token);assert.equal((await write('order:'+id,value)).status,200);const record=nextPreparation(undefined,value,'preparing',new Date(Date.now()-60000).toISOString(),'admin');const saved=await write('preparation:'+id,record);assert.equal(saved.status,200);return {order:value,record,base:(await saved.json()).revision};}
test('owner completion option preserves existing flow by default, validates, isolates stores and survives an older save',async t=>{
 const f=await fixture(t),cookie=await owner(f);f.modules('seabra-1',false,false,false,true);
 assert.equal((await(await f.call('/preparation-settings',undefined,f.a.token)).json()).useFinishButton,true);
 assert.equal((await policy(f,cookie,'false')).status,400);assert.equal((await policy(f,'',false)).status,401);assert.equal((await policy(f,cookie,false)).status,200);
 assert.deepEqual(await(await f.call('/preparation-settings',undefined,f.a.token)).json(),{allowReprint:true,useFinishButton:false});assert.equal((await(await f.call('/preparation-settings',undefined,f.b.token)).json()).useFinishButton,true);
 assert.equal((await policy(f,cookie,undefined)).status,200);assert.equal((await(await f.call('/preparation-settings',undefined,f.a.token)).json()).useFinishButton,false);
 const html=await(await f.adminResponse(new Request(origin+'/admin?groupId=unassigned&storeId=seabra-1',{headers:{Cookie:cookie}}),f.env)).text();assert.match(html,/name="preparationFinish"> Utilizar o botão finalizar no fluxo de preparo/);
 const forged=await f.call('/change',{id:randomUUID(),key:'preparation-flow-settings',value:{useFinishButton:true},base:0},f.a.token);assert.equal(forged.status,400);
});
test('Ready completes automatically with both stage times/actors and remains idempotent after policy changes',async t=>{
 const f=await fixture(t),cookie=await owner(f);f.modules('seabra-1',false,false,false,true);await policy(f,cookie,false);const before=await preparing(f),at=new Date().toISOString(),ready=nextPreparation(before.record,before.order,'ready',at,'admin'),command={id:randomUUID(),key:'preparation:'+before.order.id,value:ready,base:before.base};
 assert.equal((await f.call('/change',command,f.a.token)).status,200);const stored=JSON.parse(f.db.prepare('SELECT data FROM store_records WHERE key=?').get(command.key).data);
 assert.equal(stored.status,'completed');assert.equal(stored.readyAt,at);assert.equal(stored.completedAt,at);assert.equal(stored.readyBy,'admin');assert.equal(stored.completedBy,'admin');assert.equal(stored.startedAt,before.record.startedAt);
 assert.equal(preparationDurations(before.order,stored).preparationSeconds,(Date.parse(at)-Date.parse(before.record.startedAt))/1000);await policy(f,cookie,true);assert.equal((await f.call('/change',command,f.a.token)).status,200);assert.equal(f.db.prepare('SELECT count(*) AS n FROM store_events WHERE mutation=?').get(command.id).n,1);
});
test('enabled delivery confirmation keeps Ready until Finalizar and a retry survives disabling the option',async t=>{
 const f=await fixture(t),cookie=await owner(f);f.modules('seabra-1',false,false,false,true);const before=await preparing(f),ready=nextPreparation(before.record,before.order,'ready',new Date().toISOString(),'admin'),command={id:randomUUID(),key:'preparation:'+before.order.id,value:ready,base:before.base};
 const saved=await f.call('/change',command,f.a.token);assert.equal(saved.status,200);assert.equal(JSON.parse(f.db.prepare('SELECT data FROM store_records WHERE key=?').get(command.key).data).status,'ready');
 await policy(f,cookie,false);assert.equal((await f.call('/change',command,f.a.token)).status,200);await policy(f,cookie,true);
 const completed=nextPreparation(ready,before.order,'completed',new Date().toISOString(),'admin');assert.equal((await f.call('/change',{id:randomUUID(),key:command.key,value:completed,base:(await saved.json()).revision},f.a.token)).status,200);
});
test('offline cached policy completes a Ready action locally and updates only after synchronization',async t=>{
 const f=await fixture(t),cookie=await owner(f);f.modules('seabra-1',false,false,false,true);await policy(f,cookie,false);const tablet=f.tablet();await tablet.cloud.setSession(f.a);await tablet.cloud.sync();const restarted=f.tablet(tablet.saved);await restarted.cloud.load();assert.equal(restarted.cloud.preparationSettings().useFinishButton,false);
 const order={id:'example',createdAt:'2026-01-01T10:00:00Z'},started=nextPreparation(undefined,order,'preparing','2026-01-01T10:01:00Z','admin'),ready=nextPreparation(started,order,'ready','2026-01-01T10:02:00Z','admin');
 assert.equal(completeWhenReady(ready,restarted.cloud.preparationSettings().useFinishButton,'admin').status,'completed');assert.equal(completeWhenReady(ready,true,'admin').status,'ready');
 await policy(f,cookie,true);assert.equal(restarted.cloud.preparationSettings().useFinishButton,false);await restarted.cloud.setSession(f.a);await restarted.cloud.sync();assert.equal(restarted.cloud.preparationSettings().useFinishButton,true);
});

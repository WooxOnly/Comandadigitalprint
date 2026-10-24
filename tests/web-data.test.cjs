const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { fixture } = require('./helpers/business-fixture.cjs');
const { loadTs } = require('./helpers/load-ts.cjs');
const { createCloudSync } = loadTs('src/services/cloudSync.ts');
function order(id, createdAt) { return { id, createdAt, plate: '1', customer: 'Synthetic', items: [{ id:'item', name:'Item', category:'Group', quantity:1, note:'' }] }; }
function insert(f, key, value, store='seabra-1') {
  f.db.prepare('INSERT INTO store_events(store_id,mutation,key,data,actor,created_at) VALUES(?,?,?,?,?,?)').run(store,randomUUID(),key,JSON.stringify(value),'admin',new Date().toISOString());
}
function range() { const d = new Date(); return { start:new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime(),end:new Date(d.getFullYear(),d.getMonth(),d.getDate()+1).getTime() }; }
async function webClient(f, options = { web: true }, intercept) {
  const { cloudResponse } = await import('../server/cloudflare/cloud-api.mjs');
  const saved = new Map(), paths = [];
  const cloud = createCloudSync({getItem:async k=>saved.get(k)||null,setItem:async(k,v)=>saved.set(k,v)},'https://example.com/cloud',randomUUID,async()=>({}),async(url,requestOptions)=>{paths.push(new URL(url));return intercept?.(new URL(url)) || cloudResponse(new Request(url,requestOptions),f.env);},'seabra-1',options);
  await cloud.setSession(f.a);return {cloud,saved,paths};
}

test('web bootstraps current data without replaying thousands of historical events; native retains all records', async t => {
  const f = await fixture(t); f.modules('seabra-1',true,false,true,true);
  for (let i=0;i<1000;i++) {
    const id = 'old-' + i;
    insert(f,'order:'+id,order(id,'2025-01-01T12:00:00.000Z'));
    insert(f,'preparation:'+id,{orderId:id,status:'completed',updatedAt:'2025-01-01T12:40:00.000Z'});
  }
  const current = order('today',new Date().toISOString());
  insert(f,'order:today',current);
  insert(f,'order:old-active',order('old-active','2025-01-01T12:00:00.000Z'));
  insert(f,'preparation:old-active',{orderId:'old-active',status:'preparing',updatedAt:'2025-01-01T12:01:00.000Z'});
  const w = await webClient(f); await w.cloud.sync();
  assert.equal(w.cloud.status().status,'SYNCED');
  assert.deepEqual((await w.cloud.list('order:')).map(x=>x.id).sort(),['old-active','today']);
  assert.equal(w.paths.filter(x=>x.pathname==='/cloud/bootstrap').length,2);
  assert.equal(w.paths.filter(x=>x.pathname==='/cloud/changes').length,1);
  const checkpoint = w.paths.find(x=>x.pathname==='/cloud/changes');
  assert.ok(Number(checkpoint.searchParams.get('after')) >= 2000);
  const initial = w.paths.length; await w.cloud.sync();
  assert.equal(w.paths.slice(initial).some(x=>x.pathname==='/cloud/bootstrap'),false);
  const native = f.tablet();await native.cloud.setSession(f.a);await native.cloud.sync();
  assert.equal((await native.cloud.list('order:')).length,1002);
});

test('history is requested by period with deterministic pages, correct preparation and isolated stores', async t => {
  const f = await fixture(t); const timestamp='2025-02-01T12:00:00.000Z';
  for(let i=0;i<205;i++) insert(f,'order:past-'+String(i).padStart(3,'0'),order('past-'+String(i).padStart(3,'0'),timestamp));
  insert(f,'order:other-store',order('other-store',timestamp),'seabra-2');
  insert(f,'preparation:past-204',{orderId:'past-204',status:'completed',updatedAt:'2025-02-01T12:40:00.000Z'});
  const w=await webClient(f);await w.cloud.sync();assert.equal((await w.cloud.list('order:')).length,0);
  const period={start:Date.parse('2025-02-01T00:00:00.000Z'),end:Date.parse('2025-02-02T00:00:00.000Z')};
  const a=await w.cloud.queryOrders(period),b=await w.cloud.queryOrders(period,a.next),c=await w.cloud.queryOrders(period,b.next);
  assert.equal(a.orderIds.length,100);assert.equal(b.orderIds.length,100);assert.equal(c.orderIds.length,5);assert.equal(c.next,null);
  assert.equal(new Set([...a.orderIds,...b.orderIds,...c.orderIds]).size,205);
  assert.equal(await w.cloud.get('order:other-store'),undefined);
  assert.equal((await w.cloud.get('preparation:past-204')).status,'completed');
  const detail=await w.cloud.queryOrders(undefined,undefined,'past-204');assert.deepEqual(detail.orderIds,['past-204']);
  const bad=await f.call('/orders?start=invalid&end=invalid',undefined,f.a.token);assert.equal(bad.status,400);
  const forbidden=await f.call('/orders?storeId=seabra-2&start=2025-02-01&end=2025-02-02',undefined,f.a.token);assert.equal(forbidden.status,403);
});

test('new changes after the snapshot reach web, including an old order returned to the kitchen', async t => {
  const f = await fixture(t);f.modules('seabra-1',false,false,false,true);
  insert(f,'order:old',order('old','2025-01-01T12:00:00.000Z'));
  insert(f,'preparation:old',{orderId:'old',status:'completed',updatedAt:'2025-01-01T12:40:00.000Z'});
  const w=await webClient(f);await w.cloud.sync();assert.equal(await w.cloud.get('order:old'),undefined);
  insert(f,'preparation:old',{orderId:'old',status:'preparing',updatedAt:new Date().toISOString()});
  insert(f,'order:new',order('new',new Date().toISOString()));
  await w.cloud.sync();assert.equal(w.cloud.status().status,'SYNCED');
  assert.equal((await w.cloud.get('order:old')).id,'old');assert.equal((await w.cloud.get('preparation:old')).status,'preparing');assert.ok(await w.cloud.get('order:new'));
});

test('web migration preserves unsent historical orders and native offline queues', async t => {
  const f = await fixture(t),w=await webClient(f);
  // Local work remains durable even when its date is outside the web bootstrap.
  await w.cloud.setSession(null);w.cloud.setOfflineActor('admin');
  await w.cloud.write({'order:offline-old':order('offline-old','2025-01-01T12:00:00.000Z')});
  assert.equal(w.cloud.pending('order:offline-old'),true);
  await w.cloud.setSession(f.a);await w.cloud.sync();
  assert.equal(w.cloud.pending('order:offline-old'),false);
  assert.ok(await w.cloud.get('order:offline-old'));
  assert.ok(f.db.prepare("SELECT key FROM store_records WHERE store_id='seabra-1' AND key='order:offline-old'").get());
});

test('native initial snapshot keeps full offline history but skips obsolete record versions', async t => {
  const f=await fixture(t);
  for(let i=0;i<600;i++) insert(f,'menu',[{id:'product',name:'Product '+i,category:'Group',price:10}]);
  for(let i=0;i<12;i++) insert(f,'order:old-'+i,order('old-'+i,'2025-01-01T12:00:00.000Z'));
  const native=await webClient(f,{snapshot:true});await native.cloud.sync();
  assert.equal(native.cloud.status().status,'SYNCED');assert.equal((await native.cloud.list('order:')).length,12);
  assert.equal((await native.cloud.get('menu'))[0].name,'Product 599');
  assert.equal(native.paths.filter(x=>x.pathname==='/cloud/bootstrap').length,1);
  assert.equal(native.paths.find(x=>x.pathname==='/cloud/bootstrap').searchParams.get('scope'),'all');
  assert.ok(Number(native.paths.find(x=>x.pathname==='/cloud/changes').searchParams.get('after'))>=612);
  // A cached tablet with no connection still has every historical order.
  const offline=createCloudSync({getItem:async k=>native.saved.get(k)||null,setItem:async()=>{}},'https://example.com/cloud',randomUUID,async()=>({}),async()=>{throw Error('offline');},'seabra-1',{snapshot:true});
  assert.equal((await offline.list('order:')).length,12);
});

test('a native snapshot client falls back safely when an older backend lacks the endpoint', async t => {
  const f=await fixture(t);insert(f,'order:old',order('old','2025-01-01T12:00:00.000Z'));
  const native=await webClient(f,{snapshot:true},url=>url.pathname==='/cloud/bootstrap'?Response.json({error:'NOT_FOUND'},{status:404}):null);
  await native.cloud.sync();assert.equal(native.cloud.status().status,'SYNCED');assert.ok(await native.cloud.get('order:old'));
});

test('a write during bootstrap is recovered through the high-water cursor', async t => {
  const f=await fixture(t);let changed=false;
  const w=await webClient(f,{web:true},url=>{
    if(url.pathname==='/cloud/bootstrap'&&url.searchParams.get('scope')==='orders'&&!changed){changed=true;insert(f,'order:during-bootstrap',order('during-bootstrap',new Date().toISOString()));}
    return null;
  });
  await w.cloud.sync();assert.equal(w.cloud.status().status,'SYNCED');assert.ok(await w.cloud.get('order:during-bootstrap'));
});

test('bootstrap, history and details enforce sessions, role visibility and license revocation', async t => {
  const f=await fixture(t),{pbkdf2Sync}=require('node:crypto');
  const salt='ab'.repeat(16),hash=pbkdf2Sync('synthetic-pass',Buffer.from(salt,'hex'),100000,32,'sha256').toString('hex');
  for(const role of ['manager','cook']) insert(f,'user:'+role,{username:role,active:true,role,login:{salt,hash,iterations:100000}});
  insert(f,'customer:private',{id:'private',name:'Private',phone:'5551234567',email:'',addresses:[],notes:'',active:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
  const auth=await(await f.call('/login',{storeId:'seabra-1',username:'cook',password:'synthetic-pass'})).json();
  const query='/bootstrap?scope=all&deviceId='+randomUUID();
  assert.equal((await f.call(query)).status,401);
  const snapshot=await(await f.call(query,undefined,auth.token)).json();
  assert.equal(snapshot.records.some(row=>row.key==='customer:private'),false);
  assert.equal(snapshot.records.some(row=>row.key==='user:manager'),false);
  assert.equal(snapshot.records.some(row=>row.key==='user:cook'),true);
  const group=randomUUID();f.db.prepare('INSERT INTO manager_clients(id,name,store_ids) VALUES(?,?,?)').run(group,'Customer','["seabra-1"]');
  await (await import('../server/cloudflare/licenses.mjs')).clientLicense(f.env,group);
  f.db.prepare("UPDATE client_licenses SET status='blocked' WHERE client_id=?").run(group);
  for(const path of [query,'/orders?start=2025-01-01&end=2025-01-02','/order?id=anything']) assert.equal((await f.call(path,undefined,f.a.token)).status,403);
});

test('enabling a module refreshes current data even when there are no new record events', async t => {
  const f=await fixture(t),now=new Date().toISOString();
  insert(f,'customer:existing',{id:'existing',name:'Existing',phone:'5551234567',email:'',addresses:[],notes:'',active:true,createdAt:now,updatedAt:now});
  const w=await webClient(f);await w.cloud.sync();assert.equal(await w.cloud.get('customer:existing'),undefined);
  f.modules('seabra-1',false,false,true,false);await w.cloud.sync();assert.equal(w.cloud.status().status,'SYNCED');assert.equal((await w.cloud.get('customer:existing')).name,'Existing');
});

test('records already queried by a view can still receive newer bootstrap versions', async t => {
  const f=await fixture(t);f.modules('seabra-1',false,false,false,true);
  insert(f,'order:queried',order('queried','2025-01-01T12:00:00.000Z'));
  insert(f,'preparation:queried',{orderId:'queried',status:'completed',updatedAt:'2025-01-01T12:40:00.000Z'});
  const w=await webClient(f);await w.cloud.queryOrders(undefined,undefined,'queried');
  insert(f,'preparation:queried',{orderId:'queried',status:'preparing',updatedAt:new Date().toISOString()});
  await w.cloud.sync();assert.equal(w.cloud.status().status,'SYNCED');assert.equal((await w.cloud.get('preparation:queried')).status,'preparing');
});

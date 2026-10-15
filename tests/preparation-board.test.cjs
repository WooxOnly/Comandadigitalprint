const assert = require('node:assert/strict');
const {test} = require('node:test');
const {randomUUID,randomBytes,pbkdf2Sync} = require('node:crypto');
const {loadTs} = require('./helpers/load-ts.cjs');
const {fixture} = require('./helpers/business-fixture.cjs');
const {preparationQueue,PREPARATION_PAGE_SIZE} = loadTs('src/services/preparationQueue.ts');
const origin='https://example.com';
test('kitchen queue sorts issuance instants across offsets, days and status updates rather than arrival in history',()=>{
 const orders=[{id:'late',createdAt:'2026-10-14T15:00:00Z'},{id:'offset',createdAt:'2026-10-14T12:00:00-04:00'},{id:'yesterday',createdAt:'2026-10-13T23:59:00Z'},{id:'early',createdAt:'2026-10-14T10:00:00Z'},{id:'invalid',createdAt:'invalid'},{id:'done',createdAt:'2026-10-14T09:00:00Z'}];
 const records=[{orderId:'yesterday',status:'preparing',updatedAt:'2026-10-14T18:00:00Z'},{orderId:'done',status:'completed'}];
 assert.deepEqual(preparationQueue(orders,records).map(o=>o.id),['yesterday','early','late','offset']);
 assert.equal(orders[0].id,'late');
 assert.deepEqual(preparationQueue(orders,records,true,{start:Date.parse('2026-10-14T09:00:00Z'),end:Date.parse('2026-10-14T15:00:00Z')}).map(o=>o.id),['done','early']);
 assert.equal(PREPARATION_PAGE_SIZE,6);
 const ties=[{id:'b',createdAt:'2026-10-14T15:00:00Z'},{id:'a',createdAt:'2026-10-14T11:00:00-04:00'}];assert.deepEqual(preparationQueue(ties,[]).map(o=>o.id),['a','b']);
});
async function owner(f){const page=await f.adminResponse(new Request(origin+'/admin'),f.env),csrf=page.headers.getSetCookie().find(c=>c.startsWith('__Host-comanda_csrf=')).split(';')[0];const login=await f.adminResponse(new Request(origin+'/admin/login',{method:'POST',headers:{Cookie:csrf,Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username:'admin',password:f.env.ADMIN_VIEW_TOKEN,csrf:csrf.split('=')[1]})}),f.env);assert.equal(login.status,303);return login.headers.getSetCookie().find(c=>c.startsWith('__Host-comanda_panel=')).split(';')[0];}
const permit=(f,allow,storeId='seabra-1')=>f.db.prepare('INSERT INTO store_preparation_settings(store_id,allow_reprint) VALUES(?,?) ON CONFLICT(store_id) DO UPDATE SET allow_reprint=excluded.allow_reprint').run(storeId,Number(allow));
const order=(f,id=randomUUID(),storeId='seabra-1')=>{f.db.prepare('INSERT INTO store_records(store_id,key,data,revision) VALUES(?,?,?,1)').run(storeId,'order:'+id,JSON.stringify({id,plate:'1',customer:'',createdAt:new Date().toISOString(),items:[]}));return id;};
test('portal kitchen reprint toggle defaults off, validates strictly and preserves other locations and user permissions',async t=>{
 const f=await fixture(t),cookie=await owner(f);
 assert.deepEqual(await(await f.call('/preparation-settings',undefined,f.a.token)).json(),{allowReprint:false});
 const patch=settings=>f.adminResponse(new Request(origin+'/admin/stores',{method:'PATCH',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({id:'seabra-1',name:'Seabra 1',preparationSettings:settings})}),f.env);
 for(const invalid of [null,[],{},true,{allowReprint:'true'},{allowReprint:true,extra:true}])assert.equal((await patch(invalid)).status,400);
 assert.equal((await patch({allowReprint:true})).status,200);
 assert.deepEqual(await(await f.call('/preparation-settings',undefined,f.a.token)).json(),{allowReprint:true});
 assert.deepEqual(await(await f.call('/preparation-settings',undefined,f.b.token)).json(),{allowReprint:false});
 const html=await(await f.adminResponse(new Request(origin+'/admin?groupId=unassigned&storeId=seabra-1',{headers:{Cookie:cookie}}),f.env)).text();assert.match(html,/name="preparationReprint" checked/);
 assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM store_access_settings').get().count,0);
 assert.equal((await patch({allowReprint:false})).status,200);
});
test('kitchen reprinting requires module, explicit store opt-in, user permission and an order from that location at every authorization',async t=>{
 const f=await fixture(t),id=order(f),other=order(f,randomUUID(),'seabra-2');
 const authorize=(orderId=id,actor=f.a)=>f.call('/preparation-reprint',{orderId},actor.token);
 permit(f,true);assert.equal((await authorize()).status,403);f.modules('seabra-1',false,false,false,true);
 permit(f,false);assert.equal((await authorize()).status,403);permit(f,true);
 assert.equal((await authorize()).status,200);assert.equal((await authorize(other)).status,404);assert.equal((await authorize(null)).status,400);
 const salt=randomBytes(16).toString('hex'),hash=pbkdf2Sync('staff-password',Buffer.from(salt,'hex'),100000,32,'sha256').toString('hex');
 f.db.prepare('INSERT INTO store_records(store_id,key,data,revision) VALUES(?,?,?,1)').run('seabra-1','user:chef',JSON.stringify({username:'chef',active:true,login:{salt,hash,iterations:100000}}));
 const staff=await(await f.call('/login',{storeId:'seabra-1',username:'chef',password:'staff-password'})).json();
 f.db.prepare('INSERT INTO store_access_settings(store_id,data) VALUES(?,?)').run('seabra-1',JSON.stringify({menu:null,settings:null,reprint:[],restore:null}));
 assert.equal((await authorize(id,staff)).status,403);assert.equal((await authorize()).status,200);
 permit(f,false);assert.equal((await authorize()).status,403,'Permission is checked again after the receipt preview');
 assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM store_events').get().count,0,'Authorization alone does not change order or preparation state');
});
test('kitchen settings sync to the tablet, remain cached across restart and disable immediately on the next sync',async t=>{
 const f=await fixture(t),id=order(f);f.modules('seabra-1',false,false,false,true);permit(f,true);
 const tablet=f.tablet();await tablet.cloud.setSession(f.a);await tablet.cloud.sync();assert.equal(tablet.cloud.status().status,'SYNCED');assert.equal(tablet.cloud.preparationSettings().allowReprint,true);
 await tablet.cloud.authorizePreparationReprint(id);permit(f,false);await assert.rejects(tablet.cloud.authorizePreparationReprint(id),/não habilitada/);
 await tablet.cloud.sync();assert.equal(tablet.cloud.preparationSettings().allowReprint,false);
 const restart=f.tablet(tablet.saved);await restart.cloud.load();assert.equal(restart.cloud.preparationSettings().allowReprint,false);
 tablet.offline=true;await assert.rejects(tablet.cloud.authorizePreparationReprint(id),/conexão/);
});

const {test}=require('node:test'),assert=require('node:assert/strict');
const {randomUUID,randomBytes,pbkdf2Sync}=require('node:crypto');
const {fixture}=require('./helpers/business-fixture.cjs');
const {loadTs}=require('./helpers/load-ts.cjs');
const password='synthetic-password';
async function user(f,name,role,cancelPreorders=false){
 const salt=randomBytes(16).toString('hex'),value={username:name,role,cancelPreorders,active:true,login:{salt,iterations:100000,hash:pbkdf2Sync(password,Buffer.from(salt,'hex'),100000,32,'sha256').toString('hex')}};
 f.db.prepare('INSERT INTO store_events(store_id,mutation,key,data,actor,created_at) VALUES(?,?,?,?,?,?)').run('seabra-1',randomUUID(),'user:'+name,JSON.stringify(value),'admin',new Date().toISOString());
 const response=await f.call('/login',{storeId:'seabra-1',username:name,password});assert.equal(response.status,200);return {...await response.json(),storeId:'seabra-1',username:name,value};
}
async function order(f){const value={id:randomUUID(),customer:'Test',contact:'555',address:'',fulfillment:'pickup',dueAt:'2028-01-01T12:00:00Z',createdAt:new Date().toISOString(),status:'scheduled',items:[{id:randomUUID(),name:'Pizza',category:'Pizzas',quantity:1,note:''}]};const response=await f.call('/change',{id:randomUUID(),key:'preorder:'+value.id,value,base:0},f.a.token);assert.equal(response.status,200);return {value,base:(await response.json()).revision};}
const input=(order,username)=>({id:randomUUID(),orderId:order.value.id,base:order.base,username,password});
test('cancellation verifies credentials, records both users, is idempotent and preserves the operator session',async t=>{
 const f=await fixture(t);f.modules('seabra-1',true,false);const cashier=await user(f,'cashier','cashier'),manager=await user(f,'manager','manager'),o=await order(f),request=input(o,manager.username);
 assert.equal((await f.call('/preorders/cancel',{...request,password:'incorrect'},cashier.token)).status,401);
 assert.equal(JSON.parse(f.db.prepare('SELECT data FROM store_records WHERE key=?').get('preorder:'+o.value.id).data).status,'scheduled');
 const result=await f.call('/preorders/cancel',request,cashier.token);assert.equal(result.status,200);const saved=(await result.json()).record;
 assert.equal(saved.value.status,'cancelled');assert.deepEqual({...saved.value.cancellation,at:undefined},{authorizedBy:'manager',requestedBy:'cashier',at:undefined});
 assert.equal((await f.call('/preorders/cancel',request,cashier.token)).status,200);
 assert.equal(f.db.prepare('SELECT count(*) AS n FROM store_events WHERE mutation=?').get(request.id).n,1);
 assert.equal((await f.call('/changes',undefined,cashier.token)).status,200);
 assert.ok(!f.db.prepare('SELECT data FROM store_records WHERE key=?').get(saved.key).data.includes(password));
 assert.equal((await f.call('/change',{id:randomUUID(),key:saved.key,value:{...saved.value,status:'scheduled',cancellation:undefined},base:saved.revision},f.a.token)).status,403);
});
test('cashier cancellation is opt-in, cook cannot access and cancellation cannot be forged through normal sync',async t=>{
 const f=await fixture(t);f.modules('seabra-1',true,false);const cashier=await user(f,'cashier','cashier'),allowed=await user(f,'permitted','cashier',true),cook=await user(f,'cook','cook');
 const directory=await (await f.call('/preorders/cancellation-users',undefined,cashier.token)).json();assert.deepEqual(directory.users.map(u=>u.username),['admin','permitted']);assert.ok(!JSON.stringify(directory).includes('hash'));
 const o=await order(f);assert.equal((await f.call('/preorders/cancel',input(o,'cashier'),cashier.token)).status,403);assert.equal((await f.call('/preorders/cancel',input(o,'permitted'),cook.token)).status,403);assert.equal((await f.call('/preorders/cancellation-users',undefined,cook.token)).status,403);
 assert.equal((await f.call('/change',{id:randomUUID(),key:'preorder:'+o.value.id,value:{...o.value,status:'cancelled'},base:o.base},f.a.token)).status,403);
 assert.equal((await f.call('/change',{id:randomUUID(),key:'user:cashier',value:{...cashier.value,cancelPreorders:true},base:cashier.revision},cashier.token)).status,403);
 assert.equal((await f.call('/preorders/cancel',input(o,'permitted'),f.b.token)).status,403);
 assert.equal((await f.call('/preorders/cancel',input(o,'permitted'),cashier.token)).status,200);
});
test('permission revocation during password verification prevents cancellation atomically',async t=>{
 const f=await fixture(t);f.modules('seabra-1',true,false);const manager=await user(f,'manager','manager'),o=await order(f);
 const {cancelPreorder}=await import('../server/cloudflare/preorder-cancellation.mjs');
 await assert.rejects(cancelPreorder(f.env,f.a,input(o,'manager'),async()=>{
  f.db.prepare('INSERT INTO store_events(store_id,mutation,key,data,actor,created_at) VALUES(?,?,?,?,?,?)').run('seabra-1',randomUUID(),'user:manager',JSON.stringify({...manager.value,active:false}),'admin',new Date().toISOString());return {credential:manager.value,revision:manager.revision};
 }),/PREORDER_CHANGED/);
 assert.equal(JSON.parse(f.db.prepare('SELECT data FROM store_records WHERE key=?').get('preorder:'+o.value.id).data).status,'scheduled');
});
test('local user permission can be changed without replacing credentials and cannot be self-granted',async()=>{
 const {createLocalAuth,settingsAccessCode}=loadTs('src/services/localAuth.ts'),saved=new Map();
 const service=createLocalAuth({getItemAsync:async k=>saved.get(k)||null,setItemAsync:async(k,v)=>saved.set(k,v)},async n=>randomBytes(n));
 await service.load();await service.setup('admin','a','a');await service.verify('settings',settingsAccessCode());await service.createUser('cashier','b','b','cashier');const before=JSON.parse(saved.get('comandadigitalprint.user.cashier')).login;
 await service.updateUser('cashier',true,undefined,undefined,'cashier',true);assert.equal(service.listUsers()[0].cancelPreorders,true);assert.deepEqual(JSON.parse(saved.get('comandadigitalprint.user.cashier')).login,before);
 service.logout();await service.verify('login','b','cashier');await assert.rejects(service.updateUser('cashier',true,undefined,undefined,'cashier',false),/protegido/);
});
test('lost cancellation response is recovered by sync and never persists a password or blocks the next order',async t=>{
 const f=await fixture(t);f.modules('seabra-1',true,false);const manager=await user(f,'manager','manager'),o=await order(f),next=await order(f),tablet=f.tablet();await tablet.cloud.setSession(f.a);await tablet.cloud.sync();
 tablet.loseCancellationAck=true;await assert.rejects(tablet.cloud.cancelPreorder(o.value.id,manager.username,password),/UNAVAILABLE/);assert.ok(![...tablet.saved.values()].join('').includes(password));
 await tablet.cloud.sync();assert.equal((await tablet.cloud.get('preorder:'+o.value.id)).status,'cancelled');await tablet.cloud.cancelPreorder(next.value.id,manager.username,password);assert.equal((await tablet.cloud.get('preorder:'+next.value.id)).status,'cancelled');
 const cashier=await user(f,'cashier','cashier');await tablet.cloud.cacheUser(cashier.username,cashier.credential,cashier.revision);await tablet.cloud.setSession(cashier);
 await assert.rejects(tablet.cloud.write({'user:cashier':{...cashier.value,cancelPreorders:true}}),/ACCESS_DENIED/);
});

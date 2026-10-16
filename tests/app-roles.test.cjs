const {test}=require('node:test'),assert=require('node:assert/strict');
const {randomUUID,randomBytes,pbkdf2Sync}=require('node:crypto');
const {fixture}=require('./helpers/business-fixture.cjs'),{loadTs}=require('./helpers/load-ts.cjs');
const {APP_ROLES,appRole,roleScreen}=require('../shared/app-roles.mjs');
async function user(f,role){const username='user-'+role,salt=randomBytes(16).toString('hex'),value={username,role,active:true,login:{salt,hash:pbkdf2Sync('a',Buffer.from(salt,'hex'),100000,32,'sha256').toString('hex'),iterations:100000}};f.db.prepare('INSERT INTO store_events(store_id,mutation,key,data,actor,created_at) VALUES(?,?,?,?,?,?)').run('seabra-1',randomUUID(),'user:'+username,JSON.stringify(value),'admin',new Date().toISOString());const r=await f.call('/login',{storeId:'seabra-1',username,password:'a'});assert.equal(r.status,200);return{...(await r.json()),value,storeId:'seabra-1',username};}
const order=()=>({id:randomUUID(),plate:'1',customer:'Cliente',createdAt:new Date().toISOString(),items:[{id:'pizza',name:'Pizza',category:'Pizzas',quantity:1,note:''}]});
const write=(f,u,key,value)=>f.call('/change',{id:randomUUID(),key,value,base:f.db.prepare('SELECT revision FROM store_records WHERE store_id=? AND key=?').get(u.storeId,key)?.revision||0},u.token);
test('four profiles implement the requested screen matrix across all module combinations',()=>{
 const all=['home','order','menu','history','preparation','preorders','customers','cash','cash-reports','printer','backups'];
 const expected={admin:all,manager:all.filter(x=>!['printer','backups'].includes(x)),cashier:['home','order','history','preorders','customers','cash'],cook:['preparation']};
 for(let mask=0;mask<16;mask++){const modules=Object.fromEntries(['preparation','preorders','customers','cash'].map((key,i)=>[key,!!(mask&(1<<i))]));for(const role of APP_ROLES)for(const screen of all){const module=screen==='cash-reports'?'cash':screen;assert.equal(roleScreen(role,screen,modules),expected[role].includes(screen)&&(!(module in modules)||modules[module]),role+' '+screen+' '+mask);}}
 assert.equal(appRole('admin','cook'),'admin');assert.equal(appRole('legacy'),'cashier');assert.equal(appRole('staff','invalid'),null);assert.equal(roleScreen('__proto__','home'),false);
});
test('server checks operational roles, named Admin authority, self-escalation and credential revision on every request',async t=>{
 const f=await fixture(t);f.modules('seabra-1',true,true,true,true);const users={};for(const role of APP_ROLES)users[role]=await user(f,role);
 const {managerResponse}=await import('../server/cloudflare/manager-api.mjs');
 assert.equal((await f.adminResponse(new Request('https://example.com/admin/app-users',{headers:{Authorization:'Bearer '+users.admin.token}}),f.env)).status,401,'App Admin cannot enter owner administration');
 assert.equal((await managerResponse(new Request('https://example.com/gestor/api/stores',{headers:{Authorization:'Bearer '+users.admin.token}}),f.env)).status,401,'App role does not create a Customer Portal session');
 assert.equal((await f.call('/change',{key:42,value:{},id:randomUUID(),base:0},users.admin.token)).status,400);
 const ticket=order();assert.equal((await write(f,users.cashier,'order:'+ticket.id,ticket)).status,200);
 const another=order();assert.equal((await write(f,users.cook,'order:'+another.id,another)).status,403);
 const prep={orderId:ticket.id,status:'preparing',updatedAt:new Date().toISOString()};
 assert.equal((await write(f,users.cashier,'preparation:'+ticket.id,prep)).status,403);assert.equal((await write(f,users.cook,'preparation:'+ticket.id,prep)).status,200);
 assert.equal((await write(f,users.manager,'menu',[])).status,200);assert.equal((await write(f,users.cashier,'menu',[])).status,403);
 assert.equal((await write(f,users.manager,'order-settings',{requireCustomer:true})).status,403);assert.equal((await write(f,users.admin,'order-settings',{requireCustomer:true})).status,200);
 assert.equal((await f.call('/cash?deviceId='+randomUUID(),undefined,users.cook.token)).status,403);
 const query='/cash/report?start=2026-10-01T00:00:00.000Z&end=2026-11-01T00:00:00.000Z&timeZone=UTC';
 assert.equal((await f.call(query,undefined,users.cashier.token)).status,403);assert.equal((await f.call(query,undefined,users.manager.token)).status,200);
 const cookChanges=await(await f.call('/changes?features=operations-v1',undefined,users.cook.token)).json();assert.ok(!cookChanges.changes.some(row=>row.key==='menu'||row.key.startsWith('customer:')||row.key.startsWith('preorder:')));
 const promoted={...users.cook.value,role:'admin'};assert.equal((await write(f,users.cook,'user:'+promoted.username,promoted)).status,403);
 assert.equal((await write(f,users.manager,'user:'+promoted.username,promoted)).status,403);
 assert.equal((await write(f,users.admin,'user:'+promoted.username,promoted)).status,200);
 assert.equal((await f.call('/changes',undefined,users.cook.token)).status,401,'Profile changes revoke old sessions');
 assert.equal((await write(f,users.admin,'user:invalid',{...promoted,username:'invalid',role:'superuser'})).status,400);
});
test('cashiers manage customers online and offline only while the independent Customers module is enabled',async t=>{
 const f=await fixture(t);f.modules('seabra-1',false,false,true,false);f.modules('seabra-2',false,false,true,false);const cashier=await user(f,'cashier');
 const record={id:randomUUID(),name:'Ana',phone:'555-1234',email:'',addresses:['Main St'],notes:'',active:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},key='customer:'+record.id;
 assert.equal((await write(f,cashier,key,record)).status,200);
 const edited={...record,name:'Ana Silva'};assert.equal((await write(f,cashier,key,edited)).status,200);
 assert.equal((await f.call('/customers/history?customerId='+record.id,undefined,cashier.token)).status,200);
 assert.equal((await f.call('/customers/history?customerId='+record.id,undefined,f.b.token)).status,404);
 assert.equal((await write(f,cashier,key,{...edited,active:false})).status,200);
 assert.equal((await write(f,cashier,key,edited)).status,200);
 const tablet=f.tablet(new Map(),cashier);await tablet.cloud.setSession(cashier);await tablet.cloud.sync();
 const restarted=f.tablet(tablet.saved,cashier);await restarted.cloud.load();restarted.cloud.setOfflineActor(cashier.username);restarted.offline=true;
 const offlineRecord={...record,id:randomUUID(),name:'María'};const offlineKey='customer:'+offlineRecord.id;
 await restarted.cloud.write({[offlineKey]:offlineRecord});assert.equal(restarted.cloud.pending(offlineKey),true);
 await restarted.cloud.write({[key]:{...edited,notes:'Updated offline'}});
 f.modules('seabra-1',false,false,false,false);restarted.offline=false;await restarted.cloud.setSession(cashier);await restarted.cloud.sync();
 assert.equal(restarted.cloud.pending(offlineKey),true,'Disabling Customers preserves the offline queue');
 await assert.rejects(restarted.cloud.write({[key]:{...edited,name:'Blocked'}}),e=>e.code==='MODULE_DISABLED');
 assert.equal((await write(f,cashier,key,{...edited,name:'Blocked'})).status,403);
 assert.equal((await f.call('/customers/history?customerId='+record.id,undefined,cashier.token)).status,403);
 f.modules('seabra-1',false,false,true,false);await restarted.cloud.sync();
 assert.equal(restarted.cloud.pending(offlineKey),false);
 assert.equal(JSON.parse(f.db.prepare('SELECT data FROM store_records WHERE store_id=? AND key=?').get('seabra-1',offlineKey).data).name,'María');
 assert.equal(JSON.parse(f.db.prepare('SELECT data FROM store_records WHERE store_id=? AND key=?').get('seabra-1',key).data).notes,'Updated offline');
 assert.equal((await write(f,cashier,'user:forbidden',{...cashier.value,username:'forbidden'})).status,403,'Customer registration does not grant user administration');
});
test('offline role cache prevents forbidden writes and cooks sync successfully when Cash is enabled',async t=>{
 const f=await fixture(t);f.modules('seabra-1',true,true,true,true);const cook=await user(f,'cook'),ticket=order();await write(f,f.a,'order:'+ticket.id,ticket);
 const tablet=f.tablet(new Map(),cook);await tablet.cloud.setSession(cook);await tablet.cloud.sync();assert.equal(tablet.cloud.status().status,'SYNCED');assert.equal(tablet.cloud.role(cook.username),'cook');
 const restarted=f.tablet(tablet.saved,cook);await restarted.cloud.load();restarted.cloud.setOfflineActor(cook.username);restarted.offline=true;
 await assert.rejects(restarted.cloud.write({menu:[]}),e=>e.code==='ACCESS_DENIED');await assert.rejects(restarted.cloud.write({['order:'+randomUUID()]:order()}));
 await assert.rejects(restarted.cloud.write({['user:'+cook.username]:{...cook.value,role:'admin'}}),e=>e.code==='ACCESS_DENIED');
 await assert.rejects(restarted.cloud.cashCommand({operation:'open',id:randomUUID(),openingCents:0}),e=>e.code==='ACCESS_DENIED');
 const prep={orderId:ticket.id,status:'preparing',updatedAt:new Date().toISOString()};await restarted.cloud.write({['preparation:'+ticket.id]:prep});assert.equal(restarted.cloud.pending('preparation:'+ticket.id),true);
 assert.equal(restarted.cloud.allowed('settings'),false);assert.equal(restarted.cloud.allowed('restore'),false);
});
test('Admin and Manager can save menu prices after offline login without a cloud session',async t=>{
 const f=await fixture(t);f.modules('seabra-1',false,true,false,false);
 for(const role of ['admin','manager']){
  const operator=await user(f,role),tablet=f.tablet(new Map(),operator);await tablet.cloud.setSession(operator);await tablet.cloud.sync();
  await tablet.cloud.setSession(null);tablet.cloud.setOfflineActor(operator.username);tablet.offline=true;
  const menu=[{id:'pizza',name:'Pizza',category:'Pizzas',price:role==='admin'?12.5:13.5}];await tablet.cloud.write({menu});assert.equal(tablet.cloud.pending('menu'),true);
  tablet.offline=false;await tablet.cloud.setSession(operator);await tablet.cloud.sync();assert.equal(tablet.cloud.pending('menu'),false);
  assert.deepEqual(JSON.parse(f.db.prepare("SELECT data FROM store_records WHERE store_id='seabra-1' AND key='menu'").get().data),menu);
 }
});
test('changing operators cannot discard or overwrite a menu conflict without menu permission',async t=>{
 const f=await fixture(t),cashier=await user(f,'cashier'),a=f.tablet(),b=f.tablet();
 for(const tablet of [a,b]){await tablet.cloud.setSession(f.a);await tablet.cloud.sync();tablet.offline=true;}
 await a.cloud.write({menu:[{id:'pizza',name:'Server menu',category:'Pizzas',price:10}]});await b.cloud.write({menu:[{id:'pizza',name:'Local draft',category:'Pizzas',price:11}]});
 a.offline=false;await a.cloud.sync();b.offline=false;await b.cloud.sync();assert.equal(b.cloud.status().status,'CONFLICT');
 await b.cloud.cacheUser(cashier.username,cashier.credential,cashier.revision);await b.cloud.setSession(cashier);
 const before=b.saved.get('@comandadigitalprint/cloud-v1');
 for(const keepLocal of [true,false])await assert.rejects(b.cloud.resolve('menu',keepLocal),e=>e.code==='ACCESS_DENIED');
 assert.equal(b.saved.get('@comandadigitalprint/cloud-v1'),before,'Both denied choices preserve the draft and conflict');
 await b.cloud.setSession(f.a);await b.cloud.resolve('menu',true);assert.equal(b.cloud.pending('menu'),false);
 assert.equal(JSON.parse(f.db.prepare("SELECT data FROM store_records WHERE store_id='seabra-1' AND key='menu'").get().data)[0].name,'Local draft');
});
test('a late unauthorized response from a previous session cannot reject the new operator session',async t=>{
 const f=await fixture(t),cashier=await user(f,'cashier'),{cloudResponse}=await import('../server/cloudflare/cloud-api.mjs');
 let release,started;const waiting=new Promise(r=>started=r),held=new Promise(r=>release=r);
 const {createCloudSync}=loadTs('src/services/cloudSync.ts'),saved=new Map();
 const cloud=createCloudSync({getItem:async key=>saved.get(key)||null,setItem:async(key,value)=>saved.set(key,value)},'https://example.com/cloud',randomUUID,async()=>({}),async(url,options)=>{
  if(url.endsWith('/access')&&options.headers.Authorization==='Bearer '+f.a.token){started();await held;return Response.json({error:'LOGIN_REQUIRED'},{status:401});}
  return cloudResponse(new Request(url,options),f.env);
 },'seabra-1');
 await cloud.setSession(f.a);const previous=cloud.sync();await waiting;
 await cloud.cacheUser(cashier.username,cashier.credential,cashier.revision);await cloud.setSession(cashier);release();await previous;
 assert.equal(cloud.sessionRejected(),false);await cloud.sync();assert.equal(cloud.status().status,'SYNCED');
});
test('named Admin users can unlock hourly Settings and manage roles offline without changing passwords',async()=>{
 const {createLocalAuth,settingsAccessCode}=loadTs('src/services/localAuth.ts');const saved=new Map();const storage={getItemAsync:async k=>saved.get(k)||null,setItemAsync:async(k,v)=>saved.set(k,v)};
 const auth=createLocalAuth(storage,async n=>randomBytes(n));await auth.load();await auth.setup('admin','a','a');await auth.verify('settings',settingsAccessCode());await auth.createUser('owner','b','b','admin');auth.logout();await auth.verify('login','b','owner');assert.equal(auth.currentRole(),'admin');await auth.verify('settings',settingsAccessCode());await auth.createUser('chef','c','c','cook');await auth.updateUser('chef',true,undefined,undefined,'manager');auth.logout();await auth.verify('login','c','chef');assert.equal(auth.currentRole(),'manager');await assert.rejects(auth.verify('settings',settingsAccessCode()),/permissão/);
});

test('profiles alone determine access even when a legacy store list restricts or grants a user',async t=>{
 const f=await fixture(t);f.modules('seabra-1',true,true,true,true);const manager=await user(f,'manager'),cashier=await user(f,'cashier');
 f.db.prepare('INSERT INTO store_access_settings(store_id,data) VALUES(?,?)').run('seabra-1',JSON.stringify({menu:[],settings:[cashier.username],reprint:[],restore:[cashier.username]}));
 f.db.prepare('INSERT INTO store_cash_settings(store_id,data) VALUES(?,?)').run('seabra-1',JSON.stringify({tax:{enabled:false,rateBps:0},managers:[cashier.username]}));
 await f.call('/changes',undefined,manager.token);assert.equal((await write(f,manager,'menu',[])).status,200);
 assert.equal((await write(f,cashier,'order-settings',{requireCustomer:true})).status,403);
 assert.deepEqual(await(await f.call('/access',undefined,cashier.token)).json(),{menu:null,settings:null,reprint:null,restore:null});
 const tablet=f.tablet(new Map(),cashier);await tablet.cloud.cacheUser(cashier.username,cashier.credential,cashier.revision);await tablet.cloud.setSession(cashier);await tablet.cloud.sync();tablet.offline=true;
 assert.equal(tablet.cloud.allowed('reprint'),true);assert.equal(tablet.cloud.allowed('restore'),false);assert.equal(tablet.cloud.allowed('settings'),false);
 const {canManageCash}=await import('../server/cloudflare/cash-settings.mjs');assert.equal(canManageCash({username:cashier.username,role:'cashier'},{managers:[cashier.username]}),false);
});

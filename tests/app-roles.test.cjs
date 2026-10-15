const {test}=require('node:test'),assert=require('node:assert/strict');
const {randomUUID,randomBytes,pbkdf2Sync}=require('node:crypto');
const {fixture}=require('./helpers/business-fixture.cjs'),{loadTs}=require('./helpers/load-ts.cjs');
const {APP_ROLES,appRole,roleScreen}=require('../shared/app-roles.mjs');
async function user(f,role){const username='user-'+role,salt=randomBytes(16).toString('hex'),value={username,role,active:true,login:{salt,hash:pbkdf2Sync('a',Buffer.from(salt,'hex'),100000,32,'sha256').toString('hex'),iterations:100000}};f.db.prepare('INSERT INTO store_events(store_id,mutation,key,data,actor,created_at) VALUES(?,?,?,?,?,?)').run('seabra-1',randomUUID(),'user:'+username,JSON.stringify(value),'admin',new Date().toISOString());const r=await f.call('/login',{storeId:'seabra-1',username,password:'a'});assert.equal(r.status,200);return{...(await r.json()),value,storeId:'seabra-1',username};}
const order=()=>({id:randomUUID(),plate:'1',customer:'Cliente',createdAt:new Date().toISOString(),items:[{id:'pizza',name:'Pizza',category:'Pizzas',quantity:1,note:''}]});
const write=(f,u,key,value)=>f.call('/change',{id:randomUUID(),key,value,base:f.db.prepare('SELECT revision FROM store_records WHERE store_id=? AND key=?').get(u.storeId,key)?.revision||0},u.token);
test('four profiles implement the requested screen matrix across all module combinations',()=>{
 const all=['home','order','menu','history','preparation','preorders','customers','cash','cash-reports','printer','backups'];
 const expected={admin:all,manager:all.filter(x=>!['printer','backups'].includes(x)),cashier:['home','order','history','preorders','cash'],cook:['preparation']};
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
test('named Admin users can unlock hourly Settings and manage roles offline without changing passwords',async()=>{
 const {createLocalAuth,settingsAccessCode}=loadTs('src/services/localAuth.ts');const saved=new Map();const storage={getItemAsync:async k=>saved.get(k)||null,setItemAsync:async(k,v)=>saved.set(k,v)};
 const auth=createLocalAuth(storage,async n=>randomBytes(n));await auth.load();await auth.setup('admin','a','a');await auth.verify('settings',settingsAccessCode());await auth.createUser('owner','b','b','admin');auth.logout();await auth.verify('login','b','owner');assert.equal(auth.currentRole(),'admin');await auth.verify('settings',settingsAccessCode());await auth.createUser('chef','c','c','cook');await auth.updateUser('chef',true,undefined,undefined,'manager');auth.logout();await auth.verify('login','c','chef');assert.equal(auth.currentRole(),'manager');await assert.rejects(auth.verify('settings',settingsAccessCode()),/permissão/);
});

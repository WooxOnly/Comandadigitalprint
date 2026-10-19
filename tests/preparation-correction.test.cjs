const {test}=require('node:test'),assert=require('node:assert/strict');
const {randomUUID,randomBytes,pbkdf2Sync}=require('node:crypto');
const {fixture}=require('./helpers/business-fixture.cjs'),{loadTs}=require('./helpers/load-ts.cjs');
const {correctPreparation}=require('../server/cloudflare/preparation-correction.mjs');
const password='synthetic-password';
async function user(f,name,role,permitted=false){const salt=randomBytes(16).toString('hex'),value={username:name,role,correctPreparation:permitted,active:true,login:{salt,iterations:100000,hash:pbkdf2Sync(password,Buffer.from(salt,'hex'),100000,32,'sha256').toString('hex')}};f.db.prepare('INSERT INTO store_events(store_id,mutation,key,data,actor,created_at) VALUES(?,?,?,?,?,?)').run('seabra-1',randomUUID(),'user:'+name,JSON.stringify(value),'admin',new Date().toISOString());const response=await f.call('/login',{storeId:'seabra-1',username:name,password});assert.equal(response.status,200);return {...await response.json(),username:name,storeId:'seabra-1',value};}
async function ready(f,operator=f.a){f.modules('seabra-1',false,false,false,true);const id=randomUUID(),createdAt=new Date(Date.now()-120000).toISOString(),order={id,plate:'1',customer:'Will',createdAt,items:[{id:'item',name:'Pizza',category:'Pizzas',quantity:1,note:''}]};assert.equal((await f.call('/change',{id:randomUUID(),key:'order:'+id,value:order,base:0},f.a.token)).status,200);let base=0,record;for(const status of ['preparing','ready']){const at=new Date().toISOString();record={...record,orderId:id,status,updatedAt:at,...(status==='preparing'?{startedAt:at,startedBy:operator.username}:{readyAt:at,readyBy:operator.username})};const response=await f.call('/change',{id:randomUUID(),key:'preparation:'+id,value:record,base},operator.token);assert.equal(response.status,200);base=(await response.json()).revision;}return {id,base,record,request:{id:randomUUID(),orderId:id,base}};}
const stored=(f,id)=>JSON.parse(f.db.prepare('SELECT data FROM store_records WHERE store_id=? AND key=?').get('seabra-1','preparation:'+id).data);
test('same operator can undo the latest stage without credentials for exactly 60 seconds; expired/foreign/clock-forged requests require authorization',async t=>{
 const f=await fixture(t),cook=await user(f,'chef','cook'),other=await user(f,'other','cook'),o=await ready(f,cook),event=f.db.prepare('SELECT created_at FROM store_events WHERE seq=?').get(o.base),at=Math.min(Date.parse(event.created_at),Date.parse(o.record.updatedAt));
 const authenticate=async()=>{throw Error('Unexpected password request');};
 await assert.rejects(correctPreparation(f.env,cook,o.request,authenticate,()=>at+60001),/PREPARATION_AUTH_REQUIRED/);
 await assert.rejects(correctPreparation(f.env,other,o.request,authenticate,()=>at+100),/PREPARATION_AUTH_REQUIRED/);
 const result=await correctPreparation(f.env,cook,o.request,authenticate,()=>at+60000);assert.equal(result.record.value.status,'preparing');assert.equal(result.record.value.startedAt,o.record.startedAt);assert.equal(result.record.value.readyAt,undefined);assert.equal(result.record.value.correction.kind,'undo');
 assert.equal((await correctPreparation(f.env,cook,o.request,authenticate,()=>at+120000)).record.revision,result.record.revision,'Lost acknowledgements remain recoverable after expiry');
 assert.equal(f.db.prepare('SELECT count(*) n FROM store_events WHERE mutation=?').get(o.request.id).n,1);
 assert.equal(JSON.parse(f.db.prepare('SELECT data FROM store_events WHERE seq=?').get(o.base).data).status,'ready','Original history is immutable');
});
test('late correction needs fresh allowed credentials, preserves session and cannot be forged through ordinary sync',async t=>{
 const f=await fixture(t),cook=await user(f,'chef','cook'),permitted=await user(f,'allowed','cook',true),o=await ready(f,cook),input={...o.request,status:'received',username:'allowed',password};
 assert.equal((await f.call('/preparation/correct',{...input,password:'wrong'},cook.token)).status,401);
 assert.equal((await f.call('/preparation/correct',{...input,username:'chef'},cook.token)).status,403);
 const response=await f.call('/preparation/correct',input,cook.token);assert.equal(response.status,200);const record=(await response.json()).record;assert.equal(record.value.status,'received');assert.equal(record.value.startedAt,undefined);assert.equal(record.value.correction.authorizedBy,permitted.username);assert.equal(record.value.correction.requestedBy,'chef');assert.ok(!JSON.stringify(record).includes(password));
 assert.equal((await f.call('/preparation/correct',input,cook.token)).status,200);assert.equal((await f.call('/changes',undefined,cook.token)).status,200);
 assert.equal((await f.call('/change',{id:randomUUID(),key:record.key,value:{...record.value,status:'ready',correction:undefined},base:record.revision},f.a.token)).status,403);
 assert.equal((await f.call('/change',{id:randomUUID(),key:record.key,value:{...record.value,status:'received'},base:record.revision},f.a.token)).status,409);
 assert.equal((await f.call('/preparation/correct',input,f.b.token)).status,403);
 assert.equal((await f.call('/change',{id:randomUUID(),key:'user:chef',value:{...cook.value,correctPreparation:true},base:cook.revision},cook.token)).status,403);
});
test('permission revocation and concurrent stage changes are checked atomically',async t=>{
 const f=await fixture(t),manager=await user(f,'manager','manager'),o=await ready(f),request={...o.request,status:'preparing',username:'manager',password};
 await assert.rejects(correctPreparation(f.env,f.a,request,async()=>{f.db.prepare('INSERT INTO store_events(store_id,mutation,key,data,actor,created_at) VALUES(?,?,?,?,?,?)').run('seabra-1',randomUUID(),'user:manager',JSON.stringify({...manager.value,active:false}),'admin',new Date().toISOString());return {credential:manager.value,revision:manager.revision};}),/PREPARATION_CHANGED/);assert.equal(stored(f,o.id).status,'ready');
 const {weeklyAdmin}=await import('../server/cloudflare/admin-auth.mjs');const admin=await weeklyAdmin(f.env.ADMIN_PASSWORD_SECRET,Date.now(),0,'seabra-1');const ok=await f.call('/preparation/correct',{...o.request,status:'received',username:'admin',password:admin.password},f.a.token);assert.equal(ok.status,200);
 assert.equal((await f.call('/preparation/correct',{...o.request,id:randomUUID()},f.a.token)).status,409);
});
test('authorized user directory returns no credentials, includes managers automatically and flags other profiles only when enabled',async t=>{
 const f=await fixture(t);f.modules('seabra-1',false,false,false,true);const cook=await user(f,'chef','cook');await user(f,'manager','manager');await user(f,'cashier','cashier',true);
 const response=await f.call('/preparation/correction-users',undefined,cook.token);assert.equal(response.status,200);const result=await response.json();assert.deepEqual(result.users.map(u=>u.username),['admin','cashier','manager']);assert.ok(!JSON.stringify(result).includes('hash'));const cashier=await user(f,'other','cashier');assert.equal((await f.call('/preparation/correction-users',undefined,cashier.token)).status,403);
});
test('sync correction updates local cache, protects expected stage, and never saves passwords; offline correction never reports success',async t=>{
 const f=await fixture(t),manager=await user(f,'manager','manager'),o=await ready(f),tablet=f.tablet();await tablet.cloud.setSession(f.a);await tablet.cloud.sync();
 await assert.rejects(tablet.cloud.correctPreparation(o.id,'received','manager',password,'old timestamp'),/PREPARATION_CHANGED/);
 tablet.offline=true;await assert.rejects(tablet.cloud.correctPreparation(o.id,'received','manager',password),/UNAVAILABLE/);assert.ok(![...tablet.saved.values()].join('').includes(password));tablet.offline=false;
 await tablet.cloud.correctPreparation(o.id,'received','manager',password);assert.equal((await tablet.cloud.get('preparation:'+o.id)).status,'received');assert.ok(![...tablet.saved.values()].join('').includes(password));
 const cook=await user(f,'chef','cook');await tablet.cloud.cacheUser(cook.username,cook.credential,cook.revision);await tablet.cloud.setSession(cook);await assert.rejects(tablet.cloud.write({'user:chef':{...cook.value,correctPreparation:true}}),/ACCESS_DENIED/);
});
test('local permission updates preserve credentials and survive reload',async()=>{const {createLocalAuth,settingsAccessCode}=loadTs('src/services/localAuth.ts'),saved=new Map(),storage={getItemAsync:async k=>saved.get(k)||null,setItemAsync:async(k,v)=>saved.set(k,v)};const auth=createLocalAuth(storage,async n=>randomBytes(n));await auth.load();await auth.setup('admin','a','a');await auth.verify('settings',settingsAccessCode());await auth.createUser('chef','b','b','cook');const before=JSON.parse(saved.get('comandadigitalprint.user.chef')).login;await auth.updateUser('chef',true,undefined,undefined,'cook',false,true);assert.equal(auth.listUsers()[0].correctPreparation,true);assert.deepEqual(JSON.parse(saved.get('comandadigitalprint.user.chef')).login,before);await auth.load();assert.equal(auth.listUsers()[0].correctPreparation,true);});

test('automatic completion can be undone back to preparation without losing the original emission time',async t=>{
 const f=await fixture(t),o=await ready(f);const now=new Date().toISOString(),completed={...o.record,status:'completed',updatedAt:now,completedAt:now,completedBy:'admin'};
 const saved=await f.call('/change',{id:randomUUID(),key:'preparation:'+o.id,value:completed,base:o.base},f.a.token);assert.equal(saved.status,200);const base=(await saved.json()).revision;
 // Separate explicit finalization returns to Ready; automatic Ready+Complete returns to Preparing.
 const response=await f.call('/preparation/correct',{id:randomUUID(),orderId:o.id,base},f.a.token);assert.equal(response.status,200);assert.equal((await response.json()).record.value.status,'ready');
 f.db.prepare("INSERT INTO store_records(store_id,key,data,revision) VALUES('seabra-1','preparation-flow-settings',?,0)").run(JSON.stringify({useFinishButton:false}));
 const auto=await ready(f);assert.equal(stored(f,auto.id).status,'completed');
 const restored=await f.call('/preparation/correct',auto.request,f.a.token);assert.equal(restored.status,200);const value=(await restored.json()).record.value;assert.equal(value.status,'preparing');assert.equal(value.readyAt,undefined);assert.equal(value.completedAt,undefined);
});

test('lost correction acknowledgement recovers the same result without a second reversal or a stored password',async t=>{
 const f=await fixture(t),o=await ready(f),saved=new Map(),{cloudResponse}=await import('../server/cloudflare/cloud-api.mjs'),{createCloudSync}=loadTs('src/services/cloudSync.ts');let lose=true;
 const cloud=createCloudSync({getItem:async k=>saved.get(k)||null,setItem:async(k,v)=>saved.set(k,v)},'https://example.com/cloud',randomUUID,async()=>({}),async(url,options)=>{const response=await cloudResponse(new Request(url,options),f.env);if(lose&&url.endsWith('/preparation/correct')){lose=false;throw Error('lost acknowledgement');}return response;});await cloud.setSession(f.a);await cloud.sync();
 await assert.rejects(cloud.correctPreparation(o.id,undefined,undefined,undefined,o.record.updatedAt),/UNAVAILABLE/);
 const result=await cloud.correctPreparation(o.id,undefined,undefined,undefined,o.record.updatedAt);assert.equal(result.status,'preparing');assert.equal(f.db.prepare("SELECT count(*) n FROM store_events WHERE key=? AND json_extract(data,'$.correction.kind')='undo'").get('preparation:'+o.id).n,1);assert.ok(![...saved.values()].join('').includes(password));
});

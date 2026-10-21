import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { demoDataset } from '../scripts/seed-demo-homologacao.mjs';
import { productionReport } from '../server/cloudflare/production-report.mjs';
import { managerSalesReport } from '../server/cloudflare/manager-sales.mjs';
const store={id:'seabra-1',name:'Synthetic Demo',active:1,cash:1,customers:1,preorders:1,preparation:1};
const inventory=[{results:[store]},{results:[{store_id:store.id,data:readFileSync('server/menu.json','utf8')}]},{results:[]}];
test('120-day demo preserves existing data and sync, is repeatable, and reconciles real reports',async()=>{
 const data=demoDataset(inventory,store.id,new Date('2026-10-20T11:50:00Z'));
 assert.equal(data.days.length,120);assert.equal(data.summary.from,'2026-06-23');
 assert.ok(data.days.every(d=>d.orders>=30&&d.orders<=100));assert.ok(data.summary.orders>6000&&data.summary.orders<10000);
 assert.ok(data.preparations.every(p=>p.updatedAt<='2026-10-20T11:50:00.000Z'));
 const durations=data.preparations.filter(p=>p.completedAt).map(p=>(Date.parse(p.completedAt)-Date.parse(data.orders.find(o=>o.id===p.orderId).createdAt))/60000);
 assert.ok(Math.min(...durations)>=30&&Math.max(...durations)<=45&&Math.max(...durations)-Math.min(...durations)>=14);
 const db=new DatabaseSync(':memory:');
 try{
  for(const file of ['schema.sql','cloud-schema.sql','diagnostics-schema.sql','store-schema.sql'])db.exec(readFileSync('server/cloudflare/'+file,'utf8'));
  db.exec("INSERT INTO store_records VALUES('seabra-1','user:keep','{\"role\":\"admin\"}',1);INSERT INTO store_events(store_id,mutation,key,data,actor,created_at) VALUES('seabra-1','keep','order:keep','{}','original','2025-01-01')");
  for(const sql of data.sql)db.exec(sql);
  const before=db.prepare('SELECT COUNT(*) n FROM store_events').get().n;
  for(const sql of data.sql)db.exec(sql);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM store_events').get().n,before);
  assert.equal(db.prepare("SELECT data FROM store_records WHERE key='user:keep'").get().data,'{"role":"admin"}');
  assert.equal(db.prepare("SELECT COUNT(*) n FROM store_records WHERE key LIKE 'order:demo120-%'").get().n,data.orders.length);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM store_events WHERE key LIKE 'order:demo120-%'").get().n,data.orders.length);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM cash_sessions WHERE closed_at IS NULL").get().n,0);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM cash_sessions').get().n,120);
  const plans=[];
  const prepare=(sql,args=[])=>({bind:(...values)=>prepare(sql,values),all:async()=>{plans.push(db.prepare('EXPLAIN QUERY PLAN '+sql).all(...args).map(row=>row.detail));return{results:db.prepare(sql).all(...args)}}});
  const env={DB:{prepare,batch:async queries=>Promise.all(queries.map(q=>q.all()))}};
  const period={start:Date.parse('2026-06-23T04:00:00Z'),end:Date.parse('2026-10-21T04:00:00Z'),timeZone:'America/New_York'};
  const report=await productionReport(env,[store],period);
  assert.ok(plans.slice(0,6).every(plan=>plan.some(detail=>detail.includes('production_orders_by_date'))),'Every production query must use the date-range index instead of scanning all sync records');
  assert.equal(report.summary.count,data.orders.length);assert.equal(report.tma.samples,data.orders.length-9);
  assert.ok(report.tma.seconds>600&&report.tma.seconds<2400);assert.equal(report.breakdowns.days.length,120);
  assert.equal(report.operators.filter(o=>o.username?.startsWith('demo.cozinha.')).length,4);
  assert.deepEqual(report.operators.filter(o=>o.username?.startsWith('demo.cozinha.')).map(o=>o.displayName).sort(),['Kainan','Davi','Carla','Elizabeth'].sort());
  const cash=await managerSalesReport(env,[store],period);
  assert.equal(cash.totals.salesCount,data.sales.length);assert.equal(cash.closingCount,120);
  assert.ok(cash.averageTicketCents>0&&cash.totals.refundCount>0);
  assert.equal(cash.totals.netReceiptsCents,cash.methods.reduce((s,m)=>s+m.netCents,0));
  assert.ok(cash.closings.every(c=>c.differenceCents===0));
 }finally{db.close()}
});
test('disabled optional modules remain empty; unknown/disabled kitchen stores fail closed',()=>{
 const rows=[{results:[{...store,cash:0,preorders:0,customers:0}]},inventory[1],inventory[2]];
 const data=demoDataset(rows,store.id,new Date('2026-10-20T11:50:00Z'));
 assert.equal(data.sales.length,0);assert.equal(data.events.filter(e=>/^(customer:|preorder:)/.test(e.key)).length,0);
 assert.ok(data.sql.every(s=>!s.includes('cash_sessions')));
 assert.throws(()=>demoDataset(rows,'missing'),/not found/);
 assert.throws(()=>demoDataset([{results:[{...store,preparation:0}]},inventory[1]],store.id),/Kitchen/);
});

test('one additional presentation day covers the evening, preserves history and imports idempotently', async()=>{
 const rows=[{results:[{...store,cash:0,customers:0}]},inventory[1],inventory[2]];
 const now=new Date('2026-10-21T10:56:00Z');
 const history=demoDataset(rows,store.id,new Date('2026-10-20T18:00:00Z'));
 rows[4]={results:history.preparations.filter(p=>p.status!=='completed').map(p=>({store_id:store.id,key:'preparation:'+p.orderId,data:JSON.stringify(p),revision:history.events.findIndex(e=>e.key==='preparation:'+p.orderId)+1,created_at:history.orders.find(o=>o.id===p.orderId).createdAt}))};
 const data=demoDataset(rows,store.id,now,{days:1,prefix:'demo-day-v1-20261021-',throughDay:true});assert.equal(data.retiredKeys.length,9);
 assert.equal(data.summary.days,1);assert.equal(data.summary.from,'2026-10-21');assert.equal(data.summary.to,'2026-10-21');
 assert.ok(data.orders.length>=30&&data.orders.length<=100);assert.equal(data.summary.preorders,2);
 assert.ok(data.orders.every(o=>o.numberDay==='2026-10-21'&&o.id.startsWith('demo-day-v1-20261021-')));
 assert.ok(data.orders.some(o=>Date.parse(o.createdAt)>Date.parse('2026-10-22T00:00:00Z')),'Presentation samples include the evening in Orlando');
 assert.ok(data.orders.every(o=>Date.parse(o.createdAt)<Date.parse('2026-10-22T04:00:00Z')));
 const pending=data.preparations.filter(p=>p.status!=='completed');assert.equal(pending.length,9);
 for(const status of ['received','preparing','ready'])assert.equal(pending.filter(p=>p.status===status).length,3);
 assert.ok(pending.every(p=>Date.parse(p.updatedAt)<=now.getTime()),'Active kitchen samples are current, never future-dated');
 const completed=data.preparations.filter(p=>p.completedAt);
 const minutes=completed.map(p=>(Date.parse(p.completedAt)-Date.parse(data.orders.find(o=>o.id===p.orderId).createdAt))/60000);
 assert.ok(minutes.every(m=>m>=30&&m<=45));assert.ok(minutes.reduce((a,b)=>a+b,0)/minutes.length>=30);
 assert.deepEqual([...new Set(completed.map(p=>p.readyBy))].sort(),['demo.cozinha.kainan','demo.cozinha.davi','demo.cozinha.carla','demo.cozinha.elizabeth'].sort());
 assert.equal(data.sales.length,0);assert.ok(data.sql.every(s=>!s.includes('cash_sessions')));
 assert.throws(()=>demoDataset(rows,store.id,now,{days:1,throughDay:true}),/separate/);
 const db=new DatabaseSync(':memory:');
 try{
  for(const file of ['schema.sql','cloud-schema.sql','diagnostics-schema.sql','store-schema.sql'])db.exec(readFileSync('server/cloudflare/'+file,'utf8'));
  db.exec("INSERT INTO store_records VALUES('another-store','order:untouched','{}',1)");
  for(const sql of history.sql)db.exec(sql);
  const original=db.prepare('SELECT * FROM store_records ORDER BY store_id,key').all();
  for(const sql of data.sql)db.exec(sql);
  const after=db.prepare('SELECT COUNT(*) n FROM store_events').get().n;
  for(const sql of data.sql)db.exec(sql);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM store_events').get().n,after);
  for(const saved of original){const current=db.prepare('SELECT * FROM store_records WHERE store_id=? AND key=?').get(saved.store_id,saved.key);if(data.retiredKeys.includes(saved.key)){assert.equal(JSON.parse(current.data).status,'completed');assert.equal(db.prepare('SELECT data FROM demo_day_preparation_backup WHERE store_id=? AND key=?').get(saved.store_id,saved.key).data,saved.data)}else assert.deepEqual(current,saved)}
  assert.equal(db.prepare("SELECT COUNT(*) n FROM store_records WHERE store_id='seabra-1' AND key LIKE 'preparation:demo%' AND json_extract(data,'$.status')!='completed'").get().n,9);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM store_records WHERE key LIKE 'order:demo-day-v1-20261021-%'").get().n,data.orders.length);
  const prepare=(sql,args=[])=>({bind:(...values)=>prepare(sql,values),all:async()=>({results:db.prepare(sql).all(...args)})});
  const env={DB:{prepare,batch:async queries=>Promise.all(queries.map(q=>q.all()))}};
  const report=await productionReport(env,[rows[0].results[0]],{start:Date.parse('2026-10-21T04:00:00Z'),end:Date.parse('2026-10-22T04:00:00Z'),timeZone:'America/New_York'});
  assert.equal(report.summary.count,data.orders.length);assert.equal(report.tma.samples,data.orders.length-9);assert.ok(report.tma.seconds>=1800&&report.tma.seconds<=2700);
 }finally{db.close()}
});

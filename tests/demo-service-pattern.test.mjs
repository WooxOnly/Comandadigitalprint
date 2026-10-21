import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {demoDataset} from '../scripts/seed-demo-homologacao.mjs';
import {retimeDemoFlow,retimeDemoMorning} from '../scripts/retime-demo-flow.mjs';
import {demoHistoryCounts,demoEmission,demoInstant,demoWeekday} from '../shared/demo-service-pattern.mjs';
import {flowReport} from '../server/cloudflare/flow-report.mjs';

test('preserves demo IDs, exact stage durations, people and total while redistributing weekday/hour traffic through sync events',async()=>{
 const db=new DatabaseSync(':memory:');
 try{
  for(const file of ['schema.sql','cloud-schema.sql','diagnostics-schema.sql','store-schema.sql'])db.exec(readFileSync('server/cloudflare/'+file,'utf8'));
  const inventory=[{results:[{id:'seabra-1',active:1,cash:0,customers:0,preorders:1,preparation:1}]},{results:[{store_id:'seabra-1',data:readFileSync('server/menu.json','utf8')}]},{results:[]}];
  const history=demoDataset(inventory,'seabra-1',new Date('2026-10-20T18:00:00Z'));
  inventory[4]={results:history.preparations.filter(p=>p.status!=='completed').map(p=>({store_id:'seabra-1',key:'preparation:'+p.orderId,data:JSON.stringify(p),revision:history.events.findIndex(e=>e.key==='preparation:'+p.orderId)+1,created_at:history.orders.find(o=>o.id===p.orderId).createdAt}))};
  for(const sql of history.sql)db.exec(sql);
  const today=demoDataset(inventory,'seabra-1',new Date('2026-10-21T12:00:00Z'),{days:1,prefix:'demo-day-v1-20261021-',throughDay:true});
  for(const sql of today.sql)db.exec(sql);
  db.exec(`INSERT INTO store_records VALUES('seabra-1','order:manual','{}',1),('other','order:demo120-v1-keep','{}',1)`);
  const before=db.prepare('SELECT * FROM store_records').all(),old=new Map(before.map(r=>[r.store_id+':'+r.key,r]));
  const result=retimeDemoFlow(before,new Date('2026-10-21T12:00:00Z'));
  assert.equal(result.summary.orders,history.orders.length+today.orders.length);
  assert.equal(result.summary.today,today.orders.length);
  const means=result.summary.weekdays.map(v=>v.average);
  assert.ok(means[5]>means[6]&&means[6]>means[0]&&means[0]>means[4]&&means[4]>means[3]&&means[3]>means[2]&&means[2]>means[1]);
  for(const row of result.records){
   const prior=JSON.parse(old.get(row.store_id+':'+row.key).data),value=row.value;
   if(row.key.startsWith('order:')){
    assert.deepEqual({...value,createdAt:prior.createdAt,numberDay:prior.numberDay,dailyNumber:prior.dailyNumber},prior);
    assert.ok(Date.parse(value.createdAt)>=demoInstant(value.numberDay,420)&&Date.parse(value.createdAt)<demoInstant(value.numberDay,1320));
   }else{
    const priorOrder=JSON.parse(old.get(row.store_id+':order:'+value.orderId).data),order=result.records.find(r=>r.key==='order:'+value.orderId).value;
    for(const f of ['startedAt','readyAt','completedAt','updatedAt'])if(prior[f])assert.equal(Date.parse(value[f])-Date.parse(order.createdAt),Date.parse(prior[f])-Date.parse(priorOrder.createdAt));
    for(const f of ['status','startedBy','readyBy','completedBy'])assert.equal(value[f],prior[f]);
    assert.ok(Date.parse(value.updatedAt)<=demoInstant(order.numberDay,1320));
   }
  }
  for(const sql of result.sql)db.exec(sql);
  const events=db.prepare('SELECT COUNT(*) n FROM store_events').get().n;
  for(const sql of result.sql)db.exec(sql);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM store_events').get().n,events);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM store_records').get().n,before.length);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM demo_flow_backup').get().n,result.records.length);
  assert.equal(db.prepare("SELECT data FROM store_records WHERE key='order:manual'").get().data,'{}');
  assert.equal(db.prepare("SELECT data FROM store_records WHERE store_id='other'").get().data,'{}');
  const prepare=(sql,args=[])=>({bind:(...values)=>prepare(sql,values),all:async()=>({results:db.prepare(sql).all(...args)})});
  const report=await flowReport({DB:{prepare}},[{id:'seabra-1'}],'America/New_York',7,120,Date.parse('2026-10-21T12:00:00Z'));
  const actual=new Map(report.weekdays.buckets.map(b=>[b.key,b.average]));
  assert.ok(actual.get(5)>actual.get(6)&&actual.get(6)>actual.get(0)&&actual.get(0)>actual.get(4)&&actual.get(4)>actual.get(3)&&actual.get(3)>actual.get(2)&&actual.get(2)>actual.get(1));
  assert.ok(report.hours.buckets.filter(b=>b.key<7||b.key>=22).every(b=>b.total===0));
  const morningBefore=db.prepare('SELECT * FROM store_records').all(),morning=retimeDemoMorning(morningBefore,new Date('2026-10-21T14:20:00Z'));
  const previous=new Map(morningBefore.map(r=>[r.store_id+':'+r.key,r]));
  const changed=morning.records.filter(r=>JSON.stringify(r.value)!==previous.get(r.store_id+':'+r.key).data);
  assert.equal(changed.length,18);assert.equal(morning.summary.changedRecords,18);assert.equal(morning.summary.today,today.orders.length);
  for(const row of changed){const prior=JSON.parse(previous.get(row.store_id+':'+row.key).data);if(row.key.startsWith('order:')){assert.equal(row.value.numberDay,'2026-10-21');assert.equal(morning.records.find(r=>r.key==='preparation:'+row.value.id).value.status==='completed',false)}else{const beforeOrder=JSON.parse(previous.get('seabra-1:order:'+row.value.orderId).data),afterOrder=morning.records.find(r=>r.key==='order:'+row.value.orderId).value;for(const f of ['updatedAt','startedAt','readyAt'])if(prior[f])assert.equal(Date.parse(row.value[f])-Date.parse(afterOrder.createdAt),Date.parse(prior[f])-Date.parse(beforeOrder.createdAt))}}
  const morningHours=Array(24).fill(0);for(const row of morning.records.filter(r=>r.key.startsWith('order:')&&r.value.numberDay==='2026-10-21'))morningHours[Math.floor((Date.parse(row.value.createdAt)-demoInstant('2026-10-21',0))/3600000)]++;
  assert.ok(morningHours[8]>morningHours[7]);assert.ok(morningHours[9]>morningHours[7]);
  for(const sql of morning.sql)db.exec(sql);const morningEvents=db.prepare('SELECT COUNT(*) n FROM store_events').get().n;for(const sql of morning.sql)db.exec(sql);assert.equal(db.prepare('SELECT COUNT(*) n FROM store_events').get().n,morningEvents);assert.equal(retimeDemoMorning(db.prepare('SELECT * FROM store_records').all(),new Date('2026-10-21T14:20:00Z')).summary.changedRecords,0);
  // Stale snapshots must not overwrite later edits.
  const one=result.records[0];db.exec(`DELETE FROM store_events WHERE actor='demo.flow';UPDATE store_records SET revision=revision+1 WHERE key='${one.key}'`);
  const changedRevision=db.prepare('SELECT revision FROM store_records WHERE key=?').get(one.key).revision;
  for(const sql of result.sql)db.exec(sql);
  assert.equal(db.prepare('SELECT revision FROM store_records WHERE key=?').get(one.key).revision,changedRevision);
 }finally{db.close()}
});

test('Friday evening is strongest, normal mornings beat lunch, and infeasible totals fail safely',()=>{
 const hourly=day=>{const bins=Array(24).fill(0);for(let i=0;i<100;i++){const time=demoEmission(day,i,100,day+i);bins[Math.floor((time-demoInstant(day,0))/3600000)]++}return bins};
 const fri=hourly('2026-10-16'),normal=hourly('2026-10-14'),sum=(a,start,end)=>a.slice(start,end).reduce((a,b)=>a+b,0);
 assert.ok(sum(fri,17,21)>65);assert.ok(sum(fri,18,20)>48);assert.ok(sum(normal,7,10)>sum(normal,11,14)*4);assert.ok(sum(normal,16,22)>sum(normal,11,14)*4);
 assert.throws(()=>demoHistoryCounts(['2026-10-16'],50),/cannot fit/);
 assert.throws(()=>demoHistoryCounts(['2026-10-12'],1000),/cannot fit/);
 assert.equal(demoWeekday('2026-10-16'),5);
});

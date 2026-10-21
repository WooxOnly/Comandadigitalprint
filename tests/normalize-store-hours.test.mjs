import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {normalizeStoreHours,verifyStoreHours} from '../scripts/normalize-store-hours.mjs';
import {demoInstant,demoDay} from '../shared/demo-service-pattern.mjs';
const order=(id,time)=>({id,createdAt:time,plate:'1',customer:'Presentation',items:[{id:'i-'+id,name:'Coffee',category:'Drinks',quantity:1,note:''}]});
const record=(key,value,store_id='seabra-1')=>({store_id,key,data:JSON.stringify(value),revision:1});
const withPrep=(id,time)=>{const value=order(id,time),t=Date.parse(time),prep={orderId:id,status:'completed',startedAt:new Date(t+5*60000).toISOString(),startedBy:'demo.cozinha.kainan',readyAt:new Date(t+32*60000).toISOString(),readyBy:'demo.cozinha.carla',completedAt:new Date(t+37*60000).toISOString(),completedBy:'demo.cozinha.davi',updatedAt:new Date(t+37*60000).toISOString()};return[record('order:'+id,value),record('preparation:'+id,prep)]};
test('checks every age/prefix, corrects only outliers through guarded sync and preserves durations/metadata',()=>{
 const now=new Date('2026-10-21T14:30:00Z'),rows=[...withPrep('old-manual-2024','2024-01-03T05:15:00Z'),...withPrep('manual-dst','2026-03-08T10:30:00Z'),...withPrep('demo120-v1-late','2026-09-01T02:30:00Z'),...withPrep('already-correct','2026-08-01T13:00:00Z'),record('order:no-prep',order('no-prep','2026-07-01T07:00:00Z')),record('order:other-store',order('other-store','2026-07-01T04:00:00Z'),'other')];
 const plan=normalizeStoreHours(rows,now);assert.equal(plan.summary.checkedOrders,5);assert.equal(plan.summary.from,'2024-01-03');assert.equal(plan.summary.outsideBefore,4);assert.equal(plan.summary.changedOrders,4);assert.equal(plan.summary.changedRecords,7);
 for(const row of plan.records.filter(r=>r.key.startsWith('order:'))){const value=row.value,day=demoDay(value.createdAt);assert.ok(Date.parse(value.createdAt)>=demoInstant(day,420));assert.ok(Date.parse(value.createdAt)<demoInstant(day,1320))}
 const db=new DatabaseSync(':memory:');try{
  for(const file of ['schema.sql','cloud-schema.sql','diagnostics-schema.sql','store-schema.sql'])db.exec(readFileSync('server/cloudflare/'+file,'utf8'));
  const insert=db.prepare('INSERT INTO store_records VALUES(?,?,?,?)');for(const row of rows)insert.run(row.store_id,row.key,row.data,row.revision);
  for(const sql of plan.sql)db.exec(sql);const events=db.prepare('SELECT COUNT(*) n FROM store_events').get().n;for(const sql of plan.sql)db.exec(sql);assert.equal(db.prepare('SELECT COUNT(*) n FROM store_events').get().n,events);
  const result=verifyStoreHours(rows,db.prepare('SELECT * FROM store_records').all(),plan);assert.equal(result.checkedOrders,5);assert.equal(result.midnightOrders,0);assert.equal(result.outsideAfter,0);assert.equal(result.unchangedStageDurations,true);
  assert.equal(db.prepare("SELECT data FROM store_records WHERE store_id='other'").get().data,rows.at(-1).data);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM demo_hours_backup').get().n,7);
  assert.equal(normalizeStoreHours(db.prepare('SELECT * FROM store_records').all(),now).summary.changedRecords,0);
 }finally{db.close()}
});
test('all historical local dates, DST transitions, opening and closing boundaries are respected',()=>{
 for(const [day,utc]of[['2026-03-08','2026-03-08T11:00:00.000Z'],['2026-11-01','2026-11-01T12:00:00.000Z']])assert.equal(new Date(demoInstant(day,420)).toISOString(),utc);
 const day='2026-10-01',rows=[420,1319,1320,419].map((minute,i)=>record('order:b'+i,order('b'+i,new Date(demoInstant(day,minute)).toISOString()))),plan=normalizeStoreHours(rows,new Date('2026-10-21T14:30:00Z'));
 assert.equal(plan.summary.checkedOrders,4);assert.equal(plan.summary.changedOrders,2);assert.equal(plan.records[0].value.createdAt,JSON.parse(rows[0].data).createdAt);assert.equal(plan.records[1].value.createdAt,JSON.parse(rows[1].data).createdAt);
});
test('stale revisions cannot overwrite later edits',()=>{
 const rows=withPrep('guard','2026-10-01T04:15:00Z'),plan=normalizeStoreHours(rows,new Date('2026-10-21T14:30:00Z')),db=new DatabaseSync(':memory:');try{for(const file of ['schema.sql','cloud-schema.sql','diagnostics-schema.sql','store-schema.sql'])db.exec(readFileSync('server/cloudflare/'+file,'utf8'));for(const row of rows)db.prepare('INSERT INTO store_records VALUES(?,?,?,?)').run(row.store_id,row.key,row.data,2);for(const sql of plan.sql)db.exec(sql);assert.equal(db.prepare('SELECT COUNT(*) n FROM store_events').get().n,0);assert.throws(()=>verifyStoreHours(rows,db.prepare('SELECT * FROM store_records').all(),plan),/Guarded change/)}finally{db.close()}
});

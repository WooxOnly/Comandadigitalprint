// Explicit homologacao data maintenance. No date/prefix cutoff on inspected orders.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {demoDay,demoInstant,demoHash} from '../shared/demo-service-pattern.mjs';
import {validCloudValue} from '../shared/cloud-validation.mjs';
const storeId='seabra-1',batch='seabra-all-history-hours-v1',q=v=>"'"+String(v).replaceAll("'","''")+"'";
export function normalizeStoreHours(rows,now=new Date()){
 const source=rows.filter(r=>r.store_id===storeId&&/^(order|preparation):/.test(r.key));
 if(source.some(r=>!Number.isSafeInteger(r.revision)||r.revision<1))throw Error('Invalid snapshot revision');
 const byKey=new Map(source.map(r=>[r.key,r])),values=new Map(source.map(r=>[r.key,JSON.parse(r.data)]));
 if(byKey.size!==source.length)throw Error('Duplicate snapshot keys');
 const orders=source.filter(r=>r.key.startsWith('order:'));if(!orders.length)throw Error('No store orders');
 const today=demoDay(now),queue=orders.filter(r=>/^(order:demo120-v1-|order:demo-day-v1-)/.test(r.key)&&demoDay(values.get(r.key).createdAt)===today&&values.get('preparation:'+values.get(r.key).id)&&values.get('preparation:'+values.get(r.key).id).status!=='completed').sort((a,b)=>a.key.localeCompare(b.key));
 const slots=[490,500,510,520,530,545,555,565,575];
 if(queue.length&&queue.length!==9)throw Error('Expected nine active synthetic examples before morning redistribution');
 const sql=[`CREATE TABLE IF NOT EXISTS demo_hours_backup(batch TEXT,store_id TEXT,key TEXT,data TEXT,revision INTEGER,PRIMARY KEY(batch,store_id,key));`];
 let outsideBefore=0,changedOrders=0;const changedKeys=[],days=[];
 for(const row of orders){
  const order=values.get(row.key),original=Date.parse(order.createdAt);if(!Number.isFinite(original))throw Error('Order has invalid emission time: '+row.key);
  const day=demoDay(original),open=demoInstant(day,420),close=demoInstant(day,1320);days.push(day);
  let emitted=original;if(original<open||original>=close){outsideBefore++;emitted=demoInstant(day,480)+demoHash(row.key)%7200000}
  const position=queue.indexOf(row);if(position>=0)emitted=demoInstant(day,slots[position]);
  if(emitted===original)continue;
  changedOrders++;
  const next={...order,createdAt:new Date(emitted).toISOString()},prepRow=byKey.get('preparation:'+order.id),changes=[[row,next]];
  if(prepRow){const previous=values.get(prepRow.key),prep={...previous};for(const field of ['startedAt','readyAt','completedAt','updatedAt'])if(previous[field]){const old=Date.parse(previous[field]);if(!Number.isFinite(old))throw Error('Invalid preparation timestamp');prep[field]=new Date(old+emitted-original).toISOString()}
   if(position>=0&&Date.parse(prep.updatedAt)>now.getTime())throw Error('Current morning queue cannot be future-dated');
   changes.push([prepRow,prep]);
  }
  for(const [previous,value] of changes){
   if(!validCloudValue(previous.key,value))throw Error('Invalid adjusted record: '+previous.key);
   const guard=`store_id=${q(storeId)} AND key=${q(previous.key)} AND revision=${previous.revision} AND data=${q(previous.data)}`;
   sql.push(`INSERT OR IGNORE INTO demo_hours_backup SELECT ${q(batch)},store_id,key,data,revision FROM store_records WHERE ${guard};`);
   sql.push(`INSERT INTO store_events(store_id,mutation,key,data,actor,created_at) SELECT ${q(storeId)},${q(batch+':'+previous.key)},${q(previous.key)},${q(JSON.stringify(value))},'demo.hours',${q(now.toISOString())} WHERE EXISTS(SELECT 1 FROM store_records WHERE ${guard}) ON CONFLICT(store_id,mutation) DO NOTHING;`);
   values.set(previous.key,value);changedKeys.push(previous.key);
  }
 }
 days.sort();const records=source.map(row=>({store_id:row.store_id,key:row.key,value:values.get(row.key)}));
 return {sql,records,summary:{batch,storeId,timeZone:'America/New_York',checkedOrders:orders.length,from:days[0],to:days.at(-1),outsideBefore,changedOrders,changedRecords:changedKeys.length,changedKeys,noDateCutoff:true,noPrefixCutoff:true,preserveStageDurations:true}};
}
export function verifyStoreHours(before,after,plan){
 const key=r=>r.store_id+':'+r.key,old=new Map(before.map(r=>[key(r),r])),current=new Map(after.map(r=>[key(r),r]));
 assert.equal(before.length,after.length);let checked=0,changed=0;const hours=Array(24).fill(0),todayHours=Array(24).fill(0),today=demoDay(new Date());
 for(const expected of plan.records){
  const row=current.get(key(expected));assert.ok(row,'Missing store record');const value=JSON.parse(row.data),prior=JSON.parse(old.get(key(expected)).data);
  assert.deepEqual(value,expected.value,'Guarded change did not apply: '+row.key);if(row.data!==old.get(key(expected)).data)changed++;
  if(row.key.startsWith('order:')){
   const day=demoDay(value.createdAt),time=Date.parse(value.createdAt),open=demoInstant(day,420),close=demoInstant(day,1320);assert.ok(time>=open&&time<close,'Order outside business hours: '+row.key);assert.equal(day,demoDay(prior.createdAt));
   const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'}).format(time));hours[hour]++;if(day===today)todayHours[hour]++;checked++;
   assert.deepEqual({...value,createdAt:prior.createdAt},prior,'Only sale time may change');
  }else{
   const previousOrder=old.get(row.store_id+':order:'+value.orderId),newOrder=current.get(row.store_id+':order:'+value.orderId);if(!previousOrder||!newOrder){assert.deepEqual(value,prior);continue}
   const priorEmission=Date.parse(JSON.parse(previousOrder.data).createdAt),emission=Date.parse(JSON.parse(newOrder.data).createdAt),restored={...value};
   for(const field of ['startedAt','readyAt','completedAt','updatedAt'])if(prior[field]){assert.equal(Date.parse(value[field])-emission,Date.parse(prior[field])-priorEmission);restored[field]=prior[field]}
   assert.deepEqual(restored,prior,'Keep kitchen names, statuses and all other fields');
  }
 }
 assert.equal(checked,plan.summary.checkedOrders);assert.equal(changed,plan.summary.changedRecords);
 return {checkedOrders:checked,changedRecords:changed,from:plan.summary.from,to:plan.summary.to,outsideAfter:0,midnightOrders:hours[0],hours,todayHours,todayPeakHour:todayHours.indexOf(Math.max(...todayHours)),unchangedStageDurations:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [mode,input,output]=process.argv.slice(2);
 if(mode==='plan'){
  const snapshot=JSON.parse(fs.readFileSync(input));if(snapshot[1]?.results[0]?.cash!==0)throw Error('Only the cash-disabled homologacao store is authorized');
  const plan=normalizeStoreHours(snapshot[0].results);fs.mkdirSync(output,{recursive:true});
  for(let i=0;i<plan.sql.length;i+=500)fs.writeFileSync(path.join(output,'hours-'+String(i/500).padStart(3,'0')+'.sql'),plan.sql.slice(i,i+500).join('\n'));
  fs.writeFileSync(path.join(output,'plan.json'),JSON.stringify({records:plan.records,summary:plan.summary}));console.log('ALL_HISTORY_HOURS_PLAN='+JSON.stringify({...plan.summary,changedKeys:undefined}));
 }else if(mode==='verify'){
  const read=name=>JSON.parse(fs.readFileSync(path.join(input,name+'.json'))),result=verifyStoreHours(read('before')[0].results,read('after')[0].results,read('plan'));
  fs.writeFileSync(path.join(input,'verification.json'),JSON.stringify(result));console.log('ALL_HISTORY_HOURS_VERIFIED='+JSON.stringify(result));
 }else throw Error('Choose plan or verify');
}

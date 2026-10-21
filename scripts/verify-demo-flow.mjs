import fs from 'node:fs';
import assert from 'node:assert/strict';
import {demoInstant,demoWeekday} from '../shared/demo-service-pattern.mjs';
const dir=process.argv[2],read=name=>JSON.parse(fs.readFileSync(dir+'/'+name+'.json'));
const before=read('before')[0].results,after=read('after')[0].results,expected=read('expected-records');
const index=rows=>new Map(rows.map(r=>[r.key,r])),old=index(before),actual=index(after);
assert.equal(before.length,after.length);assert.equal(expected.length,after.length);
const daily=new Map(),week=Array.from({length:7},()=>({days:0,orders:0})),hours=Array(24).fill(0);
let completed=0,tma=0,active=0,friday=0,fridayEvening=0,fridayPeak=0;
for(const row of expected){
 const current=actual.get(row.key);assert.ok(current,'Missing retimed record');assert.deepEqual(JSON.parse(current.data),row.value,'Remote record differs from guarded plan: '+row.key);
 const prior=JSON.parse(old.get(row.key).data),value=row.value;
 if(row.key.startsWith('order:')){
  const hour=Math.floor((Date.parse(value.createdAt)-demoInstant(value.numberDay,0))/3600000);assert.ok(hour>=7&&hour<22);
  hours[hour]++;daily.set(value.numberDay,(daily.get(value.numberDay)||0)+1);
  if(demoWeekday(value.numberDay)===5){friday++;if(hour>=17&&hour<21)fridayEvening++;if(hour>=18&&hour<20)fridayPeak++}
 }else{
  const previousOrder=JSON.parse(old.get('order:'+value.orderId).data),order=JSON.parse(actual.get('order:'+value.orderId).data);
  for(const f of ['startedAt','readyAt','completedAt','updatedAt'])if(prior[f])assert.equal(Date.parse(value[f])-Date.parse(order.createdAt),Date.parse(prior[f])-Date.parse(previousOrder.createdAt));
  for(const f of ['status','startedBy','readyBy','completedBy'])assert.equal(value[f],prior[f]);
  assert.ok(Date.parse(value.updatedAt)<=demoInstant(order.numberDay,1320));
  if(value.completedAt){completed++;tma+=(Date.parse(value.completedAt)-Date.parse(order.createdAt))/60000}else active++;
 }
}
const summary=read('expected');
for(const [day,count] of daily){assert.ok(count>=30&&count<=100);if(day===summary.to)continue;const d=week[demoWeekday(day)];d.days++;d.orders+=count}
const averages=week.map(d=>d.orders/d.days);assert.ok(averages[5]>averages[6]&&averages[6]>averages[0]&&averages[0]>averages[4]&&averages[4]>averages[3]&&averages[3]>averages[2]&&averages[2]>averages[1]);
assert.ok(fridayEvening/friday>.65);assert.ok(fridayPeak/friday>.48);assert.equal(active,9);
const result={orders:expected.length/2,today:daily.get(summary.to),active,completed,tmaMinutes:tma/completed,unchangedStageDurations:true,weekdayAverage:averages,friday17to21Percent:100*fridayEvening/friday,friday18to20Percent:100*fridayPeak/friday,hours};
fs.writeFileSync(dir+'/verification.json',JSON.stringify(result));console.log('VERIFIED_DEMO_FLOW='+JSON.stringify(result));

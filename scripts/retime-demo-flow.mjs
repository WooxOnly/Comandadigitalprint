import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {demoDay,demoWeekday,demoInstant,demoHash,demoEmission,demoHistoryCounts} from '../shared/demo-service-pattern.mjs';
import {validCloudValue} from '../shared/cloud-validation.mjs';

const q=value=>"'"+String(value).replaceAll("'","''")+"'",batch='seabra-demo-service-v1';
const eligible=key=>/^(?:order|preparation):(?:demo120-v1-|demo-day-v1-)/.test(key);
export function retimeDemoFlow(rows,now=new Date()){
 const source=rows.filter(r=>r.store_id==='seabra-1'&&eligible(r.key));
 if(source.some(r=>!Number.isSafeInteger(r.revision)||r.revision<1))throw Error('Invalid snapshot revisions');
 const byKey=new Map(source.map(r=>[r.key,r])),today=demoDay(now);
 const orders=source.filter(r=>r.key.startsWith('order:')).map(row=>({row,value:JSON.parse(row.data)}));
 if(!orders.length)throw Error('No synthetic Seabra orders');
 const historical=orders.filter(o=>o.value.numberDay<today).sort((a,b)=>a.value.id.localeCompare(b.value.id));
 const current=orders.filter(o=>o.value.numberDay===today).sort((a,b)=>a.value.id.localeCompare(b.value.id));
 if(historical.length+current.length!==orders.length)throw Error('Unexpected day outside presentation history');
 const days=[...new Set(historical.map(o=>o.value.numberDay))].sort(),counts=demoHistoryCounts(days,historical.length),assigned=[];
 let offset=0;for(const day of days){const count=counts.get(day);historical.slice(offset,offset+count).forEach((o,index)=>assigned.push({...o,day,index,count}));offset+=count}
 if(offset!==historical.length)throw Error('History redistribution lost orders');
 current.forEach((o,index)=>assigned.push({...o,day:today,index,count:current.length}));
 const sql=[`CREATE TABLE IF NOT EXISTS demo_flow_backup(batch TEXT,store_id TEXT,key TEXT,data TEXT,revision INTEGER,PRIMARY KEY(batch,store_id,key));`,
 `INSERT OR IGNORE INTO demo_flow_backup SELECT ${q(batch)},store_id,key,data,revision FROM store_records WHERE store_id='seabra-1' AND (key GLOB 'order:demo120-v1-*' OR key GLOB 'preparation:demo120-v1-*' OR key GLOB 'order:demo-day-v1-*' OR key GLOB 'preparation:demo-day-v1-*');`];
 const records=[];
 for(const entry of assigned){
  const oldOrder=entry.value,prepRow=byKey.get('preparation:'+oldOrder.id);if(!prepRow)throw Error('Missing synthetic preparation');
  const oldPrep=JSON.parse(prepRow.data),active=oldPrep.status!=='completed';
  if(active&&entry.day!==today)throw Error('Previous demo queue must be completed before redistribution');
  const oldEmitted=Date.parse(oldOrder.createdAt),seed=demoHash(oldOrder.id);
  const emitted=active?Math.max(demoInstant(today,420),Math.min(demoInstant(today,1317),now.getTime()-(6+seed%25)*60000)):demoEmission(entry.day,entry.index,entry.count,oldOrder.id);
  const order={...oldOrder,createdAt:new Date(emitted).toISOString(),numberDay:entry.day,dailyNumber:entry.index+1};
  const prep={...oldPrep};
  for(const field of ['startedAt','readyAt','completedAt','updatedAt'])if(oldPrep[field])prep[field]=new Date(emitted+Date.parse(oldPrep[field])-oldEmitted).toISOString();
  if(Date.parse(prep.updatedAt)>demoInstant(entry.day,1320))throw Error('Preparation exceeds 22:00 closing');
  if(active&&Date.parse(prep.updatedAt)>now.getTime())throw Error('Active demo stage would be future-dated');
  for(const [row,value] of [[entry.row,order],[prepRow,prep]]){
   if(!validCloudValue(row.key,value))throw Error('Invalid retimed synthetic record');
   records.push({store_id:row.store_id,key:row.key,value});
   sql.push(`INSERT INTO store_events(store_id,mutation,key,data,actor,created_at) SELECT 'seabra-1',${q(batch+':'+row.key)},${q(row.key)},${q(JSON.stringify(value))},'demo.flow',${q(now.toISOString())} WHERE EXISTS(SELECT 1 FROM store_records WHERE store_id='seabra-1' AND key=${q(row.key)} AND revision=${row.revision} AND data=${q(row.data)}) ON CONFLICT(store_id,mutation) DO NOTHING;`);
  }
 }
 if(records.length!==source.length)throw Error('Unpaired synthetic records in snapshot');
 const totals=Array.from({length:7},()=>({days:0,orders:0}));for(const [day,count] of counts){totals[demoWeekday(day)].days++;totals[demoWeekday(day)].orders+=count}
 return {sql,records,summary:{batch,orders:orders.length,today:current.length,from:days[0],to:today,weekdays:totals.map((v,day)=>({day,...v,average:v.orders/v.days})),preserveTma:true}};
}
// Refresh only the nine current fictional queue examples. Completed history,
// report code, weekday counts and exact stage durations remain untouched.
export function retimeDemoMorning(rows,now=new Date()){
 const today=demoDay(now),source=rows.filter(r=>r.store_id==='seabra-1'&&eligible(r.key));
 const originals=new Map(source.map(r=>[r.key,r]));
 const records=source.map(r=>({store_id:r.store_id,key:r.key,value:JSON.parse(r.data)}));
 const values=new Map(records.map(r=>[r.key,r]));
 const active=records.filter(r=>r.key.startsWith('order:')&&r.value.numberDay===today&&values.get('preparation:'+r.value.id)?.value.status!=='completed').sort((a,b)=>a.key.localeCompare(b.key));
 if(active.length!==9)throw Error('Expected exactly nine current synthetic kitchen examples');
 const batch='seabra-demo-morning-v1',sql=[`CREATE TABLE IF NOT EXISTS demo_flow_backup(batch TEXT,store_id TEXT,key TEXT,data TEXT,revision INTEGER,PRIMARY KEY(batch,store_id,key));`];
 const minutes=[490,500,510,520,530,545,555,565,575];
 active.forEach((row,index)=>{
  const prep=values.get('preparation:'+row.value.id),oldTime=Date.parse(row.value.createdAt),time=demoInstant(today,minutes[index]);
  if(!prep)throw Error('Missing synthetic preparation');
  row.value={...row.value,createdAt:new Date(time).toISOString()};
  prep.value={...prep.value};
  for(const field of ['startedAt','readyAt','completedAt','updatedAt'])if(prep.value[field])prep.value[field]=new Date(time+Date.parse(prep.value[field])-oldTime).toISOString();
  if(Date.parse(prep.value.updatedAt)>now.getTime())throw Error('Morning queue update requires time after 09:37 local');
  for(const item of [row,prep]){
   const old=originals.get(item.key);if(!Number.isSafeInteger(old.revision)||old.revision<1||!validCloudValue(item.key,item.value))throw Error('Invalid guarded queue snapshot');
   const guard=`store_id='seabra-1' AND key=${q(item.key)} AND revision=${old.revision} AND data=${q(old.data)}`;
   sql.push(`INSERT OR IGNORE INTO demo_flow_backup SELECT ${q(batch)},store_id,key,data,revision FROM store_records WHERE ${guard};`);
   sql.push(`INSERT INTO store_events(store_id,mutation,key,data,actor,created_at) SELECT 'seabra-1',${q(batch+':'+item.key)},${q(item.key)},${q(JSON.stringify(item.value))},'demo.morning',${q(now.toISOString())} WHERE EXISTS(SELECT 1 FROM store_records WHERE ${guard}) ON CONFLICT(store_id,mutation) DO NOTHING;`);
  }
 });
 const orders=records.filter(r=>r.key.startsWith('order:')),days=new Map(),totals=Array.from({length:7},()=>({days:0,orders:0}));
 for(const row of orders)if(row.value.numberDay<today)days.set(row.value.numberDay,(days.get(row.value.numberDay)||0)+1);
 for(const [day,count] of days){totals[demoWeekday(day)].days++;totals[demoWeekday(day)].orders+=count}
 return {records,sql,summary:{batch,orders:orders.length,today:orders.filter(r=>r.value.numberDay===today).length,from:[...days.keys()].sort()[0],to:today,mode:'morning-queue',changedRecords:records.filter(r=>JSON.stringify(r.value)!==originals.get(r.key).data).length,weekdays:totals.map((v,day)=>({day,...v,average:v.orders/v.days})),preserveTma:true}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [input,output]=process.argv.slice(2),snapshot=JSON.parse(fs.readFileSync(input)),modules=snapshot[1].results[0];
 if(!modules||modules.cash!==0)throw Error('Retiming is confined to the cash-disabled Seabra demo');
 const result=(process.argv.includes('--morning-queue')?retimeDemoMorning:retimeDemoFlow)(snapshot[0].results);fs.mkdirSync(output,{recursive:true});
 for(let i=0;i<result.sql.length;i+=500)fs.writeFileSync(path.join(output,'flow-'+String(i/500).padStart(3,'0')+'.sql'),result.sql.slice(i,i+500).join('\n'));
 fs.writeFileSync(path.join(output,'expected-records.json'),JSON.stringify(result.records));
 fs.writeFileSync(path.join(output,'expected.json'),JSON.stringify(result.summary));console.log('DEMO_FLOW_PLAN='+JSON.stringify(result.summary));
}

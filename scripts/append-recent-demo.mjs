import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {demoDataset} from './seed-demo-homologacao.mjs';
import {demoDay,demoInstant} from '../shared/demo-service-pattern.mjs';
const q=v=>"'"+String(v).replaceAll("'","''")+"'";
export function recentDemo(inventory,storeId,now=new Date()){
 if(storeId!=='seabra-1'||!Array.isArray(inventory[5]?.results))throw Error('Expected inspected Seabra homologacao daily inventory');
 const today=demoDay(now),previous=inventory[5].results.filter(r=>r.demo_orders>0).map(r=>r.day).sort().at(-1);
 if(!previous||!/^\d{4}-\d{2}-\d{2}$/.test(previous)||previous>today)throw Error('Invalid latest demo date');
 const days=[];for(let d=Date.parse(previous+'T12:00:00Z')+86400000;d<=Date.parse(today+'T12:00:00Z');d+=86400000)days.push(new Date(d).toISOString().slice(0,10));
 if(days.length>31)throw Error('Recent presentation extension exceeds 31 days');
 const datasets=days.map((day,i)=>{const historical=day!==today,rows=structuredClone(inventory);if(i)rows[4]={results:[]};return demoDataset(rows,storeId,historical?new Date(demoInstant(day,720)):now,{days:1,prefix:'demo-day-v1-'+day.replaceAll('-','')+'-',throughDay:true,historical,activeQueue:!historical&&now.getTime()>=demoInstant(today,480)})});
 const summary={storeId,previous,from:days[0]||null,to:today,days:days.length,orders:datasets.reduce((n,d)=>n+d.orders.length,0),activePreparations:datasets.reduce((n,d)=>n+d.summary.activePreparations,0),retiredPreparations:datasets.reduce((n,d)=>n+d.retiredKeys.length,0),daily:datasets.map(d=>({day:d.days[0].day,orders:d.orders.length})),prefixes:datasets.map(d=>d.summary.prefix),wholeDayPresentation:true};
 return {sql:datasets.flatMap(d=>d.sql),orders:datasets.flatMap(d=>d.orders),preparations:datasets.flatMap(d=>d.preparations),summary};
}
export function verifyRecent(summary,rows){
 const orders=rows.filter(r=>r.key.startsWith('order:')),preps=rows.filter(r=>r.key.startsWith('preparation:')),byId=new Map(orders.map(r=>[JSON.parse(r.data).id,JSON.parse(r.data)]));
 if(orders.length!==summary.orders||preps.length!==summary.orders||preps.filter(r=>JSON.parse(r.data).status!=='completed').length!==summary.activePreparations)throw Error('Imported demo totals differ');
 const daily=new Map();let total=0,samples=0,min=Infinity,max=0;const cooks=new Set();
 for(const order of byId.values()){const date=demoDay(order.createdAt);if(date!==order.numberDay||Date.parse(order.createdAt)<demoInstant(date,420)||Date.parse(order.createdAt)>=demoInstant(date,1320))throw Error('Order outside store hours');daily.set(date,(daily.get(date)||0)+1)}
 for(const row of preps){const p=JSON.parse(row.data),o=byId.get(p.orderId);if(!o)throw Error('Missing order');if(p.status==='completed'){const duration=(Date.parse(p.completedAt)-Date.parse(o.createdAt))/60000;if(duration<30||duration>45||Date.parse(p.completedAt)>demoInstant(o.numberDay,1320))throw Error('Invalid demo preparation duration');total+=duration;min=Math.min(min,duration);max=Math.max(max,duration);samples++;cooks.add(p.readyBy)}}
 for(const d of summary.daily)if(daily.get(d.day)!==d.orders||d.orders<30||d.orders>100)throw Error('Daily volume differs');
 if(samples&&cooks.size!==4)throw Error('Missing kitchen operators');
 return {ok:true,...summary,timing:{samples,minMinutes:samples?min:null,maxMinutes:samples?max:null,tmaMinutes:samples?Math.round(total/samples*10)/10:null,cooks:cooks.size}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv[2]==='--verify'){const dir=process.argv[3],summary=JSON.parse(fs.readFileSync(path.join(dir,'summary.json'))),verification=JSON.parse(fs.readFileSync(path.join(dir,'verification.json'))),rows=verification[0].results;if(verification[1].results[0].active_old!==0)throw Error('Previous demo queue was not completed');console.log(JSON.stringify(verifyRecent(summary,rows)))}
 else{const [input,storeId,dir]=process.argv.slice(2),data=recentDemo(JSON.parse(fs.readFileSync(input)),storeId);fs.mkdirSync(dir,{recursive:true});for(let i=0;i<Math.max(1,data.sql.length);i+=1200)fs.writeFileSync(path.join(dir,'batch-'+String(i/1200).padStart(4,'0')+'.sql'),data.sql.slice(i,i+1200).join('\n')||'SELECT 1;');fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify(data.summary));const filter=data.summary.prefixes.map(p=>`key LIKE ${q('order:'+p+'%')} OR key LIKE ${q('preparation:'+p+'%')}`).join(' OR ')||'0';fs.writeFileSync(path.join(dir,'verify.sql'),`SELECT key,data FROM store_records WHERE store_id='seabra-1' AND (${filter}); SELECT COUNT(*) active_old FROM store_records p JOIN store_records o ON o.store_id=p.store_id AND o.key='order:'||substr(p.key,13) WHERE p.store_id='seabra-1' AND (p.key GLOB 'preparation:demo120-v1-*' OR p.key GLOB 'preparation:demo-day-v1-*') AND json_extract(p.data,'$.status') IN ('received','preparing','ready') AND json_extract(o.data,'$.numberDay')<${q(data.summary.to)};`);console.log(JSON.stringify(data.summary))}
}

// Explicit, additive demo import. No credentials, permissions or catalog writes.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { validCloudValue } from '../shared/cloud-validation.mjs';
import { calculateSale } from '../shared/cash-pricing.mjs';

export const DEMO_PREFIX='demo120-v1-';
const zone='America/New_York', minute=60000, dayMs=86400000;
const q=value=>"'"+String(value).replaceAll("'","''")+"'";
const id=(...parts)=>DEMO_PREFIX+parts.join('-');
const hash=value=>createHash('sha256').update(String(value)).digest().readUInt32BE(0);
const dateKey=date=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const iso=value=>new Date(value).toISOString();
function atLocal(day,hour,minutes=0){
  const local=Date.parse(day+'T00:00:00Z')+(hour*60+minutes)*minute;
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:zone,timeZoneName:'shortOffset'}).formatToParts(new Date(local)).map(p=>[p.type,p.value]));
  const offset=Number(parts.timeZoneName.replace('GMT',''));
  return local-offset*60*minute;
}
export function demoDataset(inventory,storeId,now=new Date()){
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(storeId))throw Error('Invalid demo store');
  const store=inventory[0].results.find(v=>v.id===storeId);
  if(!store?.active)throw Error('Active homologacao store not found');
  if(!store.preparation)throw Error('Select a store with Kitchen enabled; flags are never changed');
  const catalog=JSON.parse(inventory[1].results.find(v=>v.store_id===storeId)?.data||'[]');
  if(!catalog.length)throw Error('Store catalog is empty');
  const menu=catalog.filter(v=>v.id&&v.name&&v.category&&Number.isFinite(v.price)&&v.price>0);
  if(!menu.length)throw Error('Store needs priced catalog products for coherent demonstration');
  const settings=JSON.parse(inventory[2]?.results.find(v=>v.store_id===storeId)?.data||'{}');
  const taxRate=settings.tax?.enabled?settings.tax.rateBps:0;
  const today=dateKey(now),todayUtc=Date.parse(today+'T00:00:00Z'),events=[],sql=[],orders=[],preparations=[],sales=[],days=[];
  const event=(key,value)=>{
    if(!validCloudValue(key,value))throw Error('Invalid generated record '+key);
    events.push({key,value});
    // Trigger assigns a real increasing synchronization sequence. Never write records directly.
    sql.push(`INSERT INTO store_events(store_id,mutation,key,data,actor,created_at) SELECT ${q(storeId)},${q('seed-'+key)},${q(key)},${q(JSON.stringify(value))},'demo.import',${q(iso(now))} WHERE NOT EXISTS(SELECT 1 FROM store_records WHERE store_id=${q(storeId)} AND key=${q(key)}) ON CONFLICT(store_id,mutation) DO NOTHING;`);
  };
  const customers=Array.from({length:40},(_,n)=>({id:id('customer',n),name:'Demo '+['Ana','Bruno','Carla','Diego','Elisa','Felipe','Giovana','Hugo'][n%8]+' '+(n+1),phone:'',email:'cliente'+(n+1)+'@example.invalid',addresses:['Endereço fictício para demonstração '+(n+1)],notes:'Dados sintéticos de apresentação; nenhum contato real.',active:true,createdAt:iso(todayUtc-119*dayMs),updatedAt:iso(todayUtc-119*dayMs)}));
  if(store.customers)for(const customer of customers)event('customer:'+customer.id,customer);
  for(let d=119;d>=0;d--){
    const day=iso(todayUtc-d*dayMs).slice(0,10),daySeed=hash(day),count=30+daySeed%71,sessionId=id('session',day),cashier='demo.caixa.'+(d%3+1);let cashBalance=20000;
    const start=atLocal(day,9),end=d===0?Math.min(atLocal(day,22,30),now.getTime()-60*minute):atLocal(day,22,30);
    const first=Math.min(start,end-3*60*minute),last=end;
    const sessionOpen=Math.max(atLocal(day,0),first-30*minute),sessionClose=d===0?now.getTime():atLocal(day,23,45);
    if(store.cash)sql.push(`INSERT OR IGNORE INTO cash_sessions(store_id,id,device_id,opened_by,opened_at,opening_cents,closed_at,closed_by,counted_cents) VALUES(${q(storeId)},${q(sessionId)},'d364beef-0000-4000-8000-000000000120',${q(cashier)},${q(iso(sessionOpen))},20000,${q(iso(sessionClose))},${q(cashier)},0);`);
    for(let n=0;n<count;n++){
      const orderId=id('order',day,n+1),seed=hash(orderId),active=d===0&&n>=count-9,activeIndex=n-(count-9);
      // Lunch/evening peaks, distinct minutes and all instants in the past.
      const r=(seed%10000)/10000,fraction=r<0.4?0.18+r*0.55:r<0.85?0.58+(r-0.4)*0.65:(r-0.85)/0.15;
      const emitted=active?now.getTime()-(30-activeIndex*3)*minute:Math.round(first+fraction*(last-first));
      const serviceMode=seed%10<6?'dine_in':'takeout',customer=customers[seed%customers.length];
      const items=Array.from({length:1+seed%4},(_,j)=>{const p=menu[(hash(orderId+'item'+j)%100<55?(seed+j*3)%Math.min(menu.length,12):hash(orderId+j)%menu.length)];return {id:id('item',day,n,j),productId:p.id,name:p.name,category:p.category,quantity:1+hash(orderId+'qty'+j)%3,note:j===0&&seed%7===0?'Sem cebola — demonstração':'',unitPriceCents:Math.round(p.price*100)}});
      const order={id:orderId,createdAt:iso(emitted),numberDay:day,dailyNumber:n+1,tabletLabel:'DEMO',serviceMode,plate:serviceMode==='dine_in'?String(1+seed%10):seed%4===0?String(1+seed%10):'',customer:customer.name,items};
      const status=active?['received','preparing','ready'][Math.floor(activeIndex/3)]:'completed';
      const wait=1+seed%9,handoff=1+hash(orderId+'handoff')%8,target=30+hash(orderId+'prep')%16,prep=target-wait-handoff;
      const started=active?emitted+minute:emitted+wait*minute,ready=active?started+minute:started+prep*minute,completed=ready+handoff*minute;
      const preparation={orderId,status,updatedAt:iso(emitted)};
      if(status!=='received')Object.assign(preparation,{startedAt:iso(started),startedBy:'demo.cozinha.'+(seed%4+1),updatedAt:iso(started)});
      if(['ready','completed'].includes(status))Object.assign(preparation,{readyAt:iso(ready),readyBy:'demo.cozinha.'+(seed%4+1),updatedAt:iso(ready)});
      if(status==='completed')Object.assign(preparation,{completedAt:iso(completed),completedBy:cashier,updatedAt:iso(completed)});
      if(Date.parse(preparation.updatedAt)>now.getTime())throw Error('Future preparation generated');
      orders.push(order);preparations.push(preparation);event('order:'+order.id,order);event('preparation:'+order.id,preparation);
      if(store.cash&&status==='completed'){
        const saleId=id('sale',day,n),method=['cash','card','zelle'][seed%3];
        const discount=seed%11===0?{kind:'percent',value:500,reason:'Desconto demonstrativo'}:{kind:'amount',value:0,reason:''};
        const pricing=calculateSale(items,discount,taxRate,{tipCents:seed%5===0?200:0,deliveryFeeCents:0});
        const amount=pricing.totalCents,receipt={id:saleId,storeName:store.name,currency:'USD',createdAt:order.createdAt,customer:order.customer,...(store.customers?{customerId:customer.id}:{}),items,...pricing,discountKind:discount.kind,discountValue:discount.value,discountReason:discount.reason,...(discount.value?{authorizedBy:'demo.gerente'}:{}),method,operator:cashier,payments:[{method,amountCents:amount,tenderedCents:amount,changeCents:0}],tenderedCents:amount,changeCents:0};
        sales.push(receipt);
        sql.push(`INSERT OR IGNORE INTO cash_entries(store_id,id,session_id,kind,method,amount_cents,created_at,actor,note,order_id,data) VALUES(${q(storeId)},${q(saleId)},${q(sessionId)},'sale',${q(method)},${amount},${q(order.createdAt)},${q(cashier)},'Demonstração sintética',${q(order.id)},${q(JSON.stringify(receipt))});`);
        if(method==='cash')cashBalance+=amount;
        if(seed%97===0){sql.push(`INSERT OR IGNORE INTO cash_adjustments(store_id,id,sale_id,session_id,kind,method,amount_cents,created_at,actor,reason) VALUES(${q(storeId)},${q(id('refund',day,n))},${q(saleId)},${q(sessionId)},'refund',${q(method)},${amount},${q(iso(completed+minute))},'demo.gerente','Estorno demonstrativo');`);if(method==='cash')cashBalance-=amount;}
      }
    }
    if(store.cash)sql.push(`UPDATE cash_sessions SET counted_cents=${cashBalance} WHERE store_id=${q(storeId)} AND id=${q(sessionId)} AND device_id='d364beef-0000-4000-8000-000000000120';`);
    if(store.preorders)for(let n=0;n<2;n++){
      const customer=customers[(d+n)%customers.length],order=orders[orders.length-1-n];
      const preorder={id:id('preorder',day,n),customer:customer.name,...(store.customers?{customerId:customer.id}:{}),contact:customer.email,address:n===1?customer.addresses[0]:'',fulfillment:n===1?'delivery':'pickup',dueAt:iso(d===0?now.getTime()+(n+1)*dayMs:atLocal(day,17+n)),createdAt:iso(atLocal(day,8)),status:d===0?'scheduled':'completed',items:order.items};
      if(Date.parse(preorder.createdAt)>now.getTime())preorder.createdAt=iso(now);
      if(n===1)preorder.delivery={feeCents:500,driver:d===0?'':'demo.entrega',status:d===0?'pending':'delivered',...(d===0?{}:{dispatchedAt:preorder.dueAt,deliveredAt:iso(Date.parse(preorder.dueAt)+20*minute)})};
      event('preorder:'+preorder.id,preorder);
    }
    days.push({day,orders:count});
  }
  return {store,events,sql,orders,preparations,sales,days,summary:{storeId,storeName:store.name,from:days[0].day,to:today,days:120,orders:orders.length,sales:sales.length,customers:store.customers?40:0,preorders:store.preorders?240:0,activePreparations:9,operators:4,minDaily:Math.min(...days.map(d=>d.orders)),maxDaily:Math.max(...days.map(d=>d.orders)),prefix:DEMO_PREFIX}};
}
function verify(output){
  const expected=JSON.parse(fs.readFileSync(path.join(output,'summary.json'))),results=JSON.parse(fs.readFileSync(path.join(output,'verification.json'))).map(r=>r.results);
  const actual=results[0][0],days=results[1],stages=results[2],timing=results[3][0];
  if(actual.orders!==expected.orders||actual.preparations!==expected.orders||actual.sales!==expected.sales||days.length!==120||days.some(d=>d.orders<30||d.orders>100)||stages.reduce((s,r)=>s+(r.status==='completed'?0:r.count),0)!==9)throw Error('Remote demo totals do not match validated dataset');
  if(timing.samples!==expected.orders-9||timing.min_minutes>=timing.max_minutes||timing.cooks!==4||timing.sync_orders!==expected.orders)throw Error('Remote preparation times, operators or synchronization are inconsistent');
  console.log(JSON.stringify({ok:true,...expected,stages,timing,remote:actual}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(process.argv[2]==='--verify')verify(process.argv[3]);
  else{
    const [input,storeId,output]=process.argv.slice(2),data=demoDataset(JSON.parse(fs.readFileSync(input)),storeId);
    fs.mkdirSync(output,{recursive:true});
    for(let n=0;n<data.sql.length;n+=1200)fs.writeFileSync(path.join(output,'batch-'+String(n/1200).padStart(4,'0')+'.sql'),data.sql.slice(n,n+1200).join('\n'));
    fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify(data.summary,null,2));
    const filter=`store_id=${q(storeId)} AND key LIKE ${q('order:'+DEMO_PREFIX+'%')}`;
    fs.writeFileSync(path.join(output,'verify.sql'),`SELECT (SELECT COUNT(*) FROM store_records WHERE ${filter}) orders,(SELECT COUNT(*) FROM store_records WHERE store_id=${q(storeId)} AND key LIKE ${q('preparation:'+DEMO_PREFIX+'%')}) preparations,(SELECT COUNT(*) FROM cash_entries WHERE store_id=${q(storeId)} AND id LIKE ${q(DEMO_PREFIX+'sale-%')}) sales; SELECT json_extract(data,'$.numberDay') day,COUNT(*) orders FROM store_records WHERE ${filter} GROUP BY day ORDER BY day; SELECT json_extract(data,'$.status') status,COUNT(*) count FROM store_records WHERE store_id=${q(storeId)} AND key LIKE ${q('preparation:'+DEMO_PREFIX+'%')} GROUP BY status; SELECT COUNT(p.key) samples,ROUND(MIN((julianday(json_extract(p.data,'$.completedAt'))-julianday(json_extract(o.data,'$.createdAt')))*1440),1) min_minutes,ROUND(MAX((julianday(json_extract(p.data,'$.completedAt'))-julianday(json_extract(o.data,'$.createdAt')))*1440),1) max_minutes,ROUND(AVG((julianday(json_extract(p.data,'$.completedAt'))-julianday(json_extract(o.data,'$.createdAt')))*1440),1) tma_minutes,COUNT(DISTINCT json_extract(p.data,'$.readyBy')) cooks,(SELECT COUNT(*) FROM store_events WHERE store_id=${q(storeId)} AND key LIKE ${q('order:'+DEMO_PREFIX+'%')}) sync_orders FROM store_records o JOIN store_records p ON p.store_id=o.store_id AND p.key='preparation:'||substr(o.key,7) WHERE o.store_id=${q(storeId)} AND o.key LIKE ${q('order:'+DEMO_PREFIX+'%')} AND json_extract(p.data,'$.status')='completed';`);
    console.log(JSON.stringify(data.summary));
  }
}

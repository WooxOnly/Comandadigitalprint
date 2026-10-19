const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadTs}=require('./helpers/load-ts.cjs');
const {historyPreparation}=loadTs('src/services/historyPreparation.ts');
const created='2026-10-19T09:00:00Z', startedAt='2026-10-19T09:01:00Z', readyAt='2026-10-19T09:04:00Z', completedAt='2026-10-19T09:05:00Z';
test('waiting is a sent order with kitchen enabled, without fabricating preparation times',()=>{
 assert.equal(historyPreparation(created,undefined,false),null);
 assert.deepEqual(historyPreparation(created,undefined,true),{status:'received',label:'Aguardando',times:[{label:'Enviado à cozinha',at:created}]});
});
test('history follows all saved preparation states and stage times',()=>{
 for(const [index,status] of ['received','preparing','ready','completed'].entries()){
 const input={orderId:'1',status,updatedAt:completedAt,startedAt,readyAt,completedAt};const original=JSON.stringify(input);
 const summary=historyPreparation(created,input,true);
 assert.equal(summary.status,status);assert.equal(summary.times.length,index+1);assert.equal(JSON.stringify(input),original);
 assert.deepEqual(summary.times.map(t=>t.at),[created,startedAt,readyAt,completedAt].slice(0,index+1));
 }
});
test('auto completion retains ready time and completed status, independent of current module policy',()=>{
 const record={orderId:'1',status:'completed',updatedAt:readyAt,startedAt,readyAt,completedAt:readyAt};
 assert.deepEqual(historyPreparation(created,record,false).times.map(t=>t.at),[created,startedAt,readyAt,readyAt]);
 assert.equal(historyPreparation(created,{...record,status:'ready'},false).label,'Pronto');
});
test('legacy timestamps remain unknown; updatedAt is not a substitute for kitchen actions',()=>{
 const summary=historyPreparation(created,{orderId:'1',status:'completed',updatedAt:completedAt,readyAt:'invalid'},true);
 assert.deepEqual(summary.times.map(t=>t.at),[created,null,null,null]);
});
test('corrected stage hides future stage timestamps and follows local saved state',()=>{
 const record={orderId:'1',status:'preparing',updatedAt:completedAt,startedAt,readyAt,completedAt};
 assert.deepEqual(historyPreparation(created,record,true).times.map(t=>t.at),[created,startedAt]);
});

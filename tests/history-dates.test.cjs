const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadTs}=require('./helpers/load-ts.cjs');
const {historyDateRange,historyDateText,historyInRange}=loadTs('src/services/historyDates.ts');
test('today includes local midnight through the final millisecond, not the next day',()=>{
 const now=new Date(2026,9,19,14), range=historyDateRange('today',now);
 assert.equal(range.start,new Date(2026,9,19).getTime());assert.equal(range.end,new Date(2026,9,20).getTime());
 for(const [at,expected] of [[range.start-1,false],[range.start,true],[range.end-1,true],[range.end,false]])assert.equal(historyInRange(new Date(at).toISOString(),range),expected);
 assert.equal(historyInRange('invalid',range),false);
});
test('rolling calendar periods include today and correctly cross months and years',()=>{
 const now=new Date(2026,0,3,12);
 assert.equal(historyDateRange('last7',now).start,new Date(2025,11,28).getTime());
 assert.equal(historyDateRange('last30',now).start,new Date(2025,11,5).getTime());
 assert.deepEqual(historyDateRange('previousMonth',now),{start:new Date(2025,11,1).getTime(),end:new Date(2026,0,1).getTime()});
});
test('custom dates follow PT/ES day-first and EN month-first, accept keypad digits and include the end day',()=>{
 for(const language of ['pt','es','en']){const from=language==='en'?'02/28/2024':'28/02/2024',to=language==='en'?'02292024':'29022024';
 assert.deepEqual(historyDateRange('custom',new Date(),from,to,language),{start:new Date(2024,1,28).getTime(),end:new Date(2024,2,1).getTime()});
 assert.equal(historyDateText(new Date(2024,1,28),language),from);
 }
});
test('invalid or reversed custom dates fail without coercion or normalization',()=>{
 for(const [from,to] of [['31/02/2026','01/03/2026'],['29/02/2025','01/03/2025'],['20/10/2026','19/10/2026'],['','19/10/2026'],['1/2/2026','19/10/2026'],['aa19102026','19/10/2026']])assert.throws(()=>historyDateRange('custom',new Date(),from,to));
});
test('local calendar boundaries retain DST hours, without fixed 24-hour arithmetic',()=>{
 const old=process.env.TZ;try{process.env.TZ='America/New_York';
 const spring=historyDateRange('today',new Date(2026,2,8,12)),fall=historyDateRange('today',new Date(2026,10,1,12));
 assert.equal((spring.end-spring.start)/3600000,23);assert.equal((fall.end-fall.start)/3600000,25);
 }finally{if(old===undefined)delete process.env.TZ;else process.env.TZ=old;}
});

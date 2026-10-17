const {test}=require('node:test'),assert=require('node:assert/strict');
const {loadTs}=require('./helpers/load-ts.cjs');
const {scheduledDate,datePartsISO,usDateTime}=loadTs('src/services/scheduledDate.ts');
const {businessItemFromSelection}=loadTs('src/services/businessItemCustomization.ts');
const {createOrderItem}=loadTs('orderItems.ts');
test('scheduled date accepts single digits, enforces full year and real future local dates',()=>{
 assert.equal(datePartsISO({month:'2',day:'9',year:'2028'}),'2028-02-09');
 for(const value of [{month:'2',day:'29',year:'2027'},{month:'13',day:'1',year:'2027'},{month:'0',day:'1',year:'2027'},{month:'1',day:'1',year:'27'},{month:'1',day:'',year:'2027'}])assert.equal(datePartsISO(value),'');
 assert.equal(datePartsISO({month:'2',day:'29',year:'2028'}),'2028-02-29');
 const date={month:'2',day:'9',year:'2028'},now=new Date('2027-01-01').getTime();
 assert.equal(scheduledDate(date,{hour:'9',minute:'1'},now).getHours(),9);
 for(const time of [{hour:'24',minute:'1'},{hour:'9',minute:'60'},{hour:'',minute:'1'}])assert.throws(()=>scheduledDate(date,time,now));
 assert.throws(()=>scheduledDate(date,{hour:'9',minute:'1'},new Date('2029-01-01').getTime()));
 assert.match(usDateTime('2028-02-09T12:01:00'),/^02\/09\/2028/);
});
test('scheduled date rejects the missing local hour during daylight saving time',()=>{
 const original=process.env.TZ;try{process.env.TZ='America/New_York';assert.throws(()=>scheduledDate({month:'3',day:'14',year:'2027'},{hour:'2',minute:'30'},0));}finally{if(original===undefined)delete process.env.TZ;else process.env.TZ=original;}
});
test('scheduled order customization preserves both pizza flavors, extras and notes without modifying order selection',()=>{
 const first={id:'one',name:'Margherita',category:'Pizzas',kind:'pizza',price:12},second={...first,id:'two',name:'Bacon',price:15};
 const selected=createOrderItem(first,'Sem cebola','halves',second,[{name:'Cheese',placement:'second'}]);
 const item=businessItemFromSelection(selected,[first,second],true,'en');
 assert.equal(item.unitPriceCents,1500);assert.equal(item.id,selected.id);assert.match(item.note,/Sem cebola/);assert.match(item.note,/Margherita/);assert.match(item.note,/Bacon/);assert.match(item.note,/Cheese/);
 assert.equal(businessItemFromSelection(selected,[],false).unitPriceCents,undefined);assert.throws(()=>businessItemFromSelection(selected,[],true));assert.equal(selected.note,'Sem cebola');
});

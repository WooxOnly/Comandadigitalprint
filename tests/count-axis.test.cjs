const {test}=require('node:test'),assert=require('node:assert/strict');
const {countAxisScale,countAxisPosition}=require('../shared/count-axis.mjs');
test('hourly counts retain every explicitly requested band, extending safely above 1,000',()=>{
 for(const maximum of [0,1,9,10,11,50,100,501,1000])assert.deepEqual(countAxisScale(maximum),{ticks:[0,10,50,100,500,1000],ceiling:1000});
 assert.deepEqual(countAxisScale(1001).ticks,[0,10,50,100,500,1000,5000]);
 assert.equal(countAxisScale(1000001).ceiling,5000000);
});
test('banded interpolation preserves zero, exact ticks, ordering and values within each band',()=>{
 const {ticks}=countAxisScale(1000);ticks.forEach((value,index)=>assert.equal(countAxisPosition(value,ticks),index/5));
 assert.equal(countAxisPosition(5,ticks),.1);assert.equal(countAxisPosition(30,ticks),.3);assert.equal(countAxisPosition(750,ticks),.9);
 let previous=-1;for(let value=0;value<=1000;value++){const position=countAxisPosition(value,ticks);assert.ok(position>previous);previous=position}
});

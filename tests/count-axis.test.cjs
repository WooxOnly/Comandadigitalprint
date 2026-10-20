const {test}=require('node:test'),assert=require('node:assert/strict');
const {countAxisScale}=require('../shared/count-axis.mjs');
test('order count scale fits low and high demand with integer, evenly spaced ticks',()=>{
 for(const [maximum,expected] of [[0,10],[1,10],[9,10],[10,10],[11,50],[50,50],[51,100],[100,100],[101,500],[500,500],[501,1000],[1000,1000],[1001,5000],[5001,10000],[1000001,5000000]]){
  const {ceiling,step}=countAxisScale(maximum);assert.equal(ceiling,expected);assert.ok(ceiling>=maximum);assert.ok(Number.isInteger(step));assert.equal(step*5,ceiling);
 }
});

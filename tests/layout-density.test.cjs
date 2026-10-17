const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadTs}=require('./helpers/load-ts.cjs');
const {compactLandscapeStyle}=loadTs('src/ui/layoutDensity.ts');
test('landscape density reduces large headings and whitespace while preserving measured layouts and touch targets',()=>{
 const original={fontSize:29,lineHeight:36,padding:20,gap:16,borderRadius:20,minHeight:48,width:320,height:180,maxHeight:500,flexBasis:'45%',transform:[{translateX:12}],borderWidth:1};
 const compact=compactLandscapeStyle(original);
 assert.ok(compact.fontSize>=20&&compact.fontSize<original.fontSize);
 assert.ok(compact.lineHeight>compact.fontSize&&compact.lineHeight<original.lineHeight);
 assert.ok(compact.padding<original.padding&&compact.gap<original.gap);
 assert.ok(compact.minHeight>=44);
 for(const key of ['width','height','maxHeight','flexBasis','transform','borderWidth'])assert.deepEqual(compact[key],original[key]);
 assert.equal(original.padding,20,'Shared styles are never mutated');
});
test('compact mode retains small captions, zero/negative offsets, large content minima and 44-point controls',()=>{
 const original={fontSize:11,lineHeight:16,paddingTop:0,marginBottom:-8,minHeight:44,minWidth:44,height:'100%',color:'#FFFFFF'};
 const compact=compactLandscapeStyle(original);
 for(const key of ['fontSize','paddingTop','marginBottom','minHeight','minWidth','height','color'])assert.equal(compact[key],original[key]);
 assert.equal(compactLandscapeStyle({minHeight:150}).minHeight,150,'Scrollable panels retain their content minimum');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { cleanupPlan, placeholderIds } from '../scripts/cleanup-placeholder-products.mjs';
const products = () => [...placeholderIds].map(id=>({id,name:'Novo produto',category:'Lanches',price:0}));
test('cleanup targets only the identified unchanged products and preserves unrelated menu entries',()=>{
  const untouched={id:'real',name:'Novo produto',category:'Lanches',price:0};
  const plan=cleanupPlan({data:JSON.stringify([...products(),untouched]),revision:8});
  assert.equal(plan.removed,10);assert.deepEqual(JSON.parse(plan.expected),[untouched]);
  for(const change of [{price:1},{name:'Produto real'},{description:'Editado'}]) assert.throws(()=>cleanupPlan({data:JSON.stringify([{...products()[0],...change}]),revision:8}),/alterado/);
});
test('cleanup event keeps its backup, is idempotent and cannot change another store or any order',()=>{
  const db=new DatabaseSync(':memory:');try{
    for(const name of ['schema.sql','cloud-schema.sql','diagnostics-schema.sql','store-schema.sql'])db.exec(readFileSync('server/cloudflare/'+name,'utf8'));
    const original=JSON.stringify([...products(),{id:'real',name:'Real',category:'Lanches',price:12}]);
    db.prepare("INSERT INTO store_events(store_id,mutation,key,data,actor,created_at) VALUES(?,?,?,?,?,?)").run('seabra-1','seed','menu',original,'test','2026-10-27');
    db.prepare("INSERT INTO store_records(store_id,key,data,revision) VALUES('seabra-2','menu',?,9)").run(original);
    db.prepare("INSERT INTO store_records(store_id,key,data,revision) VALUES('seabra-1','order:existing','{}',10)").run();
    const row=db.prepare("SELECT data,revision FROM store_records WHERE store_id='seabra-1' AND key='menu'").get();
    const plan=cleanupPlan(row);db.exec(plan.sql);db.exec(plan.sql);
    assert.equal(db.prepare("SELECT data FROM menu_cleanup_backup").get().data,original);
    assert.equal(db.prepare("SELECT data FROM store_records WHERE store_id='seabra-1' AND key='menu'").get().data,plan.expected);
    assert.equal(db.prepare("SELECT data FROM store_records WHERE store_id='seabra-2' AND key='menu'").get().data,original);
    assert.equal(db.prepare("SELECT data FROM store_records WHERE key='order:existing'").get().data,'{}');
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM store_events WHERE mutation='cleanup-placeholder-products-20261022'").get().n,1);
  }finally{db.close();}
});
test('cleanup refuses to replace a menu edited after inspection',()=>{
  const db=new DatabaseSync(':memory:');try{
    for(const name of ['schema.sql','cloud-schema.sql','diagnostics-schema.sql','store-schema.sql'])db.exec(readFileSync('server/cloudflare/'+name,'utf8'));
    const data=JSON.stringify(products());db.prepare("INSERT INTO store_records VALUES('seabra-1','menu',?,5)").run(data);
    const plan=cleanupPlan({data,revision:5});db.prepare("UPDATE store_records SET revision=6 WHERE key='menu'").run();db.exec(plan.sql);
    assert.equal(db.prepare("SELECT data,revision FROM store_records WHERE key='menu'").get().revision,6);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM store_events').get().n,0);
  }finally{db.close();}
});

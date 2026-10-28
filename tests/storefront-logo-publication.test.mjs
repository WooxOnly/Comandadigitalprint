import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { logoPublicationPlan } from '../scripts/publish-storefront-logo.mjs';
const logo={data:JSON.stringify('data:image/png;base64,iVBORw0KGgo=')};
test('merchant logo publication preserves every other setting and backs up the guarded original',()=>{
  const db=new DatabaseSync(':memory:');try{
    db.exec('CREATE TABLE store_records(store_id TEXT,key TEXT,data TEXT);CREATE TABLE online_store_settings(store_id TEXT,data TEXT,revision INTEGER,updated_at TEXT);CREATE TABLE online_audit(store_id TEXT,client_id TEXT,actor TEXT,action TEXT,created_at TEXT);');
    const current={publishLogo:false,published:true,channel:'tablet',whatsapp:'',pickup:true,delivery:false},settings={data:JSON.stringify(current),revision:3};
    db.prepare("INSERT INTO store_records VALUES('seabra-1','logo',?)").run(logo.data);db.prepare("INSERT INTO online_store_settings VALUES('seabra-1',?,3,'old')").run(settings.data);
    const plan=logoPublicationPlan(logo,settings,'owner-client');db.exec(plan.sql);db.exec(plan.sql);
    const saved=db.prepare('SELECT data,revision FROM online_store_settings').get();assert.deepEqual(JSON.parse(saved.data),{...current,publishLogo:true});assert.equal(saved.revision,4);
    assert.equal(db.prepare('SELECT data FROM online_branding_backup').get().data,settings.data);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM online_audit').get().n,1);
    assert.equal(logoPublicationPlan(logo,saved,'owner-client').changed,false);
    assert.throws(()=>logoPublicationPlan({data:'null'},settings,'owner-client'));
  }finally{db.close();}
});
test('merchant logo publication refuses stale settings revisions',()=>{
  const db=new DatabaseSync(':memory:');try{
    db.exec('CREATE TABLE store_records(store_id TEXT,key TEXT,data TEXT);CREATE TABLE online_store_settings(store_id TEXT,data TEXT,revision INTEGER,updated_at TEXT);CREATE TABLE online_audit(store_id TEXT,client_id TEXT,actor TEXT,action TEXT,created_at TEXT);');
    const settings={data:JSON.stringify({publishLogo:false,channel:'tablet'}),revision:3};db.prepare("INSERT INTO store_records VALUES('seabra-1','logo',?)").run(logo.data);db.prepare("INSERT INTO online_store_settings VALUES('seabra-1',?,4,'new')").run(settings.data);
    db.exec(logoPublicationPlan(logo,settings,'owner-client').sql);assert.equal(db.prepare('SELECT revision FROM online_store_settings').get().revision,4);assert.equal(JSON.parse(db.prepare('SELECT data FROM online_store_settings').get().data).publishLogo,false);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM online_audit').get().n,0);
  }finally{db.close();}
});

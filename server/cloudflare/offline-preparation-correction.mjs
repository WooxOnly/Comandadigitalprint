import { appRole, canCorrectPreparation, roleScreen } from '../../shared/app-roles.mjs';
import { correctedPreparation, correctionMessage, isQuickPreparationUndo } from '../../shared/preparation-correction.mjs';
import { validPreparation } from '../../shared/operations-validation.mjs';
import { weeklyAdmin, GLOBAL_ADMIN_REVISION_BASE } from './admin-auth.mjs';
const fail=(status,code,current)=>{throw Object.assign(new Error(code),{status,...(current?{current}:{})});};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const validAdminProof=p=>Number.isSafeInteger(p.week)&&p.week>=0&&p.week<=Math.floor((Date.now()-Date.UTC(1970,0,5))/604800000)+1&&Number.isSafeInteger(p.revision)&&p.revision>=GLOBAL_ADMIN_REVISION_BASE&&p.revision<2*GLOBAL_ADMIN_REVISION_BASE;
export async function applyOfflinePreparationCorrection(env, actor, input) {
 const {challenge:c,proof:p}=input.offline||{};
 if(!c||!p||c.storeId!==actor.storeId||c.id!==input.id||c.orderId!==input.orderId||!Number.isSafeInteger(input.base)||input.base<0||!/^[a-zA-Z0-9-]{16,80}$/.test(input.id||'')||typeof c.deviceId!=='string'||!/^[a-z0-9._-]{3,24}$/.test(c.requestedBy||'')||!/^[a-z0-9._-]{3,24}$/.test(p.username||'')||!['undo','authorized'].includes(p.kind)||!/^[a-f0-9]{64}$/.test(p.signature||'')||!validPreparation(c.before)||!Number.isFinite(Date.parse(c.at))||Date.parse(c.at)>Date.now()+300000)fail(400,'INVALID_DATA');
 const key='preparation:'+c.orderId;
 let value;try{value=correctedPreparation(c,p,c.localBase);}catch{fail(400,'INVALID_DATA');}
 const prior=await env.DB.prepare('SELECT key,data,seq FROM store_events WHERE store_id=? AND mutation=?').bind(actor.storeId,input.id).first();
 if(prior){if(prior.key!==key||!same(JSON.parse(prior.data),value))fail(409,'INVALID_RETRY');return{record:{key,value:JSON.parse(prior.data),revision:prior.seq}};}
 const existing=await env.DB.prepare('SELECT data,revision FROM store_records WHERE store_id=? AND key=?').bind(actor.storeId,key).first();
 const current=existing?{key,value:JSON.parse(existing.data),revision:existing.revision}:null;
 if(!existing||existing.revision!==input.base||!same(current.value,c.before))fail(409,'CONFLICT',current);
 let credential,authorizationRevision=0,requesterRevision=0;
 if(p.username==='admin'){
  if(!validAdminProof(p))fail(403,'PREPARATION_AUTH_REQUIRED');
  credential=await weeklyAdmin(env.ADMIN_PASSWORD_SECRET,Date.UTC(1970,0,5)+(p.week+.5)*604800000,p.revision-GLOBAL_ADMIN_REVISION_BASE,actor.storeId);
 }else{
  const user=await env.DB.prepare('SELECT data,revision FROM store_records WHERE store_id=? AND key=?').bind(actor.storeId,'user:'+p.username).first();
  authorizationRevision=user?.revision||0;credential=user&&JSON.parse(user.data);if(!credential?.active)fail(409,'CONFLICT',current);
 }
 const login=credential?.login||credential;
 if(login?.salt!==p.salt)fail(409,'CONFLICT',current);
 const hmacKey=await crypto.subtle.importKey('raw',Uint8Array.from(login.hash.match(/../g).map(pair=>parseInt(pair,16))),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const signature=Uint8Array.from(p.signature.match(/../g).map(pair=>parseInt(pair,16)));
 if(!await crypto.subtle.verify('HMAC',hmacKey,signature,new TextEncoder().encode(correctionMessage(c))))fail(403,'PREPARATION_AUTH_REQUIRED');
 if(p.kind==='undo') {if(p.username!==c.requestedBy||!isQuickPreparationUndo(c))fail(403,'PREPARATION_AUTH_REQUIRED');}
 else if(!canCorrectPreparation(appRole(p.username,credential.role),credential.correctPreparation))fail(409,'CONFLICT',current);
 if(c.requestedBy!=='admin'){
  const user=await env.DB.prepare('SELECT data,revision FROM store_records WHERE store_id=? AND key=?').bind(actor.storeId,'user:'+c.requestedBy).first();const requester=user&&JSON.parse(user.data);
  requesterRevision=user?.revision||0;
  if(!requester?.active||!roleScreen(appRole(requester.username,requester.role),'preparation'))fail(409,'CONFLICT',current);
 }
 const requesterProof=p.requester;
 if(!requesterProof||requesterProof.username!==c.requestedBy||!/^[a-f0-9]{64}$/.test(requesterProof.signature||''))fail(403,'PREPARATION_AUTH_REQUIRED');
 let requesterLogin;
 if(c.requestedBy==='admin') {
  if(!validAdminProof(requesterProof))fail(403,'PREPARATION_AUTH_REQUIRED');
  requesterLogin=await weeklyAdmin(env.ADMIN_PASSWORD_SECRET,Date.UTC(1970,0,5)+(requesterProof.week+.5)*604800000,requesterProof.revision-GLOBAL_ADMIN_REVISION_BASE,actor.storeId);
 }else{
  const row=await env.DB.prepare('SELECT data FROM store_records WHERE store_id=? AND key=?').bind(actor.storeId,'user:'+c.requestedBy).first();requesterLogin=row&&JSON.parse(row.data).login;
 }
 if(requesterLogin?.salt!==requesterProof.salt)fail(409,'CONFLICT',current);
 const requesterKey=await crypto.subtle.importKey('raw',Uint8Array.from(requesterLogin.hash.match(/../g).map(pair=>parseInt(pair,16))),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('HMAC',requesterKey,Uint8Array.from(requesterProof.signature.match(/../g).map(pair=>parseInt(pair,16))),new TextEncoder().encode(correctionMessage(c))))fail(403,'PREPARATION_AUTH_REQUIRED');
 const result=await env.DB.prepare(`INSERT INTO store_events(store_id,mutation,key,data,actor,created_at)
 SELECT ?,?,?,?,?,? WHERE (SELECT revision FROM store_records WHERE store_id=? AND key=?)=? AND (?='admin' OR (SELECT revision FROM store_records WHERE store_id=? AND key=?)=?) AND (?='admin' OR (SELECT revision FROM store_records WHERE store_id=? AND key=?)=?) ON CONFLICT(store_id,mutation) DO NOTHING`).bind(actor.storeId,input.id,key,JSON.stringify(value),c.requestedBy,c.at,actor.storeId,key,input.base,p.username,actor.storeId,'user:'+p.username,authorizationRevision,c.requestedBy,actor.storeId,'user:'+c.requestedBy,requesterRevision).run();
 if(!result.meta.changes)fail(409,'CONFLICT',current);
 const saved=await env.DB.prepare('SELECT seq FROM store_events WHERE store_id=? AND mutation=?').bind(actor.storeId,input.id).first();return{record:{key,value,revision:saved.seq}};
}

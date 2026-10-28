import defaultMenu from '../menu.json' with { type: 'json' };
import { activeStore, DEFAULT_STORE_ID } from './stores.mjs';
import { licenseClient } from './licenses.mjs';
import { isValidMenu } from '../../shared/menu-validation.mjs';

export const onlineFail = (code, status = 400) => { throw Object.assign(Error(code), { status }); };
export const onlineJson = (value, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });
export const defaultOnlineSettings = () => ({ published: false, channel: 'tablet', whatsapp: '', timeZone: 'America/New_York',
 hours: Array.from({ length: 7 }, () => ({ closed: false, open: '07:00', close: '22:00' })),
 pickup: true, delivery: false, visualAlert: true, soundAlert: false, publishLogo: false });
const disabled = () => ({ enabled: false, scheduling: false, tables: false, revision: 0 });
export async function onlineConfig(env, id) {
 const store = await activeStore(env, id), clientId = await licenseClient(env, store.id);
 const entitlement = await env.DB.prepare('SELECT * FROM online_client_modules WHERE client_id = ?').bind(clientId).first();
 const preset = await env.DB.prepare('SELECT * FROM online_store_presets WHERE store_id = ?').bind(store.id).first();
 const settings = await env.DB.prepare('SELECT * FROM online_store_settings WHERE store_id = ?').bind(store.id).first();
 return { store, clientId, entitlements: entitlement ? { enabled: !!entitlement.enabled, scheduling: !!entitlement.scheduling, tables: !!entitlement.tables_enabled, revision: entitlement.revision } : disabled(),
 preset: { tableCount: preset?.table_count ?? 0, qrMode: preset?.qr_mode ?? 'per-table', revision: preset?.revision ?? 0 },
 settings: settings ? JSON.parse(settings.data) : defaultOnlineSettings(), revision: settings?.revision ?? 0 };
}
export async function onlineReadBody(request, limit = 32768) {
 if (!request.headers.get('Content-Type')?.startsWith('application/json')) onlineFail('INVALID_DATA', 415);
 const reader = request.body?.getReader(); if (!reader) onlineFail('INVALID_DATA');
 const parts = []; let size = 0;
 while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > limit) { await reader.cancel(); onlineFail('TOO_LARGE', 413); } parts.push(value); }
 const bytes = new Uint8Array(size); let at = 0; for (const part of parts) { bytes.set(part, at); at += part.length; }
 try { const value = JSON.parse(new TextDecoder().decode(bytes)); if (!value || typeof value !== 'object' || Array.isArray(value)) onlineFail('INVALID_DATA'); return value; } catch { onlineFail('INVALID_DATA'); }
}
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value,k));
export function validateOnlineSettings(value) {
 const keys = Object.keys(defaultOnlineSettings());
 if (!exactKeys(value, keys) || !['tablet','whatsapp'].includes(value.channel) || typeof value.whatsapp !== 'string' || value.whatsapp.length > 16 || value.whatsapp && !/^[1-9][0-9]{7,14}$/.test(value.whatsapp) || value.channel === 'whatsapp' && !value.whatsapp) onlineFail('INVALID_SETTINGS');
 for (const key of ['published','pickup','delivery','visualAlert','soundAlert','publishLogo']) if (typeof value[key] !== 'boolean') onlineFail('INVALID_SETTINGS');
 try { if (typeof value.timeZone !== 'string' || value.timeZone.length > 80) onlineFail('INVALID_SETTINGS'); new Intl.DateTimeFormat('en-US', { timeZone: value.timeZone }).format(); } catch { onlineFail('INVALID_SETTINGS'); }
 const time = v => typeof v === 'string' && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(v);
 if (!Array.isArray(value.hours) || value.hours.length !== 7 || !value.hours.every(h => exactKeys(h,['closed','open','close']) && typeof h.closed === 'boolean' && time(h.open) && time(h.close) && h.open < h.close)) onlineFail('INVALID_SETTINGS');
 return value;
}
export async function saveOnlineSettings(env, config, input, actor, now = Date.now()) {
 if (!exactKeys(input,['revision','settings']) || input.revision !== config.revision) onlineFail('SETTINGS_CHANGED',409);
 const value = validateOnlineSettings(input.settings);
 if (!config.entitlements.enabled) onlineFail('MODULE_DISABLED',403);
 const stamp = new Date(now).toISOString();
 try { await env.DB.batch([
 env.DB.prepare(`INSERT INTO online_audit(store_id,client_id,actor,action,created_at) SELECT ?,?,?,CASE WHEN COALESCE((SELECT revision FROM online_store_settings WHERE store_id=?),0)=? THEN 'settings' ELSE NULL END,?`).bind(config.store.id,config.clientId,actor,config.store.id,config.revision,stamp),
 env.DB.prepare(`INSERT INTO online_store_settings(store_id,data,revision,updated_at) VALUES(?,?,1,?) ON CONFLICT(store_id) DO UPDATE SET data=excluded.data,revision=revision+1,updated_at=excluded.updated_at WHERE online_store_settings.revision=?`).bind(config.store.id,JSON.stringify(value),stamp,config.revision)
 ]); } catch(error) { if(/constraint|NOT NULL/i.test(error.message)) onlineFail('SETTINGS_CHANGED',409); throw error; }
 return onlineConfig(env, config.store.id);
}
export function localOnlineTime(stamp, timeZone) {
 const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA',{ timeZone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23' }).formatToParts(new Date(stamp)).map(v=>[v.type,v.value]));
 const day = `${parts.year}-${parts.month}-${parts.day}`;
 return { day, time: `${parts.hour}:${parts.minute}`, weekday: new Date(day+'T12:00:00Z').getUTCDay() };
}
export function isOnlineOpen(settings, stamp) {
 const local = localOnlineTime(stamp,settings.timeZone), h=settings.hours[local.weekday];
 return !!h && !h.closed && local.time >= h.open && local.time < h.close;
}
// Parse the customer's wall clock in the STORE zone. Reject nonexistent or ambiguous DST times.
export function onlineScheduledTime(wall, timeZone, now) {
 if (typeof wall !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(wall)) onlineFail('INVALID_SCHEDULE');
 const guessed=Date.parse(wall+'Z'); if (!Number.isFinite(guessed)) onlineFail('INVALID_SCHEDULE');
 const offsets=new Set();
 for(const delta of [-86400000,0,86400000]){const stamp=guessed+delta,local=localOnlineTime(stamp,timeZone);offsets.add(Date.parse(local.day+'T'+local.time+'Z')-stamp)}
 const matches=[];
 for(const offset of offsets){const stamp=guessed-offset,local=localOnlineTime(stamp,timeZone);if(local.day+'T'+local.time===wall)matches.push(stamp)}
 if(matches.length!==1 || matches[0]<=now || matches[0]>now+366*86400000)onlineFail('INVALID_SCHEDULE');
 return matches[0];
}
export async function onlineMenu(env, id) {
 const row = await env.DB.prepare("SELECT data FROM store_records WHERE store_id=? AND key='menu'").bind(id).first();
 const legacy = !row && id===DEFAULT_STORE_ID ? await env.DB.prepare('SELECT data FROM menu WHERE id=1').first() : null;
 const menu=row?JSON.parse(row.data):legacy?JSON.parse(legacy.data):id===DEFAULT_STORE_ID?defaultMenu:[];
 if(!isValidMenu(menu))onlineFail('UNAVAILABLE',503);
 const { results }=await env.DB.prepare("SELECT key,data FROM store_records WHERE store_id=? AND key LIKE 'product-option:%'").bind(id).all();
 const unavailable=new Set(results.filter(r=>JSON.parse(r.data)?.available===false).map(r=>r.key.slice(15)));
 return menu.filter(p=>!unavailable.has(p.id));
}
export function onlineRequirePublished(config) {
 if(!config.entitlements.enabled || !config.settings.published)onlineFail('ONLINE_UNAVAILABLE',404);
}
export function onlineTable(config, tableContext) {
 if(!tableContext)return null;
 if(!config.entitlements.tables || config.settings.channel!=='tablet' || config.preset.tableCount<1)onlineFail('TABLE_UNAVAILABLE',403);
 const table=Number(tableContext);
 if(!Number.isInteger(table)||table<1||table>config.preset.tableCount)onlineFail('INVALID_TABLE');
 return String(table);
}
export async function onlineHash(text) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),v=>v.toString(16).padStart(2,'0')).join(''); }
export async function onlineSign(env, text) {
 if(!env.ADMIN_PASSWORD_SECRET || env.ADMIN_PASSWORD_SECRET.length<32)onlineFail('UNAVAILABLE',503);
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.ADMIN_PASSWORD_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('online-v1:'+text))),v=>v.toString(16).padStart(2,'0')).join('');
}
export async function onlineRate(request,env,now) {
 const key=await onlineHash((request.headers.get('CF-Connecting-IP')||'unknown')+':'+new Date(now).toISOString().slice(0,13));
 const row=await env.DB.prepare('INSERT INTO online_rate_limits(key,attempts,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN reset_at<=? THEN 1 ELSE attempts+1 END,reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END RETURNING attempts').bind(key,now+3600000,now,now).first();
 if(row.attempts>60)onlineFail('RATE_LIMIT',429);
 // Indexed cleanup; bounded retained hourly counters, no plaintext IPs.
 await env.DB.prepare('DELETE FROM online_rate_limits WHERE reset_at < ?').bind(now-86400000).run();
}
export async function buildOnlineRequest(env,config,input,now) {
 onlineRequirePublished(config);
 if(!/^[a-f0-9-]{36}$/.test(input.id||''))onlineFail('INVALID_DATA');
 if(typeof input.customer!=='string'||!input.customer.trim()||input.customer.length>100||typeof input.contact!=='string'||input.contact.length>40||!/^[+0-9(). -]+$/.test(input.contact)||input.contact.replace(/[^0-9]/g,'').length<7||input.contact.replace(/[^0-9]/g,'').length>15)onlineFail('INVALID_CONTACT');
 if(!['cash','credit','debit'].includes(input.paymentMethod))onlineFail('INVALID_PAYMENT');
 if(typeof input.notes!=='string'||input.notes.length>1000 || typeof input.address!=='string'||input.address.length>1000)onlineFail('INVALID_DATA');
 if(!['pickup','delivery','table'].includes(input.fulfillment))onlineFail('INVALID_DATA');
 if(input.fulfillment==='pickup'&&!config.settings.pickup || input.fulfillment==='delivery'&&!config.settings.delivery)onlineFail('FULFILLMENT_UNAVAILABLE');
 if(input.fulfillment==='delivery'&&!input.address.trim())onlineFail('INVALID_CONTACT');
 const table=input.fulfillment==='table'?onlineTable(config,input.table):null;
 if(input.fulfillment==='table'&&!table || input.fulfillment!=='table'&&input.table)onlineFail('INVALID_TABLE');
 if(input.fulfillment==='table'&&input.scheduledFor)onlineFail('INVALID_SCHEDULE');
 let due=null;
 if(input.scheduledFor){if(!config.entitlements.scheduling)onlineFail('SCHEDULING_DISABLED',403);due=onlineScheduledTime(input.scheduledFor,config.settings.timeZone,now)}
 if(!isOnlineOpen(config.settings,due||now))onlineFail(due?'INVALID_SCHEDULE':'STORE_CLOSED',409);
 if(!Array.isArray(input.items)||!input.items.length||input.items.length>50)onlineFail('INVALID_ITEMS');
 const menu=await onlineMenu(env,config.store.id), items=[];
 for(const item of input.items){
 const product=menu.find(p=>p.id===item.productId);
 if(!product)onlineFail('PRODUCT_UNAVAILABLE',409);
 if(!Number.isSafeInteger(item.quantity)||item.quantity<1||item.quantity>99||typeof item.note!=='string'||item.note.length>500)onlineFail('INVALID_ITEMS');
 let second=null;
 if(item.secondProductId){second=menu.find(p=>p.id===item.secondProductId);if(product.kind!=='pizza'||product.allowsExtras===false||!second||second.kind!=='pizza'||second.allowsExtras===false||second.id===product.id)onlineFail('INVALID_ITEMS')}
 // Public v1 supports whole/two-flavour pizzas and notes; extras cannot invent prices.
 if(item.extras?.length)onlineFail('INVALID_ITEMS');
 items.push({productId:product.id,name:product.name,category:product.category,quantity:item.quantity,note:item.note.trim(),unitPriceCents:Math.round(Math.max(product.price,second?.price||0)*100),...(second?{secondProductId:second.id,flavors:[product.name,second.name]}:{})});
 }
 const subtotalCents=items.reduce((n,i)=>n+i.unitPriceCents*i.quantity,0);
 if(!Number.isSafeInteger(subtotalCents)||subtotalCents>100000000)onlineFail('INVALID_ITEMS');
 if(input.quotedSubtotalCents!==subtotalCents)onlineFail('PRICE_CHANGED',409);
 return { id:input.id,paymentMethod:input.paymentMethod,customer:input.customer.trim(),contact:input.contact.trim(),address:input.fulfillment==='delivery'?input.address.trim():'',notes:input.notes.trim(),fulfillment:input.fulfillment,table,scheduledFor:due?new Date(due).toISOString():null,timeZone:config.settings.timeZone,items,subtotalCents,createdAt:new Date(now).toISOString() };
}
export async function onlineInbox(env,id) {
 const config=await onlineConfig(env,id);
 if(!config.entitlements.enabled||config.settings.channel!=='tablet')return{enabled:false,receiving:false,visualAlert:false,soundAlert:false,requests:[]};
 const {results}=await env.DB.prepare('SELECT data,status,updated_at,actor FROM online_requests WHERE store_id=? ORDER BY CASE status WHEN \'pending\' THEN 0 ELSE 1 END,created_at DESC LIMIT 100').bind(id).all();
 return { enabled:config.entitlements.enabled && config.settings.channel==='tablet', receiving:config.entitlements.enabled&&config.settings.published&&config.settings.channel==='tablet', visualAlert:config.settings.visualAlert,soundAlert:config.settings.soundAlert, requests:results.map(r=>({...JSON.parse(r.data),status:r.status,updatedAt:r.updated_at,actor:r.actor})) };
}
export async function onlineDecision(env,id,input,actor,now=Date.now()) {
 const config=await onlineConfig(env,id);if(!config.entitlements.enabled||config.settings.channel!=='tablet')onlineFail('MODULE_DISABLED',403);
 if(!/^[a-f0-9-]{36}$/.test(input.id||'')||!['accepted','declined'].includes(input.status))onlineFail('INVALID_DATA');
 const current=await env.DB.prepare('SELECT status FROM online_requests WHERE store_id=? AND id=?').bind(id,input.id).first();
 if(!current)onlineFail('REQUEST_NOT_FOUND',404);
 if(current.status===input.status)return {ok:true};
 if(current.status!=='pending')onlineFail('REQUEST_CHANGED',409);
 const clientId=await licenseClient(env,id),stamp=new Date(now).toISOString();
 let result;
 try { result=await env.DB.batch([
 env.DB.prepare(`INSERT INTO online_audit(store_id,client_id,actor,action,created_at) SELECT ?,?,?,CASE WHEN EXISTS(SELECT 1 FROM online_requests WHERE store_id=? AND id=? AND status='pending') THEN ? ELSE NULL END,?`).bind(id,clientId,actor,id,input.id,'request:'+input.id+':'+input.status,stamp),
 env.DB.prepare("UPDATE online_requests SET status=?,actor=?,updated_at=? WHERE store_id=? AND id=? AND status='pending'").bind(input.status,actor,stamp,id,input.id)
 ]); } catch(error) { if(/constraint|NOT NULL/i.test(error.message))onlineFail('REQUEST_CHANGED',409);throw error; }
 if(!result[1].meta?.changes)onlineFail('REQUEST_CHANGED',409);
 return {ok:true};
}

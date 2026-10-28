import { onlineConfig, onlineReadBody, onlineFail, onlineJson, onlineSign, onlineHash, onlineRate, onlineRequirePublished, buildOnlineRequest, saveOnlineSettings, onlineMenu } from './online-orders.mjs';
import { onlineSettingsPage, onlinePublicPage, onlineStoresPage, onlinePhotosPage } from './online-pages.mjs';
import { html, cookie, readCookie, equal } from './manager-auth.mjs';
import { translate, requestLanguage } from './manager-i18n.mjs';
import { managerLogo } from './manager-brand.mjs';
import { requireStoreLicense } from './licenses.mjs';
const CSRF='__Host-bistro_online_csrf';
export const ONLINE_ERRORS={
 INVALID_PAYMENT:'Escolha dinheiro, cartão de crédito ou cartão de débito.',INVALID_PHOTO:'Escolha uma foto JPEG ou PNG de até 120 KB.',INVALID_DATA:'Confira os dados do pedido.',INVALID_SETTINGS:'Confira o canal, telefone, fuso e horários.',TOO_LARGE:'Pedido acima do limite permitido.',
 SETTINGS_CHANGED:'Configuração alterada em outra sessão. Atualize a página.',MODULE_DISABLED:'Módulo de pedidos online desabilitado.',
 ONLINE_UNAVAILABLE:'Cardápio online indisponível.',TABLE_UNAVAILABLE:'Pedido na mesa indisponível para esta loja.',INVALID_TABLE:'Escolha uma mesa válida.',
 INVALID_CONTACT:'Informe nome, contato e endereço quando necessário.',INVALID_SCHEDULE:'Escolha uma data e hora futura válida no horário da loja.',
 SCHEDULING_DISABLED:'Agendamento indisponível para esta loja.',STORE_CLOSED:'A loja está fechada para pedidos para agora.',
 FULFILLMENT_UNAVAILABLE:'Modalidade de atendimento indisponível.',INVALID_ITEMS:'Confira os itens e as quantidades.',PRODUCT_UNAVAILABLE:'Um produto ficou indisponível. Atualize o cardápio.',
 PRICE_CHANGED:'Os preços mudaram. Atualize o cardápio e confira o total.',RATE_LIMIT:'Muitas solicitações. Tente novamente mais tarde.',
 REQUEST_NOT_FOUND:'Pedido online não encontrado.',REQUEST_CHANGED:'Este pedido já foi atualizado. Atualize a lista.',INVALID_RETRY:'Este envio já foi registrado com outros dados.',
 ACCESS_DENIED:'Acesso não permitido.',CSRF_EXPIRED:'A página expirou. Atualize antes de enviar.',UNAVAILABLE:'Pedidos online temporariamente indisponíveis.',
 LICENSE_BLOCKED:'O atendimento online desta loja está indisponível.',LICENSE_EXPIRED:'O atendimento online desta loja está indisponível.'
};
function errorReply(error,language){const code=Object.hasOwn(ONLINE_ERRORS,error.message)?error.message:'UNAVAILABLE';return onlineJson({error:translate(language,ONLINE_ERRORS[code]),code},error.status||503)}
const safeMethod=(request,origin)=>{if(request.method!=='POST')onlineFail('INVALID_DATA',405);if(request.headers.get('Origin')!==origin)onlineFail('ACCESS_DENIED',403)};
async function availableLicense(env,config,now){
 // Public browsing never initializes or renews subscriptions.
 if(!config.clientId.startsWith('store:')){const client=await env.DB.prepare('SELECT active FROM manager_clients WHERE id=?').bind(config.clientId).first();if(client?.active!==1)onlineFail('ONLINE_UNAVAILABLE',404)}
 const license=await env.DB.prepare('SELECT status,expires_at FROM client_licenses WHERE client_id=?').bind(config.clientId).first();
 if(!license||license.status!=='active'||license.expires_at<=now)onlineFail('ONLINE_UNAVAILABLE',404);
}
export async function onlineAdminResponse(request,env,{browserLogin,sameOrigin,language,now=Date.now()}){
 const url=new URL(request.url);if(!['/admin/online','/admin/api/online','/admin/online/qr'].includes(url.pathname))return null;
 if(!browserLogin)return url.pathname==='/admin/online'?new Response(null,{status:303,headers:{Location:'/admin','Cache-Control':'no-store'}}):onlineJson({error:translate(language,'Acesso não autorizado.')},401);
 try{
 const config=await onlineConfig(env,url.searchParams.get('storeId'));
 if(url.pathname==='/admin/online'&&request.method==='GET'){const nonce=crypto.randomUUID();return html(onlineSettingsPage(nonce,config,language,true),nonce)}
 if(url.pathname==='/admin/online/qr'&&request.method==='GET')return await onlineQrResponse(url,env,config,language);
 if(url.pathname!=='/admin/api/online')onlineFail('INVALID_DATA',405);
 if(request.method==='GET')return onlineJson(config);
 safeMethod(request,url.origin);if(!sameOrigin)onlineFail('ACCESS_DENIED',403);
 const input=await onlineReadBody(request);
 if(Object.keys(input).sort().join(',')!=='entitlements,preset'||!input.entitlements||!input.preset)onlineFail('INVALID_DATA');
 const ent=input.entitlements,preset=input.preset;
 if(Object.keys(ent).sort().join(',')!=='enabled,revision,scheduling,tables'||Object.keys(preset).sort().join(',')!=='qrMode,revision,tableCount')onlineFail('INVALID_DATA');
 if(ent.revision!==config.entitlements.revision||preset.revision!==config.preset.revision)onlineFail('SETTINGS_CHANGED',409);
 if(['enabled','scheduling','tables'].some(k=>typeof ent[k]!=='boolean')||!Number.isInteger(preset.tableCount)||preset.tableCount<0||preset.tableCount>999||!['per-table','generic'].includes(preset.qrMode)||ent.tables&&preset.tableCount<1)onlineFail('INVALID_SETTINGS');
 const stamp=new Date(now).toISOString();
 // Batch is transactional. Guard both records and audit via revision checking inside SQL.
 let results;try{results=await env.DB.batch([
 env.DB.prepare(`INSERT INTO online_audit(store_id,client_id,actor,action,created_at) SELECT ?,?,?,CASE WHEN COALESCE((SELECT revision FROM online_client_modules WHERE client_id=?),0)=? AND COALESCE((SELECT revision FROM online_store_presets WHERE store_id=?),0)=? THEN 'admin-preset' ELSE NULL END,?`).bind(config.store.id,config.clientId,browserLogin.username||'owner',config.clientId,ent.revision,config.store.id,preset.revision,stamp),
 env.DB.prepare(`INSERT INTO online_client_modules(client_id,enabled,scheduling,tables_enabled,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(client_id) DO UPDATE SET enabled=excluded.enabled,scheduling=excluded.scheduling,tables_enabled=excluded.tables_enabled,updated_at=excluded.updated_at,revision=revision+1 WHERE online_client_modules.revision=?`).bind(config.clientId,+ent.enabled,+ent.scheduling,+ent.tables,stamp,ent.revision),
 env.DB.prepare(`INSERT INTO online_store_presets(store_id,table_count,qr_mode,updated_at) VALUES(?,?,?,?) ON CONFLICT(store_id) DO UPDATE SET table_count=excluded.table_count,qr_mode=excluded.qr_mode,updated_at=excluded.updated_at,revision=revision+1 WHERE online_store_presets.revision=?`).bind(config.store.id,preset.tableCount,preset.qrMode,stamp,preset.revision),
 ]);}catch(error){if(/constraint|NOT NULL/i.test(error.message))onlineFail('SETTINGS_CHANGED',409);throw error}
 if(results.slice(1).some(r=>!r.meta?.changes))onlineFail('SETTINGS_CHANGED',409);
 return onlineJson(await onlineConfig(env,config.store.id));
 }catch(error){return errorReply(error,language)}
}
export async function onlineManagerResponse(request,env,session,language,now=Date.now()){
 const url=new URL(request.url);if(!['/gestor/online/lojas','/gestor/online','/gestor/api/online','/gestor/api/online/photos','/gestor/api/online/details'].includes(url.pathname))return null;
 try{
 if(url.pathname==='/gestor/online/lojas'&&request.method==='GET'){const {results}=await env.DB.prepare('SELECT id,name FROM stores WHERE active=1 AND id IN (SELECT value FROM json_each(?)) ORDER BY name').bind(session.client.store_ids).all();const nonce=crypto.randomUUID();return html(onlineStoresPage(nonce,results,language),nonce)}
 const id=url.searchParams.get('storeId');if(!JSON.parse(session.client.store_ids).includes(id))onlineFail('ACCESS_DENIED',403);
 const config=await onlineConfig(env,id);if(config.clientId!==session.client.id)onlineFail('ACCESS_DENIED',403);
 if(url.pathname==='/gestor/online'&&request.method==='GET'&&url.searchParams.get('view')==='photos'){const nonce=crypto.randomUUID(),menu=await onlineMenu(env,id),{results}=await env.DB.prepare('SELECT product_id FROM online_product_photos WHERE store_id=?').bind(id).all();const response=html(onlinePhotosPage(nonce,config,language,menu,results.map(r=>r.product_id)),nonce);response.headers.set('Content-Security-Policy',response.headers.get('Content-Security-Policy').replace("img-src 'self'","img-src 'self' data:"));return response}
 if(url.pathname==='/gestor/online'&&request.method==='GET'){const nonce=crypto.randomUUID();return html(onlineSettingsPage(nonce,config,language,false),nonce)}
 if(url.pathname==='/gestor/api/online'&&request.method==='GET')return onlineJson(config);
 await requireStoreLicense(env,id,now);

 safeMethod(request,url.origin);
 const input=await onlineReadBody(request,url.pathname==='/gestor/api/online/photos'?180000:32768);
 if(url.pathname==='/gestor/api/online/details'){
 if(!config.entitlements.enabled)onlineFail('MODULE_DISABLED',403);
 if(Object.keys(input).sort().join(',')!=='description,productId'||typeof input.description!=='string'||input.description.length>2000)onlineFail('INVALID_DATA');
 const menu=await onlineMenu(env,id);if(!menu.some(p=>p.id===input.productId))onlineFail('PRODUCT_UNAVAILABLE',404);
 await env.DB.prepare('INSERT INTO online_product_details(store_id,product_id,description,updated_at) VALUES(?,?,?,?) ON CONFLICT(store_id,product_id) DO UPDATE SET description=excluded.description,updated_at=excluded.updated_at').bind(id,input.productId,input.description.trim(),new Date(now).toISOString()).run();
 return onlineJson({ok:true});
 }
 if(url.pathname==='/gestor/api/online/photos'){
 if(!config.entitlements.enabled)onlineFail('MODULE_DISABLED',403);
 const menu=await onlineMenu(env,id);if(!menu.some(p=>p.id===input.productId))onlineFail('PRODUCT_UNAVAILABLE',404);
 if(input.image!==null){if(typeof input.image!=='string'||!/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+=*$/.test(input.image)||input.image.length>164000)onlineFail('INVALID_PHOTO');let bytes;try{bytes=atob(input.image.split(',')[1])}catch{onlineFail('INVALID_PHOTO')}if(bytes.length>122880||!(bytes.startsWith('\xff\xd8\xff')||bytes.startsWith('\x89PNG\r\n\x1a\n')))onlineFail('INVALID_PHOTO');await env.DB.prepare('INSERT INTO online_product_photos(store_id,product_id,image,updated_at) VALUES(?,?,?,?) ON CONFLICT(store_id,product_id) DO UPDATE SET image=excluded.image,updated_at=excluded.updated_at').bind(id,input.productId,input.image,new Date(now).toISOString()).run()}
 else await env.DB.prepare('DELETE FROM online_product_photos WHERE store_id=? AND product_id=?').bind(id,input.productId).run();
 return onlineJson({ok:true});
 }
 if(url.pathname==='/gestor/api/online')return onlineJson(await saveOnlineSettings(env,config,input,'manager:'+session.user.id,now));

 onlineFail('INVALID_DATA',405);
 }catch(error){return errorReply(error,language)}
}
async function checkTableContext(url,config,env){
 const mode=url.searchParams.get('dine');
 if(!mode)return null;
 if(!config.entitlements.tables||config.settings.channel!=='tablet'||config.preset.tableCount<1)onlineFail('TABLE_UNAVAILABLE',403);
 const table=url.searchParams.get('table')||'';
 if(mode!=='1'||config.preset.qrMode==='per-table'&&(!/^\d{1,3}$/.test(table)||Number(table)<1||Number(table)>config.preset.tableCount)||config.preset.qrMode==='generic'&&table)onlineFail('INVALID_TABLE');
 if(!equal(url.searchParams.get('qr'),await onlineSign(env,'table:'+config.store.id+':'+config.preset.qrMode+':'+table)))onlineFail('TABLE_UNAVAILABLE',403);
 return {mode:config.preset.qrMode,table};
}
export async function onlinePublicResponse(request,env,now=Date.now()){
 const url=new URL(request.url),match=url.pathname.match(/^\/pedir\/([a-z0-9-]+)(?:\/(submit|status|logo|photo))?$/);
 if(!match)return null;
 const language=requestLanguage(request,readCookie),nonce=crypto.randomUUID();
 try{
 const config=await onlineConfig(env,match[1]);onlineRequirePublished(config);await availableLicense(env,config,now);
 const context=await checkTableContext(url,config,env);
 if(request.method==='GET'&&match[2]==='photo'){const productId=url.searchParams.get('id'),menu=await onlineMenu(env,config.store.id);if(!menu.some(p=>p.id===productId))onlineFail('PRODUCT_UNAVAILABLE',404);const photo=await env.DB.prepare('SELECT image FROM online_product_photos WHERE store_id=? AND product_id=?').bind(config.store.id,productId).first();if(!photo)return new Response(null,{status:404});const [prefix,encoded]=photo.image.split(',');return new Response(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),{headers:{'Content-Type':prefix.slice(5,-7),'Cache-Control':'private, max-age=60','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'}})}
 if(request.method==='GET'&&!match[2]){
 const csrf=crypto.randomUUID()+'.'+Math.floor(now/3600000);const signed=csrf+'.'+await onlineSign(env,'csrf:'+csrf);
 const {results:photos}=await env.DB.prepare('SELECT product_id FROM online_product_photos WHERE store_id=?').bind(config.store.id).all();
 const response=html(onlinePublicPage(nonce,config,language,signed,context,await onlineMenu(env,config.store.id),photos.map(p=>p.product_id)),nonce,200,{'Referrer-Policy':'no-referrer'});response.headers.append('Set-Cookie',cookie(CSRF,signed,7200));return response;
 }
 if(request.method==='GET'&&match[2]==='logo'){
 if(!config.settings.publishLogo)return new Response(null,{status:404});
 return managerLogo(env,[config.store]);
 }
 if(request.method==='GET'&&match[2]==='status'){
 const id=url.searchParams.get('id'),token=request.headers.get('Authorization')?.replace(/^Bearer /,'');
 if(!/^[a-f0-9-]{36}$/.test(id||'')||!equal(token,await onlineSign(env,'receipt:'+config.store.id+':'+id)))onlineFail('ACCESS_DENIED',403);
 const row=await env.DB.prepare('SELECT status,updated_at FROM online_requests WHERE store_id=? AND id=?').bind(config.store.id,id).first();if(!row)onlineFail('REQUEST_NOT_FOUND',404);
 return onlineJson({status:row.status,updatedAt:row.updated_at});
 }
 if(match[2]!=='submit')onlineFail('INVALID_DATA',405);
 safeMethod(request,url.origin);await onlineRate(request,env,now);
 const input=await onlineReadBody(request),csrf=input.csrf||'',parts=csrf.split('.'),hour=Number(parts[1]);
 if(csrf!==readCookie(request,CSRF)||parts.length!==3||!Number.isFinite(hour)||hour>Math.floor(now/3600000)||hour<Math.floor(now/3600000)-1||!equal(parts[2],await onlineSign(env,'csrf:'+parts.slice(0,2).join('.'))))onlineFail('CSRF_EXPIRED',403);
 if(context){input.fulfillment='table';if(context.table&&input.table!==context.table)onlineFail('INVALID_TABLE')}
 else if(input.fulfillment==='table')onlineFail('TABLE_UNAVAILABLE',403);
 // Check retries before current catalog/closing validation, preserving an already committed request.
 const clean={...input};delete clean.csrf;
 const fingerprint=await onlineHash(JSON.stringify(clean));
 if(!/^[a-f0-9-]{36}$/.test(input.id||''))onlineFail('INVALID_DATA');
 const previous=await env.DB.prepare('SELECT fingerprint,status FROM online_requests WHERE store_id=? AND id=?').bind(config.store.id,input.id).first();
 const receipt=async status=>onlineJson({id:input.id,status,token:await onlineSign(env,'receipt:'+config.store.id+':'+input.id)});
 if(previous){if(previous.fingerprint!==fingerprint)onlineFail('INVALID_RETRY',409);return receipt(previous.status)}
 const record=await buildOnlineRequest(env,config,input,now);
 if(config.settings.channel==='whatsapp'){
 const message=whatsappMessage(config,record,language);
 return onlineJson({channel:'whatsapp',url:'https://wa.me/'+config.settings.whatsapp+'?text='+encodeURIComponent(message),message});
 }
 // Revalidate settings, entitlement and preset revisions atomically with the insert.
 const result=await env.DB.prepare(`INSERT INTO online_requests(store_id,id,fingerprint,data,created_at,updated_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM online_store_settings WHERE store_id=? AND revision=?) AND EXISTS(SELECT 1 FROM online_client_modules WHERE client_id=? AND revision=? AND enabled=1) AND (?=0 OR EXISTS(SELECT 1 FROM online_store_presets WHERE store_id=? AND revision=?)) ON CONFLICT(store_id,id) DO NOTHING`).bind(config.store.id,record.id,fingerprint,JSON.stringify(record),record.createdAt,record.createdAt,config.store.id,config.revision,config.clientId,config.entitlements.revision,context?1:0,config.store.id,config.preset.revision).run();
 if(!result.meta?.changes){const existing=await env.DB.prepare('SELECT fingerprint,status FROM online_requests WHERE store_id=? AND id=?').bind(config.store.id,record.id).first();if(!existing)onlineFail('SETTINGS_CHANGED',409);if(existing.fingerprint!==fingerprint)onlineFail('INVALID_RETRY',409);return receipt(existing.status)}
 return receipt('pending');
 }catch(error){return errorReply(error,language)}
}
function whatsappMessage(config,record,language){const t=s=>translate(language,s),money=n=>new Intl.NumberFormat({pt:'pt-BR',en:'en-US',es:'es-ES'}[language],{style:'currency',currency:'USD'}).format(n/100);return [config.store.name,t('Pedido online'),record.customer,record.contact,t(record.fulfillment==='delivery'?'Entrega':'Retirada'),record.address,record.scheduledFor?new Date(record.scheduledFor).toLocaleString({pt:'pt-BR',en:'en-US',es:'es-ES'}[language],{timeZone:record.timeZone})+' ('+record.timeZone+')':t('Para agora'),t('Forma de pagamento')+': '+t({cash:'Dinheiro',credit:'Cartão de crédito',debit:'Cartão de débito'}[record.paymentMethod]),...record.items.map(i=>`${i.quantity} × ${i.name}${i.flavors?' / '+i.flavors[1]:''} — ${money(i.unitPriceCents*i.quantity)}${i.note?'\n'+i.note:''}`),t('Subtotal dos produtos')+': '+money(record.subtotalCents),record.notes,t('Pagamento a combinar com a loja.')].filter(Boolean).join('\n')}
async function onlineQrResponse(url,env,config,language){
 onlineRequirePublished(config);
 if(!config.entitlements.tables||config.settings.channel!=='tablet'||!config.preset.tableCount)onlineFail('TABLE_UNAVAILABLE',403);
 const table=config.preset.qrMode==='per-table'?url.searchParams.get('table')||'':'';
 if(config.preset.qrMode==='per-table'&&(!/^\d{1,3}$/.test(table)||Number(table)<1||Number(table)>config.preset.tableCount))onlineFail('INVALID_TABLE');
 const target=new URL('/pedir/'+config.store.id,url.origin);target.search=new URLSearchParams({dine:'1',...(table?{table}:{}),qr:await onlineSign(env,'table:'+config.store.id+':'+config.preset.qrMode+':'+table)}).toString();
 const {qrSvg}=await import('./online-qr.mjs');
 const nonce=crypto.randomUUID();return html(onlineQrPage(nonce,config,language,target.href,qrSvg(target.href),table),nonce);
}
import { onlineQrPage } from './online-pages.mjs';

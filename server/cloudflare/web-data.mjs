// Read-only operational web queries. Authentication and license checks run in
// cloudResponse before reaching this module. Never replay the historical log.
import { roleRead, roleScreen } from '../../shared/app-roles.mjs';
import { storeModules } from './stores.mjs';
const fail = (status, code) => { throw Object.assign(new Error(code), { status }); };
const record = row => ({ key: row.key, value: JSON.parse(row.data), revision: row.revision });
const readable = (actor, row) => roleRead(actor.role, row.key) && (!row.key.startsWith('user:') || actor.role === 'admin' || row.key === 'user:' + actor.username);
function period(url) {
  const start = url.searchParams.get('start'), end = url.searchParams.get('end');
  if (!start || !end || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(start) >= Date.parse(end)) fail(400, 'INVALID_DATA');
  return [new Date(start).toISOString(), new Date(end).toISOString()];
}
const orderRange = "SELECT key, data, revision FROM store_records WHERE store_id = ? AND key GLOB 'order:*' AND julianday(json_extract(data,'$.createdAt')) >= julianday(?) AND julianday(json_extract(data,'$.createdAt')) < julianday(?)";
// Orders without a preparation record remain received, matching native rules.
const activeOrders = `SELECT o.key, o.data, o.revision FROM store_records o
 LEFT JOIN store_records p ON p.store_id=o.store_id AND p.key='preparation:' || substr(o.key,7)
 WHERE o.store_id=? AND o.key GLOB 'order:*' AND (p.key IS NULL OR json_extract(p.data,'$.status') != 'completed')`;
export async function webData(request, env, actor) {
  const url = new URL(request.url);
  if (!['/cloud/bootstrap', '/cloud/orders', '/cloud/order'].includes(url.pathname)) return null;
  if (request.method !== 'GET') fail(405, 'INVALID_DATA');
  if (url.searchParams.has('storeId') && url.searchParams.get('storeId') !== actor.storeId) fail(403, 'STORE_FORBIDDEN');
  if (url.pathname === '/cloud/bootstrap') {
    const scope = url.searchParams.get('scope'), after = url.searchParams.get('after') || '';
    if (!['core', 'orders', 'all'].includes(scope) || after.length > 200) fail(400, 'INVALID_DATA');
    const supplied = url.searchParams.get('anchor');
    const anchor = supplied === null ? (await env.DB.prepare('SELECT COALESCE(MAX(seq),0) AS seq FROM store_events WHERE store_id=?').bind(actor.storeId).first()).seq : Number(supplied);
    if (!Number.isSafeInteger(anchor) || anchor < 0) fail(400, 'INVALID_DATA');
    const modules = await storeModules(env, actor.storeId);
    let query, args;
    if (scope === 'all') {
      query = 'SELECT key,data,revision FROM store_records WHERE store_id=? AND revision<=? AND key>? ORDER BY key LIMIT 201';
      args = [actor.storeId,anchor,after];
    } else if (scope === 'core') {
      const device = url.searchParams.get('deviceId');
      if (!/^[a-f0-9-]{36}$/.test(device || '')) fail(400, 'INVALID_DATA');
      query = `SELECT key,data,revision FROM store_records WHERE store_id=? AND revision<=? AND key>? AND
       (key IN ('menu','logo','order-settings','printer','language',?,?,?) OR key GLOB 'product-option:*' OR key GLOB 'device:*' OR
        (key GLOB 'user:*' AND (?='admin' OR key=?)) OR
        (?=1 AND key GLOB 'customer:*') OR (?=1 AND key GLOB 'preorder:*')) ORDER BY key LIMIT 201`;
      args = [actor.storeId, anchor, after, 'printer:' + device, 'language:' + device, 'device:' + device, actor.role, 'user:' + actor.username, Number(modules.customers && roleScreen(actor.role,'customers')), Number(modules.preorders && roleScreen(actor.role,'preorders'))];
    } else {
      const [start, end] = period(url);
      query = `WITH selected AS (${orderRange}${modules.preparation ? ' UNION ' + activeOrders : ''}), combined AS (
        SELECT key,data,revision FROM selected UNION
        SELECT p.key,p.data,p.revision FROM selected o JOIN store_records p ON p.store_id=? AND p.key='preparation:' || substr(o.key,7)
       ) SELECT key,data,revision FROM combined WHERE revision<=? AND key>? ORDER BY key LIMIT 201`;
      args = [actor.storeId, start, end, ...(modules.preparation ? [actor.storeId] : []), actor.storeId, anchor, after];
    }
    const { results } = await env.DB.prepare(query).bind(...args).all();
    const page = results.slice(0,200);
    return { records: page.filter(row=>readable(actor,row)).map(record), anchor, next: results.length > 200 ? page.at(-1).key : null };
  }
  if (!roleScreen(actor.role,'history') && !roleScreen(actor.role,'preparation')) fail(403,'ACCESS_DENIED');
  let orders, next = null;
  if (url.pathname === '/cloud/order') {
    const id = url.searchParams.get('id');
    if (!id || id.length > 160) fail(400,'INVALID_DATA');
    const found = await env.DB.prepare('SELECT key,data,revision FROM store_records WHERE store_id=? AND key=?').bind(actor.storeId, 'order:' + id).first();
    if (!found) fail(404,'ORDER_NOT_FOUND');
    orders = [found];
  } else {
    const [start,end] = period(url);
    let after;
    try { after = url.searchParams.get('after') ? JSON.parse(url.searchParams.get('after')) : null; } catch { fail(400,'INVALID_DATA'); }
    if (after && (typeof after.key !== 'string' || after.key.length > 200 || !Number.isFinite(after.time))) fail(400,'INVALID_DATA');
    const { results } = await env.DB.prepare(`${orderRange}${after ? " AND (julianday(json_extract(data,'$.createdAt')) < ? OR (julianday(json_extract(data,'$.createdAt')) = ? AND key < ?))" : ''} ORDER BY julianday(json_extract(data,'$.createdAt')) DESC,key DESC LIMIT 101`).bind(actor.storeId,start,end,...(after ? [after.time,after.time,after.key] : [])).all();
    orders = results.slice(0,100);
    if (results.length > 100) {
      const last = orders.at(-1), date = await env.DB.prepare("SELECT julianday(json_extract(data,'$.createdAt')) AS time FROM store_records WHERE store_id=? AND key=?").bind(actor.storeId,last.key).first();
      next = JSON.stringify({ key:last.key,time:date.time });
    }
  }
  const preparations = [];
  for (let offset=0;offset<orders.length;offset+=50) {
    const keys = orders.slice(offset,offset+50).map(row=>'preparation:' + row.key.slice(6));
    if (keys.length) { const { results } = await env.DB.prepare(`SELECT key,data,revision FROM store_records WHERE store_id=? AND key IN (${keys.map(()=>'?').join(',')})`).bind(actor.storeId,...keys).all(); preparations.push(...results); }
  }
  return { records: [...orders,...preparations].filter(row=>readable(actor,row)).map(record), orderIds: orders.map(row=>row.key.slice(6)), next };
}

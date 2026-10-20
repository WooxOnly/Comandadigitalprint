import { validCloudValue } from '../../shared/cloud-validation.mjs';

// Read only the existing tablet logo for authorized stores. A combined view
// shows a logo only when the saved logos agree, rather than picking a store.
export async function managerLogo(env, stores) {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin' };
  const empty = () => new Response(null, { status: 204, headers });
  if (!stores.length) return empty();
  const { results } = await env.DB.prepare("SELECT DISTINCT data FROM store_records WHERE key = 'logo' AND store_id IN (SELECT value FROM json_each(?)) AND data != 'null' LIMIT 2").bind(JSON.stringify(stores.map(store => store.id))).all();
  if (results.length !== 1) return empty();
  try {
    const logo = JSON.parse(results[0].data);
    if (!logo || !validCloudValue('logo', logo)) return empty();
    const [prefix, base64] = logo.split(','), decoded = atob(base64);
    return new Response(Uint8Array.from(decoded, char => char.charCodeAt(0)), { headers: { ...headers, 'Content-Type': prefix.slice(5, -7) } });
  } catch { return empty(); }
}

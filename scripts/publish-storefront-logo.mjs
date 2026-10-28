// Owner-requested publication of the already synchronized Seabra logo only.
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validCloudValue } from '../shared/cloud-validation.mjs';
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
export function logoPublicationPlan(logo, settings, clientId, stamp = new Date().toISOString()) {
  const image = logo && JSON.parse(logo.data);
  if (typeof image !== 'string' || !validCloudValue('logo', image)) throw Error('Logo válida da loja não encontrada.');
  if (!settings || !Number.isSafeInteger(settings.revision) || settings.revision < 1 || !clientId) throw Error('Configuração inválida.');
  const current = JSON.parse(settings.data);
  if (current.publishLogo === true) return { changed: false };
  if (current.publishLogo !== false) throw Error('Preferência de logo inválida.');
  const expected = JSON.stringify({ ...current, publishLogo: true }), operation='publish-seabra-logo-20261027';
  const sql = `CREATE TABLE IF NOT EXISTS online_branding_backup(store_id TEXT NOT NULL,operation TEXT NOT NULL,data TEXT NOT NULL,revision INTEGER NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(store_id,operation));
INSERT OR IGNORE INTO online_branding_backup VALUES('seabra-1',${quote(operation)},${quote(settings.data)},${settings.revision},${quote(stamp)});
UPDATE online_store_settings SET data=${quote(expected)},revision=revision+1,updated_at=${quote(stamp)} WHERE store_id='seabra-1' AND revision=${settings.revision} AND data=${quote(settings.data)} AND EXISTS(SELECT 1 FROM store_records WHERE store_id='seabra-1' AND key='logo' AND data=${quote(logo.data)});
INSERT INTO online_audit(store_id,client_id,actor,action,created_at) SELECT 'seabra-1',${quote(clientId)},'owner-deployment',${quote(operation)},${quote(stamp)} WHERE EXISTS(SELECT 1 FROM online_store_settings WHERE store_id='seabra-1' AND revision=${settings.revision+1} AND data=${quote(expected)}) AND NOT EXISTS(SELECT 1 FROM online_audit WHERE store_id='seabra-1' AND action=${quote(operation)});`;
  return { changed: true, expected, sql };
}
function main() {
  const config='server/cloudflare/wrangler.homologacao.jsonc', database='seabra-cardapio-homologacao';
  if (JSON.parse(readFileSync(config)).d1_databases[0].database_id!=='ab7ad9d8-82f3-4a03-a645-3245a7817659') throw Error('Destino inválido.');
  const run=args=>execFileSync('npx',['--yes','wrangler@4','d1','execute',database,'--remote','--config',config,...args],{encoding:'utf8',env:{...process.env,WRANGLER_SEND_METRICS:'false'},maxBuffer:2e6});
  const query=sql=>JSON.parse(run(['--command',sql,'--json'])).flatMap(result=>result.results||[]);
  const [logo]=query("SELECT data FROM store_records WHERE store_id='seabra-1' AND key='logo'");
  const [settings]=query("SELECT data,revision FROM online_store_settings WHERE store_id='seabra-1'");
  const clients=query("SELECT id FROM manager_clients WHERE EXISTS(SELECT 1 FROM json_each(store_ids) WHERE value='seabra-1') LIMIT 2");
  if (clients.length > 1) throw Error('Loja vinculada a vários clientes.');
  const plan=logoPublicationPlan(logo,settings,clients[0]?.id || 'store:seabra-1');
  if (plan.changed) { mkdirSync('.wrangler',{recursive:true});const file='.wrangler/publish-storefront-logo.sql';writeFileSync(file,plan.sql);run(['--file',file,'--yes']);
    const [saved]=query("SELECT data FROM online_store_settings WHERE store_id='seabra-1'");if(saved.data!==plan.expected)throw Error('Configuração alterada simultaneamente; publicação interrompida.'); }
  console.log(JSON.stringify({logoPublished:true,changed:plan.changed,storeId:'seabra-1',ordersChanged:0,otherSettingsChanged:0}));
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();

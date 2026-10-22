// Only initializes additive online configuration for seabra-1 in homologação.
// No catalog, historical orders, preparation, sales, users or billing are changed.
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { defaultOnlineSettings } from '../server/cloudflare/online-orders.mjs';
const config='server/cloudflare/wrangler.homologacao.jsonc',database='seabra-cardapio-homologacao';
const target=JSON.parse(readFileSync(config,'utf8'));
if(target.name!==database||target.d1_databases?.[0]?.database_name!==database||target.d1_databases?.[0]?.database_id!=='ab7ad9d8-82f3-4a03-a645-3245a7817659')throw Error('Destino fora da homologação.');
const run=args=>execFileSync('npx',['--yes','wrangler@4','d1','execute',database,'--remote','--config',config,...args],{encoding:'utf8',env:{...process.env,WRANGLER_SEND_METRICS:'false'},maxBuffer:1024*1024});
const inspection=JSON.parse(run(['--command',"SELECT id FROM manager_clients WHERE EXISTS(SELECT 1 FROM json_each(store_ids) WHERE value='seabra-1') ORDER BY id LIMIT 2",'--json']));
const clients=inspection.flatMap(result=>result.results||[]);
if(clients.length>1)throw Error('Loja vinculada a vários clientes; configuração interrompida.');
const clientId=clients[0]?.id||'store:seabra-1';
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
const stamp=new Date().toISOString(),settings={...defaultOnlineSettings(),published:true};
mkdirSync('.wrangler',{recursive:true});
const file='.wrangler/online-first-test.sql';
writeFileSync(file,`
INSERT OR IGNORE INTO online_client_modules(client_id,enabled,scheduling,tables_enabled,updated_at) VALUES(${quote(clientId)},1,0,0,${quote(stamp)});
INSERT OR IGNORE INTO online_store_presets(store_id,table_count,qr_mode,updated_at) VALUES('seabra-1',0,'per-table',${quote(stamp)});
INSERT OR IGNORE INTO online_store_settings(store_id,data,updated_at) VALUES('seabra-1',${quote(JSON.stringify(settings))},${quote(stamp)});
INSERT INTO online_audit(store_id,client_id,actor,action,created_at) VALUES('seabra-1',${quote(clientId)},'owner-deployment','first-test-bootstrap',${quote(stamp)});
`);
run(['--file',file,'--yes']);
const verified=JSON.parse(run(['--command',`SELECT m.enabled,s.data FROM online_client_modules m JOIN online_store_settings s ON s.store_id='seabra-1' WHERE m.client_id=${quote(clientId)}`,'--json'])).flatMap(r=>r.results||[])[0];
if(!verified?.enabled||!JSON.parse(verified.data).published)throw Error('A configuração existente foi preservada; revise a habilitação no administrador.');
console.log('Pedidos online Seabra disponíveis em homologação. Configurações anteriores preservadas. Nenhum pedido ou APK gerado.');

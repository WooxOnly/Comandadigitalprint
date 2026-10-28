// Remove only the ten owner-identified accidental products in homologação.
// Default is read-only inspection; --apply requires an explicit dispatch.
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isValidMenu } from '../shared/menu-validation.mjs';
export const placeholderIds = new Set(['23f4c893-6b6b-4375-8aff-23cf0b508c55','17835d30-281a-4bca-b171-adb238ab1c35','fd6a1077-bf9f-42a1-874a-76191b5049e9','4ef2497f-3005-475a-8a12-380cfe2d13a1','ec4b5f06-a5db-4ed3-a685-a08b0352b632','5e2881a9-fc45-4118-9219-837d55694da8','51402de8-b83c-4a10-a75b-ce9679d3dc13','7746cacd-2325-4445-b5db-29db6f15ab65','47461598-5645-493d-8da7-5bdc3a47d62c','92d1d294-67fa-4157-821b-d08018ab8ff6'].map(id=>'item-'+id));
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
export function cleanupPlan(row, stamp = new Date().toISOString()) {
  if (!row || !Number.isSafeInteger(row.revision) || row.revision < 1) throw Error('Cardápio não encontrado ou revisão inválida.');
  const menu = JSON.parse(row.data);
  if (!isValidMenu(menu)) throw Error('Cardápio inválido; limpeza interrompida.');
  const removed = menu.filter(product=>placeholderIds.has(product.id));
  if (removed.some(product=>product.name!=='Novo produto'||product.price!==0||product.category!=='Lanches'||Object.keys(product).some(key=>!['id','name','category','price'].includes(key)))) throw Error('Um produto identificado foi alterado; limpeza interrompida.');
  const next = menu.filter(product=>!placeholderIds.has(product.id)), expected = JSON.stringify(next), mutation='cleanup-placeholder-products-20261022';
  const sql = `CREATE TABLE IF NOT EXISTS menu_cleanup_backup(store_id TEXT NOT NULL,operation TEXT NOT NULL,data TEXT NOT NULL,revision INTEGER NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(store_id,operation));
INSERT OR IGNORE INTO menu_cleanup_backup VALUES('seabra-1',${quote(mutation)},${quote(row.data)},${row.revision},${quote(stamp)});
INSERT INTO store_events(store_id,mutation,key,data,actor,created_at) SELECT 'seabra-1',${quote(mutation)},'menu',${quote(expected)},'owner',${quote(stamp)} WHERE EXISTS(SELECT 1 FROM store_records WHERE store_id='seabra-1' AND key='menu' AND revision=${row.revision} AND data=${quote(row.data)}) ON CONFLICT(store_id,mutation) DO NOTHING;`;
  return { removed: removed.length, remaining: next.length, expected, sql };
}
function main() {
  const config='server/cloudflare/wrangler.homologacao.jsonc', database='seabra-cardapio-homologacao';
  if (JSON.parse(readFileSync(config)).d1_databases[0].database_id!=='ab7ad9d8-82f3-4a03-a645-3245a7817659') throw Error('Destino inválido.');
  const run=args=>execFileSync('npx',['--yes','wrangler@4','d1','execute',database,'--remote','--config',config,...args],{encoding:'utf8',env:{...process.env,WRANGLER_SEND_METRICS:'false'},maxBuffer:2e6});
  const query=sql=>JSON.parse(run(['--command',sql,'--json'])).flatMap(result=>result.results||[]);
  const [row]=query("SELECT data,revision FROM store_records WHERE store_id='seabra-1' AND key='menu'");
  const plan=cleanupPlan(row);
  const [branding]=query("SELECT EXISTS(SELECT 1 FROM store_records WHERE store_id='seabra-1' AND key='logo') AS savedLogo,COALESCE((SELECT json_extract(data,'$.publishLogo') FROM online_store_settings WHERE store_id='seabra-1'),0) AS publishedLogo");
  if (!process.argv.includes('--apply') || !plan.removed) {
    console.log(JSON.stringify({mode:'inspect',candidates:plan.removed,remainingAfterCleanup:plan.remaining,branding,ordersChanged:0,applied:false}));return;
  }
  mkdirSync('.wrangler',{recursive:true});const file='.wrangler/cleanup-placeholder-products.sql';writeFileSync(file,plan.sql);
  run(['--file',file,'--yes']);
  const [saved]=query("SELECT data FROM store_records WHERE store_id='seabra-1' AND key='menu'");
  if (saved.data!==plan.expected) throw Error('Cardápio mudou simultaneamente; confira a limpeza antes de continuar.');
  console.log(JSON.stringify({mode:'apply',removed:plan.removed,remaining:plan.remaining,backup:'menu_cleanup_backup',branding,ordersChanged:0,applied:true}));
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();

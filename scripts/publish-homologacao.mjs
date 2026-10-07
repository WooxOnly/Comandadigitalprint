import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workerConfig = 'server/cloudflare/wrangler.homologacao.jsonc';
const database = 'seabra-cardapio-homologacao';
const api = 'https://seabra-cardapio-homologacao.wooxonly-comandas.workers.dev';
const projectId = '2cffbcaa-f4d7-423c-85c7-81131ca55310';

export function validateTargets(profile, worker, productionWorker, config, productionConfig) {
  const db = worker.d1_databases?.find(binding => binding.binding === 'DB');
  const productionDb = productionWorker.d1_databases?.find(binding => binding.binding === 'DB');
  if (profile?.env?.APP_VARIANT !== 'homologacao' || profile.env.EXPO_PUBLIC_API_BASE_URL !== api || profile.android?.buildType !== 'apk' || profile.distribution !== 'internal'
    || worker.name !== database || db?.database_name !== database || !db.database_id || db.database_id === productionDb?.database_id
    || config.name !== 'BistroHub Homologação' || config.slug !== 'matheus-sampaio-homologacao' || config.extra?.eas?.projectId !== projectId
    || config.extra.eas.projectId === productionConfig.extra?.eas?.projectId || config.android?.package !== 'com.wooxonly.comandadigitalprint.homologacao'
    || config.android.package === productionConfig.android?.package) {
    throw new Error('Os destinos não correspondem à homologação separada. Publicação interrompida.');
  }
}

export async function publish(run, checkHealth, verifyBackup, backup) {
  // Authentication is checked before any remote modification or financial data export.
  run('wrangler', ['whoami', '--json'], { capture: true });
  run('eas', ['whoami'], { capture: true });
  run('wrangler', ['d1', 'export', database, '--remote', '--config', workerConfig, '--output', backup, '--skip-confirmation']);
  verifyBackup(backup);
  run('wrangler', ['d1', 'execute', database, '--remote', '--config', workerConfig, '--file', 'server/cloudflare/store-schema.sql', '--yes']);
  run('wrangler', ['deploy', '--config', workerConfig]);
  await checkHealth(api + '/health');
  // A new build has its own identifier/download URL in the staging Expo project.
  run('eas', ['build', '--platform', 'android', '--profile', 'homologacao', '--non-interactive', '--no-wait']);
}

async function main() {
  if (!process.allowedNodeEnvironmentFlags.has('--use-env-proxy')) throw new Error('Use Node.js 24 ou mais recente para publicar preservando o proxy do ambiente.');
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check')) throw new Error('Use npm run publicar:homologacao [-- --check].');
  const check = args.includes('--check');
  const json = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
  const profile = json('eas.json').build.homologacao;
  const env = { ...process.env, ...profile.env, WRANGLER_SEND_METRICS: 'false' };
  const execute = (command, arguments_, capture = false) => {
    const result = spawnSync(command, arguments_, { cwd: root, env, encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
    if (result.error || result.status !== 0) {
      if (capture && result.stderr) process.stderr.write(result.stderr);
      throw new Error(`Falha em ${command === 'git' ? 'git' : arguments_.includes('wrangler') ? 'Cloudflare/Wrangler' : arguments_.includes('eas') ? 'Expo/EAS' : 'configuração'}. Confira o login e a mensagem do comando; a próxima etapa não foi executada.`);
    }
    return result.stdout;
  };
  if (execute('git', ['branch', '--show-current'], true).trim() !== 'homologacao') throw new Error('Selecione a branch homologacao antes de publicar.');
  if (!check && execute('git', ['status', '--porcelain', '--untracked-files=no'], true).trim()) throw new Error('Salve/commite as mudanças locais e atualize a branch homologacao antes de publicar.');
  const npm = process.env.npm_execpath;
  if (!npm) throw new Error('Inicie pelo comando npm run publicar:homologacao.');
  const config = JSON.parse(execute(process.execPath, [npm, 'exec', '--', 'expo', 'config', '--type', 'public', '--json'], true));
  validateTargets(profile, json(workerConfig), json('server/cloudflare/wrangler.jsonc'), config, json('app.json').expo);
  console.log(`Homologação: ${config.name} | ${config.android.package}\nPortal: ${api}/admin\nProjeto Expo: https://expo.dev/accounts/${config.owner}/projects/${config.slug}`);
  if (check) { console.log('Destinos conferidos. Nenhuma publicação ou build iniciada.'); return; }
  const run = (tool, arguments_, options = {}) => execute(process.execPath, [npm, 'exec', '--yes', '--package=' + (tool === 'wrangler' ? 'wrangler@4' : 'eas-cli@latest'), '--', tool, ...arguments_], options.capture);
  const directory = join(root, '.wrangler', 'backups');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const backup = join(directory, `homologacao-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`);
  // Node's child process inherits the user's proxy and certificate settings.
  const health = url => execute(process.execPath, ['--use-env-proxy', '--input-type=module', '-e', 'const response = await fetch(process.argv[1], { signal: AbortSignal.timeout(20000) }); if (!response.ok || (await response.json()).ok !== true) throw new Error("Servidor de homologação indisponível após publicação");', url]);
  await publish(run, health, file => { if (statSync(file).size === 0) throw new Error('Backup vazio. Migração interrompida.'); }, backup);
  console.log(`Servidor publicado e build solicitada. Backup local: ${backup}\nO EAS mostrou acima o link exclusivo da build. Instale o APK ao terminar; habilite módulos somente depois de atualizar os tablets.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}

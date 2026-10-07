import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { publish, validateTargets } from '../scripts/publish-homologacao.mjs';

const json = path => JSON.parse(readFileSync(path, 'utf8'));
const profile = json('eas.json').build.homologacao;
const worker = json('server/cloudflare/wrangler.homologacao.jsonc');
const productionWorker = json('server/cloudflare/wrangler.jsonc');
const productionConfig = json('app.json').expo;
const config = { ...productionConfig, name: 'BistroHub Homologação', slug: 'matheus-sampaio-homologacao', android: { ...productionConfig.android, package: 'com.wooxonly.comandadigitalprint.homologacao' }, extra: { eas: { projectId: '2cffbcaa-f4d7-423c-85c7-81131ca55310' } } };

test('publisher refuses production API, database, Expo project or Android package', () => {
  validateTargets(profile, worker, productionWorker, config, productionConfig);
  assert.throws(() => validateTargets({ ...profile, env: { ...profile.env, EXPO_PUBLIC_API_BASE_URL: 'https://seabra-cardapio.wooxonly-comandas.workers.dev' } }, worker, productionWorker, config, productionConfig));
  assert.throws(() => validateTargets(profile, { ...worker, d1_databases: productionWorker.d1_databases }, productionWorker, config, productionConfig));
  assert.throws(() => validateTargets(profile, worker, productionWorker, { ...config, extra: productionConfig.extra }, productionConfig));
  assert.throws(() => validateTargets(profile, worker, productionWorker, { ...config, android: productionConfig.android }, productionConfig));
});

test('publisher authenticates both services, verifies backup, migrates, deploys, checks health, then starts staging APK without waiting', async () => {
  const events = [];
  await publish((tool, args) => events.push({ tool, args }), url => events.push({ health: url }), file => events.push({ backup: file }), '/private/backup.sql');
  assert.deepEqual(events.slice(0, 2).map(event => event.tool), ['wrangler', 'eas']);
  assert.equal(events[2].args[1], 'export'); assert.equal(events[3].backup, '/private/backup.sql');
  assert.equal(events[4].args[1], 'execute'); assert.equal(events[5].args[0], 'deploy');
  assert.equal(events[6].health, 'https://seabra-cardapio-homologacao.wooxonly-comandas.workers.dev/health');
  assert.deepEqual(events[7], { tool: 'eas', args: ['build', '--platform', 'android', '--profile', 'homologacao', '--non-interactive', '--no-wait'] });
  for (const event of events.filter(event => event.args?.includes('--config'))) assert.equal(event.args[event.args.indexOf('--config') + 1], 'server/cloudflare/wrangler.homologacao.jsonc');
});

test('authentication or backup failure prevents migration; deployment or health failure prevents APK build', async () => {
  for (const failure of ['auth', 'export', 'verify', 'deploy', 'health']) {
    const events = [];
    await assert.rejects(publish((tool, args) => {
      events.push(args);
      if ((failure === 'auth' && tool === 'eas' && args[0] === 'whoami') || (failure === 'export' && args[1] === 'export') || (failure === 'deploy' && args[0] === 'deploy')) throw Error(failure);
    }, () => { if (failure === 'health') throw Error(failure); }, () => { if (failure === 'verify') throw Error(failure); }, '/private/backup.sql'));
    assert.ok(!events.some(args => args[0] === 'build'));
    if (['auth', 'export', 'verify'].includes(failure)) assert.ok(!events.some(args => args[1] === 'execute'));
  }
});

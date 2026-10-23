import { spawnSync } from 'node:child_process';
if (process.env.EXPO_PUBLIC_WEB_LICENSE_PUBLIC_KEY) throw Error('Remove the synthetic test license key before preparing a delivery.');
const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['expo', 'export', '--clear', '--platform', 'web', '--output-dir', 'web-dist'], {
  stdio: 'inherit', env: { ...process.env, APP_VARIANT: 'homologacao', EXPO_PUBLIC_WEB_APP: '1', EXPO_PUBLIC_WEB_BASE_PATH: '/app' },
});
process.exitCode = result.status ?? 1;

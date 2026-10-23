// Synthetic providers + real screens, CPU-throttled Chromium. Diagnostic numbers
// are not Android device timings, nor a before/after speedup claim.
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), http = require('node:http');
const { chromium } = require('playwright-core');
const { buildTabletPreview } = require('./tablet-preview.cjs');
(async () => {
 const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bistro-navigation-performance-')); await buildTabletPreview(directory);
 const server = http.createServer((request, response) => { const file = request.url.startsWith('/tablet-preview.js') ? 'tablet-preview.js' : 'tablet-preview.html'; response.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : 'text/html'); response.end(fs.readFileSync(path.join(directory, file))); });
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] }); const results = [], errors = [];
 try {
  for (const theme of ['light', 'dark']) for (const viewport of [{ width: 600, height: 960 }, { width: 960, height: 600 }]) {
   const page = await browser.newPage({ viewport, colorScheme: theme }); page.on('pageerror', error => errors.push(error.message));
   const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
   await page.goto(`http://127.0.0.1:${server.address().port}/tablet-preview.html?language=pt`); await page.waitForFunction(() => !!window.qa);
   await page.evaluate(() => {
    const base = { plate: '1', customer: 'Synthetic', serviceMode: 'dine_in', items: [{ id: 'item', name: 'Item', category: 'Group', quantity: 1, note: '' }] };
    const today = new Date(); today.setHours(10, 0, 0, 0);
    const history = Array.from({ length: 8000 }, (_, index) => ({ ...base, id: 'perf-' + index, createdAt: new Date(index < 80 ? today.getTime() : today.getTime() - 86400000 * (1 + index % 150)).toISOString() }));
    window.qa.setHistory(history);
    window.qa.setPreparation(history.map((order, index) => ({ orderId: order.id, status: index < 8 ? 'received' : 'completed', updatedAt: order.createdAt })));
    window.navigationSamples = []; window.navigationLongTasks = [];
    new PerformanceObserver(list => { window.navigationLongTasks.push(...list.getEntries().map(entry => entry.duration)); }).observe({ type: 'longtask', buffered: false });
    document.addEventListener('click', event => {
     if (!event.target.closest('[data-testid^="nav-"]')) return;
     const start = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => window.navigationSamples.push({ route: location.hash, ms: performance.now() - start })));
    }, true);
   });
   for (let repeat = 0; repeat < 2; repeat++) for (const tab of ['order', 'menu', 'history', 'preparation', 'home']) {
    const count = await page.evaluate(() => window.navigationSamples.length);
    await page.getByTestId('nav-' + tab).click();
    await page.waitForFunction(previous => window.navigationSamples.length > previous, count);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
   }
   results.push({ theme, viewport, ...await page.evaluate(() => ({ samples: window.navigationSamples, longTasksMs: window.navigationLongTasks })) });
   await page.screenshot({ path: path.join(directory, `${theme}-${viewport.width}.png`) }); await page.close();
  }
  assert.deepEqual(errors, []); const report = { cpuThrottle: 6, syntheticOrders: 8000, results, limitation: 'React Native Web, synthetic providers and mounted-screen fixture; no native bridge, encrypted I/O or retained native tabs. Not a device benchmark.' };
  fs.writeFileSync(path.join(directory, 'navigation-performance.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify({ ok: true, transitions: results.reduce((sum, result) => sum + result.samples.length, 0), report: path.join(directory, 'navigation-performance.json') }));
 } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });

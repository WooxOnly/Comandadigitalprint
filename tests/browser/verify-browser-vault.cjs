const assert = require('node:assert/strict'), http = require('node:http'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { chromium, webkit } = require('playwright-core'), esbuild = require('esbuild');
(async () => {
 const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bistro-web-vault-'));
 await esbuild.build({ stdin: { contents: `import {browserVault} from './src/services/browserVault';import {printBrowserHtml} from './src/services/browserPrint';window.vault=browserVault;window.printBrowserHtml=printBrowserHtml`, resolveDir: process.cwd() }, bundle: true, outfile: path.join(directory, 'vault.js'), platform: 'browser' });
 const server = http.createServer((req, res) => { res.setHeader('Content-Type', req.url === '/vault.js' ? 'application/javascript' : 'text/html'); res.end(req.url === '/vault.js' ? fs.readFileSync(path.join(directory, 'vault.js')) : '<script src="/vault.js"></script>'); });
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const browser = await (process.env.WEB_APP_ENGINE === 'webkit' ? webkit.launch() : chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] }));
 const context = await browser.newContext(), a = await context.newPage(), b = await context.newPage(); const base = 'http://localhost:' + server.address().port;
 try {
  await Promise.all([a.goto(base), b.goto(base)]);
  assert.equal(await a.evaluate(async () => {
    let printed = '';
    const intercept = event => { if (event.target instanceof HTMLIFrameElement) event.target.contentWindow.print = () => { printed = event.target.contentDocument.body.innerText; }; };
    document.addEventListener('load', intercept, true);
    try { await window.printBrowserHtml('<html><body>Receipt only</body></html>'); return printed; }
    finally { document.removeEventListener('load', intercept, true); }
  }), 'Receipt only');
  await Promise.all([a.evaluate(() => window.vault.setItem('a', 'Private Alice order')), b.evaluate(() => window.vault.setItem('b', 'Private Bob order'))]);
  assert.equal(await a.evaluate(() => window.vault.getItem('b')), 'Private Bob order');
  assert.equal(await b.evaluate(() => window.vault.getItem('a')), 'Private Alice order');
  await a.evaluate(async () => {
   const request = indexedDB.open('bistrohub-web-v1'); const db = await new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = reject; });
   const get = (store, name) => new Promise((resolve, reject) => { const req = db.transaction(store).objectStore(store).get(name); req.onsuccess = () => resolve(req.result); req.onerror = reject; });
   const key = await get('keys', 'master'); if (key.extractable) throw Error('Extractable key');
   try { await crypto.subtle.exportKey('raw', key); throw Error('Key export accepted'); } catch (error) { if (error.name !== 'InvalidAccessError') throw error; }
   const cipher = await get('values', 'a'); if (!cipher.iv || !cipher.data || new TextDecoder().decode(cipher.data).includes('Private Alice')) throw Error('Unencrypted payload');
   await new Promise((resolve, reject) => { const tx = db.transaction('values', 'readwrite'); tx.objectStore('values').put(cipher, 'swapped'); tx.oncomplete = resolve; tx.onabort = reject; });
   try { await window.vault.getItem('swapped'); throw Error('AAD tampering accepted'); } catch (error) { if (error.name !== 'OperationError') throw error; }
   db.close();
  });
  const bindings = await Promise.allSettled([a.evaluate(() => window.vault.bindStore('store-one')), b.evaluate(() => window.vault.bindStore('store-two'))]);
  assert.equal(bindings.filter(result => result.status === 'fulfilled').length, 1);
  await a.reload(); assert.equal(await a.evaluate(() => window.vault.getItem('a')), 'Private Alice order');
  await a.evaluate(async () => { const request = indexedDB.open('bistrohub-web-v1'); await new Promise(resolve => { request.onsuccess = () => { const db = request.result, tx = db.transaction('keys', 'readwrite'); tx.objectStore('keys').delete('master'); tx.oncomplete = () => { db.close(); resolve(); }; }; }); });
  await a.reload(); assert.equal(await a.evaluate(async () => { try { await window.vault.getItem('a'); return false; } catch { return true; } }), true);
  console.log(JSON.stringify({ ok: true, engine: process.env.WEB_APP_ENGINE || 'chromium', checks: ['concurrent key creation', 'encrypted payloads', 'non-extractable key', 'authenticated names', 'atomic store binding', 'reload', 'missing key fails closed'] }));
 } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });

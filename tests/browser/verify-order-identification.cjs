// Focused regression: the shipping order form, synthetic providers, Chromium.
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), http = require('node:http');
const { chromium } = require('playwright-core'), { buildTabletPreview } = require('./tablet-preview.cjs');
const { loadTs } = require('../helpers/load-ts.cjs'), { translate } = loadTs('src/i18n/translations.ts');
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bistro-order-identification-')); await buildTabletPreview(dir);
  const server = http.createServer((req, res) => { const file = req.url.startsWith('/tablet-preview.js') ? 'tablet-preview.js' : 'tablet-preview.html'; res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : 'text/html'); res.end(fs.readFileSync(path.join(dir, file))); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] }); const errors = []; let cases = 0;
  const sizes = [[1552,900], [1280,800], [960,600], [800,1280], [530,900], [390,844], [320,568]];
  try {
    for (const language of ['pt','en','es']) for (const theme of ['light','dark']) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: theme }); page.on('pageerror', error => errors.push(error.message));
      const t = text => translate(text, language);
      await page.goto('http://127.0.0.1:' + server.address().port + '/tablet-preview.html?language=' + language + '#/order');
      assert.equal(await page.getByText(t('Do pedido à cozinha'),{exact:true}).count(),0);
      await page.getByRole('textbox', { name: t('Nome do cliente, opcional'), exact: true }).fill('Will · Cliente com nome longo');
      await page.getByRole('textbox', { name: t('Outro número de mesa'), exact: true }).fill('18');
      await page.getByRole('radio', { name: t('Para levar'), exact: true }).click();
      for (const [width,height] of sizes) {
        await page.setViewportSize({width,height}); await page.waitForTimeout(160);
        const result = await page.getByTestId('order-identification').evaluate(panel => {
          const box = element => { const r=element.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}; };
          const overlaps = (a,b) => Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
          const groups = ['order-service-group','order-customer-group','order-table-choices','order-custom-table-group','confirm-order-identification'].map(id => panel.querySelector('[data-testid="'+id+'"]'));
          const rectangles=groups.map(box), collisions=[]; for(let i=0;i<rectangles.length;i++)for(let j=i+1;j<rectangles.length;j++)if(overlaps(rectangles[i],rectangles[j]))collisions.push([i,j]);
          const contained=[];
          for(const element of panel.querySelectorAll('input,[role=radio]')) {
            const r=box(element),parent=box(element.parentElement);if(r.left<parent.left-1||r.right>parent.right+1)contained.push(element.getAttribute('aria-label')||element.textContent);
          }
          const tables=[...panel.querySelector('[data-testid="order-table-choices"]').querySelectorAll('[role=radio]')].map(box);
          const tableCollisions=[];for(let i=0;i<tables.length;i++)for(let j=i+1;j<tables.length;j++)if(overlaps(tables[i],tables[j]))tableCollisions.push([i,j]);
          return {collisions,contained,tableCollisions,tableCount:tables.length,minTableWidth:Math.min(...tables.map(r=>r.width)),overflow:document.documentElement.scrollWidth>innerWidth+1};
        });
        assert.deepEqual(result.collisions, [], JSON.stringify({language,theme,width,result}));assert.deepEqual(result.contained, []);assert.deepEqual(result.tableCollisions, []);assert.equal(result.tableCount,10);assert.ok(result.minTableWidth>=21.9);assert.equal(result.overflow,false);
        assert.equal(await page.getByTestId('confirm-order-identification').textContent(),t('Avançar'));
        assert.equal(await page.getByRole('textbox',{name:t('Nome do cliente, opcional'),exact:true}).inputValue(),'Will · Cliente com nome longo');
        assert.equal(await page.getByRole('textbox',{name:t('Outro número de mesa'),exact:true}).inputValue(),'18');
        cases++;
        if(language==='pt' && [1280,530].includes(width)) {await page.getByTestId('order-identification').screenshot({path:path.join(dir,theme+'-'+width+'.png')});}
      }
      await page.getByTestId('confirm-order-identification').click();const summary=await page.getByTestId('order-identification-summary').textContent();assert.ok(summary.includes('18')&&summary.includes('Will · Cliente com nome longo')&&summary.includes(t('Para levar')));await page.getByTestId('edit-order-identification').click();assert.equal(await page.getByRole('textbox',{name:t('Outro número de mesa'),exact:true}).inputValue(),'18');await page.close();
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,cases,screenshots:dir,evidence:'Real screen in Chromium with synthetic providers; Android device validation remains separate.'}));
  } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);process.exitCode=1;});

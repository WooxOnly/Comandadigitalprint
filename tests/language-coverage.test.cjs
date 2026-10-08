const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const { loadTs } = require('./helpers/load-ts.cjs');
const { translations, translate } = loadTs('src/i18n/translations.ts');
function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? filesIn(path.join(directory, entry.name)) : /\.tsx?$/.test(entry.name) ? [path.join(directory, entry.name)] : []);
}
function stringBranches(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
  return ts.isConditionalExpression(node) ? [...stringBranches(node.whenTrue), ...stringBranches(node.whenFalse)] : [];
}
test('every literal translated APK label, including conditional messages, has EN and ES coverage', () => {
  const missing = [];
  for (const file of [...filesIn('src'), 'printerService.ts', 'orderItems.ts']) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    function walk(node) {
      if (ts.isCallExpression(node) && ['t', 'translate'].includes(node.expression.getText(source)) && node.arguments[0]) {
        for (const key of stringBranches(node.arguments[0])) if (!Object.hasOwn(translations, key)) missing.push({ file, key });
      }
      ts.forEachChild(node, walk);
    }
    walk(source);
  }
  assert.deepEqual(missing, []);
});
test('APK screens have no untranslated hardcoded interface prose', () => {
  const universal = new Set(['BistroHub', 'BistroHub ·', 'admin', 'mm', 'min', 'min ·', '(USD)', '· Zelle:', 'x']), raw = [];
  for (const file of [...filesIn('src/screens'), ...filesIn('src/ui')]) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function walk(node) {
      if (ts.isJsxText(node) && /\p{L}/u.test(node.text) && !universal.has(node.text.trim())) raw.push({ file, text: node.text.trim() });
      ts.forEachChild(node, walk);
    }
    walk(source);
  }
  assert.deepEqual(raw, []);
});
test('APK and portal catalogs have complete nonempty targets, preserved parameters and clean UTF-8', async () => {
  const { TRANSLATIONS } = await import('../server/cloudflare/manager-i18n.mjs');
  for (const file of ['admin-auth.mjs','manager-api.mjs','manager-admin.mjs']) {
    const source=ts.createSourceFile(file,fs.readFileSync('server/cloudflare/'+file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
    function walk(node) {
      if (ts.isPropertyAssignment(node)&&node.name.getText(source)==='error'&&ts.isCallExpression(node.parent.parent)&&node.parent.parent.expression.getText(source)==='reply') for(const key of stringBranches(node.initializer)) assert.ok(Object.hasOwn(TRANSLATIONS,key),file+': '+key);
      if (ts.isCallExpression(node)&&node.expression.getText(source)==='bad'&&node.arguments[0]) for(const key of stringBranches(node.arguments[0])) assert.ok(Object.hasOwn(TRANSLATIONS,key),file+': '+key);
      ts.forEachChild(node,walk);
    }
    walk(source);
  }
  const parameters = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  for (const catalog of [translations, TRANSLATIONS]) for (const [source, targets] of Object.entries(catalog)) {
    assert.equal(targets.length, 2, source);
    for (const target of targets) { assert.equal(typeof target, 'string', source); assert.ok(target.trim(), source); assert.deepEqual(parameters(target), parameters(source), source); }
    for (const value of [source, ...targets]) { assert.equal(value.normalize('NFC'), value, source); assert.ok(!/�|Ã[£©³ª¡º§±]|Â[°·]/.test(value), source); }
  }
  assert.equal(translate('Pendências', 'en'), 'Pending items');
  assert.equal(translate('Sales tax', 'es'), 'Impuesto sobre ventas');
  assert.equal(translate('Fechar', 'es'), 'Cerrar');
  assert.equal(translate('constructor', 'en'), 'constructor');
});

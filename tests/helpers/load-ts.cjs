const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function loadTs(file, modules = {}) {
  const exports = {};
  const absolute = path.resolve(file);
  const source = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  new Function('exports', 'require', source)(exports, name => {
    if (name in modules) return modules[name];
    if (name.startsWith('.')) {
      const candidate = path.resolve(path.dirname(absolute), name);
      if (fs.existsSync(candidate + '.ts')) return loadTs(candidate + '.ts', modules);
      return require(candidate);
    }
    return require(name);
  });
  return exports;
}
module.exports = { loadTs };

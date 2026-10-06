const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

// react-native-tcp-socket 6.4.3 omits the namespace required by Android's
// current Gradle plugin. Patch the dependency during CNG, not generated files.
function patchTcpGradle(source) {
  if (/\bnamespace\s*(?:=\s*)?["']/.test(source)) return source;
  if (!/android\s*\{/.test(source)) throw new Error('react-native-tcp-socket changed: Android namespace patch must be reviewed.');
  return source.replace(/android\s*\{/, 'android {\n    namespace "com.asterinet.react.tcpsocket"');
}

function patchTcpManifest(source) {
  return source.replace(/\s+package=(["'])com\.asterinet\.react\.tcpsocket\1/, '');
}

module.exports = config => withDangerousMod(config, ['android', async result => {
  const root = path.dirname(require.resolve('react-native-tcp-socket/package.json'));
  const file = path.join(root, 'android/build.gradle');
  fs.writeFileSync(file, patchTcpGradle(fs.readFileSync(file, 'utf8')));
  const manifest = path.join(root, 'android/src/main/AndroidManifest.xml');
  fs.writeFileSync(manifest, patchTcpManifest(fs.readFileSync(manifest, 'utf8')));
  return result;
}]);
module.exports.patchTcpGradle = patchTcpGradle;
module.exports.patchTcpManifest = patchTcpManifest;

const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

// expo-print 57 sizes the HTML renderer, but discards those dimensions when
// opening PrintManager. Forward them so the dialog starts with receipt paper.
const original = `    if (ORIENTATION_LANDSCAPE == orientation) {
      builder.setMediaSize(PrintAttributes.MediaSize.UNKNOWN_LANDSCAPE)
    } else {
      builder.setMediaSize(PrintAttributes.MediaSize.UNKNOWN_PORTRAIT)
    }`;

const replacement = `    // comanda-receipt-paper: preserve explicit HTML dimensions in the dialog.
    val width = options.width
    val height = options.height
    if (width != null && height != null && width > 0 && height > 0) {
      val widthMils = kotlin.math.round(width * 1000.0 / 72.0).toInt()
      val heightMils = kotlin.math.round(height * 1000.0 / 72.0).toInt()
      val widthMm = kotlin.math.round(width * 25.4 / 72.0).toInt()
      val paper = PrintAttributes.MediaSize("comanda_" + width + "_" + height, "Comanda " + widthMm + " mm", widthMils, heightMils)
      builder.setMediaSize(if (ORIENTATION_LANDSCAPE == orientation) paper.asLandscape() else paper)
    } else if (ORIENTATION_LANDSCAPE == orientation) {
      builder.setMediaSize(PrintAttributes.MediaSize.UNKNOWN_LANDSCAPE)
    } else {
      builder.setMediaSize(PrintAttributes.MediaSize.UNKNOWN_PORTRAIT)
    }`;

function patchPrintModule(source) {
  const normalized = source.replace(/\r\n/g, '\n');
  const callbacks = '        printDocumentToPrinter(document, options)';
  const guarded = '        // comanda-print-error: reject instead of leaving the JS caller waiting.\n        try {\n          printDocumentToPrinter(document, options)\n        } catch (e: Exception) {\n          continuation.resumeWithException(e)\n          return\n        }';
  const withErrors = normalized.includes('comanda-print-error') ? normalized : normalized.replace(callbacks, guarded);
  if (normalized.includes(replacement)) return withErrors;
  if (normalized.split(original).length !== 2) {
    throw new Error('expo-print changed: review the receipt paper plugin before building Android.');
  }
  if (!withErrors.includes('comanda-print-error')) throw new Error('expo-print callbacks changed: review print error handling.');
  return withErrors.replace(original, replacement);
}

function withReceiptPaper(config) {
  return withDangerousMod(config, ['android', async (mod) => {
    const packageRoot = path.dirname(require.resolve('expo-print/package.json', { paths: [mod.modRequest.projectRoot] }));
    const file = path.join(packageRoot, 'android/src/main/java/expo/modules/print/PrintModule.kt');
    const source = await fs.readFile(file, 'utf8');
    const patched = patchPrintModule(source);
    if (patched !== source) await fs.writeFile(file, patched, 'utf8');
    return mod;
  }]);
}

module.exports = withReceiptPaper;
module.exports.patchPrintModule = patchPrintModule;

// Vendored qrcode-generator 2.0.4 (MIT), served locally with no external QR service.
import qrcode from './vendor/qrcode-generator.mjs';
export function qrSvg(url) { const qr=qrcode(0,'M');qr.addData(url);qr.make();return qr.createSvgTag({cellSize:4,margin:16,scalable:true}); }

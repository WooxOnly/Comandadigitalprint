import { forwardRef, useImperativeHandle, useRef } from 'react';
export type BrowserReceiptFrameHandle = { injectJavaScript(script: string): void };
export const BrowserReceiptFrame = forwardRef<BrowserReceiptFrameHandle, { source: { html: string }; style: { width: number; flex: number; backgroundColor: string }; onLoadEnd(): void; originWhitelist?: string[] }>(function BrowserReceiptFrame({ source, style, onLoadEnd }, ref) {
  const frame = useRef<HTMLIFrameElement>(null);
  useImperativeHandle(ref, () => ({ injectJavaScript(script) {
    // Only consume the existing receipt zoom command; never evaluate arbitrary JS.
    const zoom = script.match(/style\.zoom\s*=\s*'(\d+)%'/)?.[1];
    if (zoom && frame.current?.contentDocument) frame.current.contentDocument.documentElement.style.zoom = zoom + '%';
  } }), []);
  return <iframe ref={frame} title="BistroHub — Receipt" srcDoc={source.html} sandbox="allow-same-origin" style={{ ...style, border: 0 }} onLoad={onLoadEnd} />;
});

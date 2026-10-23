// The browser's system print UI must receive the receipt document, not the
// application page. Calling window.print() on the app would print its controls.
export function printBrowserHtml(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.title = 'BistroHub — Receipt'; frame.setAttribute('sandbox', 'allow-same-origin allow-modals');
    Object.assign(frame.style, { position: 'fixed', width: '1px', height: '1px', left: '-10000px', border: '0' });
    let finished = false;
    const fail = () => { if (finished) return; finished = true; clearTimeout(timer); frame.remove(); reject(Object.assign(new Error('PRINT_BROWSER_UNAVAILABLE'), { code: 'PRINT_BROWSER_UNAVAILABLE' })); };
    const timer = setTimeout(fail, 10000);
    frame.onload = () => {
      if (finished) return;
      try {
        if (!frame.contentWindow) { fail(); return; }
        frame.contentWindow.addEventListener('afterprint', () => frame.remove(), { once: true });
        frame.contentWindow.focus(); frame.contentWindow.print();
        finished = true; clearTimeout(timer); setTimeout(() => frame.remove(), 60000); resolve();
      } catch { fail(); }
    };
    frame.onerror = fail; frame.srcdoc = html; document.body.appendChild(frame);
  });
}

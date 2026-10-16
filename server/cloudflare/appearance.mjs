import { darkColor, THEME_STORAGE_KEY } from '../../shared/appearance.mjs';
import { translate } from './manager-i18n.mjs';
export function portalAppearance(nonce, language, css, body) {
  const variables = new Map();
  const declarations = value => value.replace(/([a-z-]+)(\s*:\s*)([^;{}]+)/gi, (all, property, separator, content) => property + separator + content.replace(/#[\da-f]{8}\b|#[\da-f]{6}\b|#[\da-f]{4}\b|#[\da-f]{3}\b/gi, color => {
    const converted = darkColor(color, property); if (converted === color) return color;
    const name = '--bh-' + (/background/i.test(property) ? 'bg' : /border/i.test(property) ? 'border' : 'fg') + '-' + color.slice(1).toLowerCase();
    variables.set(name, converted); return `var(${name},${color})`;
  }));
  const themedCss = declarations(css);
  // Preserve nonce scripts verbatim; only transform actual markup style attrs.
  const themedBody = body.split(/(<script\b[^>]*>[\s\S]*?<\/script>)/gi).map(part => /^<script\b/i.test(part) ? part : part.replace(/\bstyle=(['"])(.*?)\1/gi, (_all, quote, value) => 'style=' + quote + declarations(value) + quote)).join('');
  const key = JSON.stringify(THEME_STORAGE_KEY);
  const head = `<script nonce="${nonce}">try{const choice=localStorage.getItem(${key});document.documentElement.dataset.theme=choice==='dark'||choice!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch{document.documentElement.dataset.theme='light'}</script>`;
  const toolbar = `<div class="appearance-toolbar"><div role="group" aria-label="${translate(language, 'Aparência')}"><button type="button" data-theme-choice="light" aria-pressed="false">${translate(language, 'Claro')}</button><button type="button" data-theme-choice="dark" aria-pressed="false">${translate(language, 'Escuro')}</button></div></div>`;
  const script = `<script nonce="${nonce}">(()=>{const root=document.documentElement,buttons=document.querySelectorAll('[data-theme-choice]');function refresh(){buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.themeChoice===root.dataset.theme)))}buttons.forEach(button=>button.addEventListener('click',()=>{const value=button.dataset.themeChoice;if(value!=='light'&&value!=='dark')return;try{localStorage.setItem(${key},value)}catch{}root.dataset.theme=value;refresh()}));addEventListener('storage',event=>{if(event.key===${key}&&(event.newValue==='light'||event.newValue==='dark')){root.dataset.theme=event.newValue;refresh()}});refresh()})();</script>`;
  const darkVariables = [...variables].map(([name, value]) => `${name}:${value}`).join(';');
  const appearanceCss = `html[data-theme=dark]{color-scheme:dark;${darkVariables}}.appearance-toolbar{position:sticky;top:0;z-index:100;background:#f5f3ef;border-bottom:1px solid #dbe2dc;padding:4px 16px;display:flex;justify-content:flex-end}.appearance-toolbar>div{display:flex;gap:4px}.appearance-toolbar button{font:600 12px system-ui,sans-serif;min-height:44px;padding:6px 12px;margin:0;background:#fff;color:#214b40;border:1px solid #dbe2dc;border-radius:8px;cursor:pointer}.appearance-toolbar button[aria-pressed=true]{background:#e8f1ec;border-color:#214b40}.appearance-toolbar button:focus-visible{outline:3px solid #ad672c;outline-offset:2px}html[data-theme=dark] .bar-fill{background:#79b895}html[data-theme=dark] .bar-fill.negative{background:#e4887f}html[data-theme=dark] .bar-button[data-unknown=true] .bar-fill{background:#83978a}html[data-theme=dark] .appearance-toolbar{background:#101b15;border-color:#5c7867}html[data-theme=dark] .appearance-toolbar button{background:#1c2b23;color:#c5e5d4;border-color:#5c7867}html[data-theme=dark] .appearance-toolbar button[aria-pressed=true]{background:#2b4537;border-color:#b6d9c5}`;
  return { head, css: themedCss + appearanceCss, body: toolbar + themedBody + script };
}

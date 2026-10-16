const {test}=require('node:test'),assert=require('node:assert/strict'),{Script}=require('node:vm');
const {darkColor,validTheme}=require('../shared/appearance.mjs');
test('dark palette preserves white button labels and image data while replacing light surfaces and low-contrast text',()=>{
 assert.equal(validTheme('dark'),true);assert.equal(validTheme('light'),true);for(const value of [null,'auto','__proto__',{},1])assert.equal(validTheme(value),false);
 assert.equal(darkColor('#fff','color'),'#fff');assert.equal(darkColor('#AE4328','backgroundColor'),'#AE4328');assert.equal(darkColor('#FFFFFF','backgroundColor'),'#1c2b23');assert.equal(darkColor('#F5F3EF','backgroundColor'),'#101b15');
 for(const value of ['#223B35','#62716B','#AE4328','#214B40'])assert.notEqual(darkColor(value),value);
 for(const value of ['transparent','data:image/png;base64,example','rgba(0,0,0,.5)'])assert.equal(darkColor(value),value);
});
test('both portal entry and authenticated pages preserve nonce scripts and expose translated theme controls without injecting untrusted names',async()=>{
 const {managerLoginPage,managerPortalPage}=await import('../server/cloudflare/manager-pages.mjs'),{loginPage,recoveryPage}=await import('../server/cloudflare/admin-panel.mjs');
 const pages=[];for(const language of ['pt','en','es'])pages.push(managerLoginPage('appearance-nonce','csrf','',language),managerPortalPage('appearance-nonce',{user:{id:'synthetic',name:'<script>untrusted()</script>'},client:{name:'A & B'}},language),loginPage('appearance-nonce','','csrf',language));
 for(const content of pages){assert.match(content,/data-theme-choice="light"/);assert.match(content,/data-theme-choice="dark"/);assert.match(content,/position:sticky;top:0/);assert.match(content,/html\[data-theme=dark\]/);assert.ok(!content.includes('<script>untrusted()</script>'));for(const match of content.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){assert.match(match[1],/^ nonce=['"]appearance-nonce['"]$/);new Script(match[2]);}}
 assert.equal(typeof recoveryPage,'function');
});

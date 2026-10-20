// Credentials stay in the existing form. Only an explicit, server-declared
// stale CSRF rejection may repeat the POST once; wrong passwords never retry.
export function loginRefreshScript(entry, stale = false) {
  const selector = `form[action="${entry}/login"]`;
  return `(()=>{
const loginForm=document.querySelector(${JSON.stringify(selector)});
if(!loginForm)return;
const entry=${JSON.stringify(entry)},selector=${JSON.stringify(selector)},submitButton=loginForm.querySelector('button[type="submit"]');let submitting=false,blockedUntil=0,retryTimer;
let notice=loginForm.parentElement.querySelector('[role="alert"],#login-message');
if(${JSON.stringify(stale)}&&notice)notice.textContent='';
function show(message){if(!notice){notice=document.createElement('p');notice.className='error';loginForm.after(notice)}notice.setAttribute('role','alert');notice.textContent=message}
function release(){submitting=false;if(submitButton)submitButton.disabled=Date.now()<blockedUntil}
function cooldown(seconds){blockedUntil=Date.now()+seconds*1000;clearInterval(retryTimer);function tick(){const count=Math.max(0,Math.ceil((blockedUntil-Date.now())/1000));show(count?tr('Muitas tentativas. Tente novamente em {count} segundos.',{count}):tr('Você já pode tentar novamente.'));if(submitButton)submitButton.disabled=count>0;if(!count)clearInterval(retryTimer)}tick();retryTimer=setInterval(tick,1000)}
loginForm.addEventListener('submit',async event=>{
if(event.defaultPrevented)return;
event.preventDefault();if(submitting||submitButton?.disabled||Date.now()<blockedUntil)return;submitting=true;if(submitButton)submitButton.disabled=true;if(notice)notice.textContent='';
try{
for(let attempt=0;attempt<2;attempt++){
const challenge=await fetch(entry,{credentials:'same-origin',cache:'no-store',headers:{Accept:'text/html'}});
if(!challenge.ok)throw Error();
const fresh=new DOMParser().parseFromString(await challenge.text(),'text/html'),token=fresh.querySelector(selector+' input[name="csrf"]')?.value;
if(!token&&fresh.querySelector('#logout')){location.replace(entry);return}
if(!token||!/^[a-f0-9-]{36}$/.test(token))throw Error();
loginForm.elements.namedItem('csrf').value=token;
const response=await fetch(entry+'/login',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{Accept:'text/html'},body:new URLSearchParams(new FormData(loginForm))});
if(response.status===403&&response.headers.get('X-Bistro-Login-Retry')==='csrf')continue;
const result=new DOMParser().parseFromString(await response.text(),'text/html');
if(response.ok&&result.querySelector('#logout')){location.replace(entry);return}
if(!result.querySelector(selector))throw Error();
const message=result.querySelector('[role="alert"],#login-message')?.textContent.trim();if(!message)throw Error();show(message);
const seconds=Number(response.headers.get('Retry-After'));if(response.status===429&&Number.isInteger(seconds)&&seconds>0&&seconds<=86400)cooldown(seconds);
release();return;
}
throw Error();
}catch{show(tr('Não foi possível entrar. Confira a conexão e tente novamente.'));release()}
});
// POST responses already open in a tab must reload through the entry GET.
if(location.pathname===entry+'/login')history.replaceState(null,'',entry);
addEventListener('pageshow',event=>{if(event.persisted){submitting=false;release()}});
})();`;
}

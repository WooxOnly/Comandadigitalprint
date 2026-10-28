import { LOGIN_ERRORS, loginStatusMessage } from './login-errors.mjs';
// Credentials stay in the existing form. Only an explicit, server-declared
// stale CSRF rejection may repeat the POST once; wrong passwords never retry.
export function loginRefreshScript(entry, stale = false, destination = entry) {
  const selector = `form[action="${entry}/login"]`;
  return `(()=>{
const loginForm=document.querySelector(${JSON.stringify(selector)});
if(!loginForm)return;
const destination=${JSON.stringify(destination)},entry=${JSON.stringify(entry)},selector=${JSON.stringify(selector)},submitButton=loginForm.querySelector('button[type="submit"]');let submitting=false,blockedUntil=0,retryTimer;
const LOGIN_ERRORS=${JSON.stringify(LOGIN_ERRORS)},loginStatusMessage=${loginStatusMessage.toString()};
let notice=loginForm.parentElement.querySelector('[role="alert"],#login-message');
if(${JSON.stringify(stale)}&&notice)notice.textContent='';
function show(message){if(!notice){notice=document.createElement('p');notice.className='error';loginForm.after(notice)}notice.setAttribute('role','alert');notice.textContent=message}
function release(){submitting=false;if(submitButton)submitButton.disabled=Date.now()<blockedUntil}
function cooldown(seconds){blockedUntil=Date.now()+seconds*1000;clearInterval(retryTimer);function tick(){const count=Math.max(0,Math.ceil((blockedUntil-Date.now())/1000));show(count?tr('Muitas tentativas. Tente novamente em {count} segundos.',{count}):tr('Você já pode tentar novamente.'));if(submitButton)submitButton.disabled=count>0;if(!count)clearInterval(retryTimer)}tick();retryTimer=setInterval(tick,1000)}
function loginFailure(message){return Object.assign(new Error(),{loginMessage:message})}
async function readLogin(url,options={}){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);try{const response=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{Accept:'text/html'},...options,signal:controller.signal});return{response,text:await response.text()}}catch{throw loginFailure(controller.signal.aborted?LOGIN_ERRORS.timeout:navigator.onLine===false?LOGIN_ERRORS.offline:LOGIN_ERRORS.network)}finally{clearTimeout(timer)}}
function showFailure(response){if(response.headers.get('X-Bistro-Login-Error')==='service_limit'){show(tr(LOGIN_ERRORS.limit));return}const seconds=Number(response.headers.get('Retry-After'));if(response.status===429&&Number.isInteger(seconds)&&seconds>0&&seconds<=86400)cooldown(seconds);else show(tr(loginStatusMessage(response.status,entry,LOGIN_ERRORS)))}
loginForm.noValidate=true;
loginForm.addEventListener('submit',async event=>{
if(event.defaultPrevented)return;
event.preventDefault();if(submitting||submitButton?.disabled||Date.now()<blockedUntil)return;
const username=loginForm.elements.namedItem('username'),password=loginForm.elements.namedItem('password');if(!username.value.trim()){show(tr(entry==='/admin'?'Informe seu usuário ou e-mail.':'Informe seu e-mail.'));username.focus();return}if(username.validity.typeMismatch){show(tr('Informe um e-mail válido.'));username.focus();return}if(!password.value){show(tr('Informe sua senha.'));password.focus();return}if(!loginForm.checkValidity()){show(tr(LOGIN_ERRORS.form));return}
submitting=true;if(submitButton)submitButton.disabled=true;if(notice)notice.textContent='';
try{
for(let attempt=0;attempt<2;attempt++){
const challengeResult=await readLogin(entry),challenge=challengeResult.response;
if(!challenge.ok){showFailure(challenge);release();return}
const fresh=new DOMParser().parseFromString(challengeResult.text,'text/html'),token=fresh.querySelector(selector+' input[name="csrf"]')?.value;
if(!token&&fresh.querySelector('#logout')){location.replace(destination);return}
if(!token||!/^[a-f0-9-]{36}$/.test(token))throw loginFailure(LOGIN_ERRORS.unexpected);
loginForm.elements.namedItem('csrf').value=token;
const resultResponse=await readLogin(entry+'/login',{method:'POST',body:new URLSearchParams(new FormData(loginForm))}),response=resultResponse.response;
if(response.status===403&&response.headers.get('X-Bistro-Login-Retry')==='csrf')continue;
if(!response.ok){showFailure(response);release();return}
const result=new DOMParser().parseFromString(resultResponse.text,'text/html');
if(response.ok&&(result.querySelector('#logout')||(destination!==entry&&response.url===new URL(destination,location.origin).href))){location.replace(destination);return}
throw loginFailure(result.querySelector(selector)?LOGIN_ERRORS.session:LOGIN_ERRORS.unexpected);
}
throw loginFailure(LOGIN_ERRORS.session);
}catch(error){show(tr(error.loginMessage||LOGIN_ERRORS.unexpected));release()}
});
// POST responses already open in a tab must reload through the entry GET.
if(location.pathname===entry+'/login')history.replaceState(null,'',entry);
addEventListener('pageshow',event=>{if(event.persisted){submitting=false;release()}});
})();`;
}

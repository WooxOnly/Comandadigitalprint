// Renew only the anonymous form challenge. Credentials stay in the form and
// are submitted once through the normal, protected login endpoint.
export function loginRefreshScript(entry) {
  const selector = `form[action="${entry}/login"]`;
  return `(()=>{
const loginForm=document.querySelector(${JSON.stringify(selector)});
if(!loginForm)return;
const submitButton=loginForm.querySelector('button[type="submit"]');let submitting=false;
loginForm.addEventListener('submit',async event=>{
if(event.defaultPrevented)return;
event.preventDefault();if(submitting||submitButton?.disabled)return;submitting=true;if(submitButton)submitButton.disabled=true;
let notice=loginForm.parentElement.querySelector('[role="alert"],#login-message');if(notice)notice.textContent='';
try{
const response=await fetch(${JSON.stringify(entry)},{credentials:'same-origin',cache:'no-store',headers:{Accept:'text/html'}});
if(!response.ok)throw Error();
const fresh=new DOMParser().parseFromString(await response.text(),'text/html'),token=fresh.querySelector(${JSON.stringify(selector + ' input[name="csrf"]')})?.value;
if(!token&&fresh.querySelector('#logout')){location.replace(${JSON.stringify(entry)});return}
if(!token||!/^[a-f0-9-]{36}$/.test(token))throw Error();
loginForm.elements.namedItem('csrf').value=token;
HTMLFormElement.prototype.submit.call(loginForm);
}catch{
if(!notice){notice=document.createElement('p');notice.className='error';notice.setAttribute('role','alert');loginForm.after(notice)}
notice.textContent=tr('Não foi possível entrar. Confira a conexão e tente novamente.');submitting=false;if(submitButton)submitButton.disabled=false;
}
});
})();`;
}

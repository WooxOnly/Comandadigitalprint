import { digest, hex, loginLimitKey } from './manager-auth.mjs';
import { invitationConfiguration, normalizeEmail, validEmail } from './manager-invitations.mjs';
import { translate } from './manager-i18n.mjs';
const TTL=15*60*1000, encode=value=>new TextEncoder().encode(value);
const hashToken=async token=>hex(await crypto.subtle.digest('SHA-256',encode(token)));
const invalid=()=>({status:400,message:'Link de recuperação inválido ou expirado. Solicite um novo link.'});
async function allow(env,key,maximum,window,now){return !!await env.DB.prepare(`INSERT INTO manager_recovery_limits(key,attempts,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN reset_at<=? THEN 1 ELSE attempts+1 END,reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END WHERE reset_at<=? OR attempts<? RETURNING attempts`).bind(key,now+window,now,now,now,maximum).first()}
export async function requestManagerRecovery(request,env,input,language,now=Date.now(),fetcher=fetch,context){
 const config=invitationConfiguration(env);
 if(!config)return{status:503,message:'A recuperação por e-mail ainda não está disponível. Tente novamente mais tarde.'};
 const email=normalizeEmail(input);
 if(!validEmail(email))return{status:400,message:'Informe um e-mail válido.'};
 const limitKey=await loginLimitKey(request,'manager-recovery-request');
 if(!await allow(env,limitKey,5,TTL,now))return{status:429,message:'Muitas solicitações de recuperação. Tente novamente mais tarde.',retryAfter:900};
 const response={status:200,message:'Se os dados corresponderem ao cadastro, enviaremos um link de recuperação para o e-mail cadastrado.',success:true};
 const user=await env.DB.prepare(`SELECT u.id,u.username,u.revision,u.client_id,c.revision AS client_revision FROM manager_users u JOIN manager_clients c ON c.id=u.client_id WHERE lower(u.username)=? AND u.active=1 AND c.active=1`).bind(email).first();
 if(!user||!await allow(env,'manager-email:'+user.id,3,60*60*1000,now))return response;
 const token=hex(crypto.getRandomValues(new Uint8Array(32))),hash=await hashToken(token);
 await env.DB.prepare(`INSERT INTO manager_password_recovery(user_id,token_hash,password_revision,client_id,client_revision,expires_at) SELECT u.id,?,u.revision,u.client_id,c.revision,? FROM manager_users u JOIN manager_clients c ON c.id=u.client_id WHERE u.id=? AND u.revision=? AND u.active=1 AND c.active=1 AND c.revision=? ON CONFLICT(user_id) DO UPDATE SET token_hash=excluded.token_hash,password_revision=excluded.password_revision,client_id=excluded.client_id,client_revision=excluded.client_revision,expires_at=excluded.expires_at,used_at=NULL`).bind(hash,now+TTL,user.id,user.revision,user.client_revision).run();
 const deliver=async()=>{
  let status=null;
  try{
   const text=[translate(language,'Use este link para redefinir a senha do painel BistroHub:'),config.origin+'/gestor/reset-password#token='+token,translate(language,'O link expira em 15 minutos e pode ser usado uma única vez.'),translate(language,'Se você não solicitou esta alteração, ignore este e-mail. Sua senha permanece a mesma.')].join('\n\n');
   const subject=translate(language,'Redefinição de senha · BistroHub'),brevo=config.provider==='brevo';
   const result=await fetcher(brevo?'https://api.brevo.com/v3/smtp/email':'https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(10000),headers:brevo?{'api-key':config.apiKey,'Content-Type':'application/json'}:{Authorization:'Bearer '+config.apiKey,'Content-Type':'application/json','Idempotency-Key':'bistro-manager-reset-'+hash},body:JSON.stringify(brevo?{sender:{email:config.from,name:'BistroHub'},to:[{email:user.username}],subject,textContent:text}:{from:config.from,to:[user.username],subject,text})});
   status=result.status;if(!result.ok)throw Error();
  }catch{await env.DB.prepare('DELETE FROM manager_password_recovery WHERE user_id=? AND token_hash=?').bind(user.id,hash).run();console.error('BistroHub manager recovery delivery failed',{provider:config.provider,status})}
 };
 if(context?.waitUntil)context.waitUntil(deliver());else await deliver();
 return response;
}
export async function resetManagerPassword(request,env,token,password,now=Date.now()){
 if(!await allow(env,await loginLimitKey(request,'manager-recovery-reset'),10,TTL,now))return{status:429,message:'Muitas solicitações de recuperação. Tente novamente mais tarde.',retryAfter:900};
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return invalid();
 if(typeof password!=='string'||password.length<8||password.length>256)return{status:400,message:'A nova senha deve ter pelo menos 8 caracteres.'};
 const hash=await hashToken(token);
 const valid=await env.DB.prepare(`SELECT r.user_id,u.username FROM manager_password_recovery r JOIN manager_users u ON u.id=r.user_id JOIN manager_clients c ON c.id=u.client_id WHERE r.token_hash=? AND r.used_at IS NULL AND r.expires_at>? AND u.active=1 AND c.active=1 AND u.revision=r.password_revision AND u.client_id=r.client_id AND c.revision=r.client_revision`).bind(hash,now).first();
 if(!valid)return invalid();
 const salt=hex(crypto.getRandomValues(new Uint8Array(16))),passwordHash=await digest(password,salt);
 const result=await env.DB.batch([
  env.DB.prepare(`UPDATE manager_users SET salt=?,hash=?,revision=revision+1 WHERE id=? AND active=1 AND EXISTS(SELECT 1 FROM manager_password_recovery r JOIN manager_clients c ON c.id=manager_users.client_id WHERE r.user_id=manager_users.id AND r.token_hash=? AND r.used_at IS NULL AND r.expires_at>? AND r.password_revision=manager_users.revision AND r.client_id=manager_users.client_id AND r.client_revision=c.revision AND c.active=1) RETURNING id`).bind(salt,passwordHash,valid.user_id,hash,now),
  env.DB.prepare(`UPDATE manager_password_recovery SET used_at=?,token_hash=NULL WHERE user_id=? AND token_hash=? AND used_at IS NULL AND EXISTS(SELECT 1 FROM manager_users u WHERE u.id=manager_password_recovery.user_id AND u.salt=? AND u.hash=? AND u.revision=manager_password_recovery.password_revision+1) RETURNING user_id`).bind(now,valid.user_id,hash,salt,passwordHash),
  env.DB.prepare(`UPDATE manager_user_invitations SET needs_password=0,token_hash=NULL,used_at=?,delivery_status='accepted' WHERE user_id=? AND EXISTS(SELECT 1 FROM manager_users u WHERE u.id=? AND u.salt=? AND u.hash=?)`).bind(now,valid.user_id,valid.user_id,salt,passwordHash),
  env.DB.prepare(`DELETE FROM manager_login_limits WHERE key=? AND EXISTS(SELECT 1 FROM manager_users u WHERE u.id=? AND u.salt=? AND u.hash=?)`).bind(await loginLimitKey(request,valid.username),valid.user_id,salt,passwordHash),
 ]);
 if(result[0].results?.length!==1||result[1].results?.length!==1)return invalid();
 return{status:200,success:true,message:'Senha alterada. Entre com seu e-mail e a nova senha.'};
}

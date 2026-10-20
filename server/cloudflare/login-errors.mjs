// User-facing categories only: never expose infrastructure errors or account existence.
export const LOGIN_ERRORS = {
  limit:'O limite diário do serviço foi atingido. Tente novamente mais tarde.',
  unavailable:'O serviço de acesso está temporariamente indisponível. Tente novamente em instantes.',
  offline:'Você está sem conexão. Reconecte-se e tente novamente.',
  network:'A conexão com o portal foi interrompida. Tente novamente.',
  timeout:'O portal demorou para responder. Tente novamente.',
  unexpected:'O portal enviou uma resposta inesperada. Atualize a página e tente novamente.',
  session:'Não foi possível validar a sessão. Permita cookies para este site, atualize a página e tente novamente.',
  form:'Confira os dados informados e tente novamente.',
  size:'Os dados de acesso excedem o tamanho permitido. Confira os campos e tente novamente.',
  rate:'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
};
export const LOGIN_ERROR_TRANSLATIONS = {
  [LOGIN_ERRORS.limit]:['The service has reached its daily limit. Please try again later.','El servicio alcanzó su límite diario. Inténtalo de nuevo más tarde.'],
  [LOGIN_ERRORS.unavailable]:['The sign-in service is temporarily unavailable. Please try again shortly.','El servicio de acceso no está disponible temporalmente. Inténtalo de nuevo en unos momentos.'],
  [LOGIN_ERRORS.offline]:['You are offline. Reconnect and try again.','No tienes conexión. Vuelve a conectarte e inténtalo de nuevo.'],
  [LOGIN_ERRORS.network]:['The connection to the portal was interrupted. Please try again.','Se interrumpió la conexión con el portal. Inténtalo de nuevo.'],
  [LOGIN_ERRORS.timeout]:['The portal took too long to respond. Please try again.','El portal tardó demasiado en responder. Inténtalo de nuevo.'],
  [LOGIN_ERRORS.unexpected]:['The portal sent an unexpected response. Refresh the page and try again.','El portal envió una respuesta inesperada. Actualiza la página e inténtalo de nuevo.'],
  [LOGIN_ERRORS.session]:['Your session could not be verified. Allow cookies for this site, refresh the page and try again.','No se pudo verificar la sesión. Permite las cookies para este sitio, actualiza la página e inténtalo de nuevo.'],
  [LOGIN_ERRORS.form]:['Check the information you entered and try again.','Revisa los datos introducidos e inténtalo de nuevo.'],
  [LOGIN_ERRORS.size]:['The sign-in information exceeds the allowed size. Check the fields and try again.','Los datos de acceso superan el tamaño permitido. Revisa los campos e inténtalo de nuevo.'],
  [LOGIN_ERRORS.rate]:['Too many attempts. Wait a few minutes and try again.','Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'],
};
export function loginStatusMessage(status,entry,messages){
  if(status>=500)return messages.unavailable;
  if(status===429)return messages.rate;
  if(status===401)return entry==='/admin'?'Usuário ou senha incorretos.':'E-mail ou senha incorretos.';
  if(status===403)return messages.session;
  if(status===413)return messages.size;
  if([400,422].includes(status))return messages.form;
  return messages.unexpected;
}

export const dailyServiceLimit=error=>/daily.*(?:read|row)|(?:read|row).*daily.*limit/i.test(String(error?.message||'')+' '+String(error?.cause?.message||''));

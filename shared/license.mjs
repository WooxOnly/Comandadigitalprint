export const LICENSE_DAY = 86400000;
export function nextLicenseMonth(value, anchorDay = new Date(value).getUTCDate()) {
  const date = new Date(value), month = date.getUTCMonth() + 1;
  const last = new Date(Date.UTC(date.getUTCFullYear(), month + 1, 0)).getUTCDate();
  return Date.UTC(date.getUTCFullYear(), month, Math.min(anchorDay, last), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds());
}
export function licenseState(value, now) {
  if (!value) return 'unverified';
  if (value.status === 'blocked') return 'blocked';
  return value.expiresAt > now ? 'active' : 'expired';
}
export function validLicenseClaim(value) {
  return !!value && value.version === 1 && ['snapshot', 'offline'].includes(value.kind)
    && typeof value.audience === 'string' && value.audience.startsWith('https://')
    && typeof value.clientId === 'string' && value.clientId.length > 0 && value.clientId.length <= 80
    && typeof value.storeId === 'string' && /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(value.storeId)
    && typeof value.deviceId === 'string' && /^[a-f0-9-]{36}$/.test(value.deviceId)
    && ['active', 'blocked'].includes(value.status) && Number.isSafeInteger(value.revision) && value.revision > 0
    && Number.isSafeInteger(value.issuedAt) && value.issuedAt > 0
    && Number.isSafeInteger(value.expiresAt) && value.expiresAt > 0;
}
export function encodeLicenseClaim(value) {
  // ASCII JSON avoids platform-specific base64/UTF-8 codecs in offline codes.
  return JSON.stringify(value).replace(/[\u007f-\uffff]/g, char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'));
}
export function decodeLicenseCode(code) {
  if (typeof code !== 'string' || code.length > 4096) throw Error('INVALID_LICENSE');
  const [prefix, encoded, signature, extra] = code.trim().split('.');
  if (prefix !== 'BH1' || extra !== undefined || !/^[a-f0-9]{2,3000}$/.test(encoded || '') || encoded.length % 2 || !/^[a-f0-9]{128}$/.test(signature || '')) throw Error('INVALID_LICENSE');
  const payload = encoded.replace(/../g, pair => String.fromCharCode(parseInt(pair, 16)));
  const claim = JSON.parse(payload);
  if (!validLicenseClaim(claim)) throw Error('INVALID_LICENSE');
  return { claim, payload, signature };
}

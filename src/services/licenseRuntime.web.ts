import * as SecureStore from './platformSecureStore';
import { randomUUID } from 'expo-crypto';
import { hexToBytes } from '@noble/hashes/utils.js';
import publicKey from '../config/license-public-key.json';
import { ADMIN_CREDENTIAL_ENDPOINT } from '../config/auth';
import { getStoreId } from '../config/store';
import { createLicenseService } from './license';
import { decodeLicenseCode, LICENSE_DAY } from '../../shared/license.mjs';

const subtle = globalThis.crypto.subtle;
const DEVICE_KEY = 'bistrohub.license.device.v1';
let identity: Promise<string> | undefined;
export function licenseTabletId() {
  if (!identity) identity = (async () => {
    const saved = await SecureStore.getItemAsync(DEVICE_KEY);
    if (saved) { if (!/^[a-f0-9-]{36}$/.test(saved)) throw Error('INVALID_DEVICE'); return saved; }
    const id = randomUUID(); await SecureStore.setItemAsync(DEVICE_KEY, id); return id;
  })().catch(error => { identity = undefined; throw error; });
  return identity;
}
async function verifyLicense(payload: string, signature: string) {
  const configuredKey = process.env.EXPO_PUBLIC_WEB_LICENSE_PUBLIC_KEY ? JSON.parse(process.env.EXPO_PUBLIC_WEB_LICENSE_PUBLIC_KEY) : publicKey;
  const key = await subtle.importKey('jwk', { ...configuredKey, kty: 'EC' as const }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  return subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, hexToBytes(signature) as Uint8Array<ArrayBuffer>, new TextEncoder().encode(payload));
}
export async function offlineLicenseForLink(code: string) {
  const { claim, payload, signature } = decodeLicenseCode(code);
  if (claim.kind !== 'offline' || claim.audience !== new URL(ADMIN_CREDENTIAL_ENDPOINT).origin || claim.deviceId !== await licenseTabletId() || claim.expiresAt <= Math.max(Date.now(), claim.issuedAt) || claim.expiresAt > claim.issuedAt + 31 * LICENSE_DAY || !await verifyLicense(payload, signature)) throw Error('INVALID_LICENSE');
  return claim;
}
let instance: ReturnType<typeof createLicenseService> | undefined;
export function tabletLicenseService() {
  if (!instance) {
    instance = createLicenseService({
      storage: { getItem: SecureStore.getItemAsync, setItem: SecureStore.setItemAsync },
      deviceKey: DEVICE_KEY, storeId: getStoreId(), audience: new URL(ADMIN_CREDENTIAL_ENDPOINT).origin, uuid: randomUUID,
      verify: verifyLicense,
    });
  }
  return instance;
}

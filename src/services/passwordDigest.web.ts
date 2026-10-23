import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
export async function passwordDigest(password: string, salt: string, iterations: number): Promise<string> {
  if (!Number.isSafeInteger(iterations) || iterations < 1) throw Error('INVALID_ITERATIONS');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: hexToBytes(salt) as Uint8Array<ArrayBuffer>, iterations, hash: 'SHA-256' }, key, 256);
  return bytesToHex(new Uint8Array(bits));
}

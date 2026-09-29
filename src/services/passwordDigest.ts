import { pbkdf2 } from 'react-native-quick-crypto';
import { hexToBytes, bytesToHex } from '@noble/hashes/utils.js';

// Native async PBKDF2 keeps the UI thread free and reads existing hashes unchanged.
export function passwordDigest(password: string, salt: string, iterations: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('A verificação demorou demais. Tente novamente.')), 10000);
    try {
      pbkdf2(password, hexToBytes(salt), iterations, 32, 'sha256', (error, key) => {
        clearTimeout(timer);
        if (error || !key) reject(new Error('Não foi possível verificar a senha. Tente novamente.'));
        else resolve(bytesToHex(new Uint8Array(key)));
      });
    } catch {
      clearTimeout(timer);
      reject(new Error('Não foi possível verificar a senha. Tente novamente.'));
    }
  });
}

export type LicenseClaim = { version: 1; kind: 'snapshot' | 'offline'; audience: string; clientId: string; storeId: string; deviceId: string; status: 'active' | 'blocked'; revision: number; issuedAt: number; expiresAt: number };
export const LICENSE_DAY: number;
export function nextLicenseMonth(value: number, anchorDay?: number): number;
export function licenseState(value: Pick<LicenseClaim, 'status' | 'expiresAt'> | null, now: number): 'unverified' | 'blocked' | 'active' | 'expired';
export function validLicenseClaim(value: unknown): value is LicenseClaim;
export function encodeLicenseClaim(value: LicenseClaim): string;
export function decodeLicenseCode(code: string): { claim: LicenseClaim; payload: string; signature: string };

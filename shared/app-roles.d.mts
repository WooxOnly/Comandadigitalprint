export type AppRole = 'admin' | 'manager' | 'cashier' | 'cook';
export const APP_ROLES: readonly AppRole[];
export const ROLE_LABELS: Record<AppRole, string>;
export function validRole(role: unknown): role is AppRole;
export function appRole(username: string, role?: unknown): AppRole | null;
export function roleScreen(role: string | null, screen: string, modules?: { preorders: boolean; cash: boolean; customers?: boolean; preparation?: boolean }): boolean;
export function pathScreen(path: string): string;
export function roleAction(role: string | null, action: string): boolean;
export function roleWrite(role: string | null, key: string, value?: unknown): boolean;

export function roleRead(role: string | null, key: string): boolean;

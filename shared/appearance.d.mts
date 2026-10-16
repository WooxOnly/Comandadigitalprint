export function validTheme(value: unknown): value is 'light' | 'dark';
export const THEME_STORAGE_KEY: string;
export function darkColor(value: string, property?: string): string;

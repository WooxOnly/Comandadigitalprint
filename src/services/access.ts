export type AccessAction = 'menu' | 'settings' | 'reprint' | 'restore';
export type AccessSettings = Record<AccessAction, string[] | null>;

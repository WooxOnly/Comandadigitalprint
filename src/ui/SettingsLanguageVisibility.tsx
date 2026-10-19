import { createContext } from 'react';
// Presentation only: the protected Settings screen mounts after local authorization.
export const SettingsLanguageVisibility = createContext<(visible: boolean) => void>(() => {});

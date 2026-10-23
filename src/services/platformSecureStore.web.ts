import { browserVault } from './browserVault';
export const getItemAsync = (name: string) => browserVault.getItem('secure:' + name);
export const setItemAsync = (name: string, value: string) => browserVault.setItem('secure:' + name, value);
export const deleteItemAsync = (name: string) => browserVault.removeItem('secure:' + name);

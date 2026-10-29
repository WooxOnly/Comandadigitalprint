import type { AlertButton, AlertOptions } from 'react-native';
export type WebAlert = { id: number; title: string; message: string; buttons: AlertButton[]; options?: AlertOptions };
let serial = 0;
let queue: WebAlert[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
export const alertStore = {
 subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
 clear() { queue = []; emit(); },
 snapshot: () => queue[0] || null,
 choose(id: number, index: number) {
  const active = queue[0]; if (!active || active.id !== id || !active.buttons[index]) return;
  queue = queue.slice(1); emit(); active.buttons[index].onPress?.();
 },
 dismiss(id: number) {
  const active = queue[0]; if (!active || active.id !== id || !active.options?.cancelable) return;
  queue = queue.slice(1); emit(); active.options.onDismiss?.();
 },
};
export const Alert = {
 alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
  queue = [...queue, { id: ++serial, title, message: message || '', buttons: buttons?.length ? buttons : [{ text: 'OK' }], options }]; emit();
 },
};

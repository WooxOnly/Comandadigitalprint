// Operational web assets and authenticated APIs are served from the same origin.
// Native builds retain the existing configured environment endpoint.
export const API_BASE_URL = process.env.EXPO_PUBLIC_WEB_APP === '1' && typeof window !== 'undefined'
  ? window.location.origin
  : process.env.EXPO_PUBLIC_API_BASE_URL || 'https://seabra-cardapio.wooxonly-comandas.workers.dev';

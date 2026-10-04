// Fill with the published Cloudflare /menu URL before distributing the next build.
// This address is managed by the project, never entered by restaurant staff.
export const MENU_ENDPOINT = `${process.env.EXPO_PUBLIC_API_BASE_URL || 'https://seabra-cardapio.wooxonly-comandas.workers.dev'}/menu`;

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    if (url.pathname === '/') return Response.redirect(url.origin + '/app/', 302);
    if (url.pathname !== '/app' && !url.pathname.startsWith('/app/')) {
      const api = url.pathname.startsWith('/cloud/') || ['/auth/admin', '/auth/admin/password', '/menu', '/health'].includes(url.pathname);
      if (!api) return new Response(null, { status: 404 });
      if (!env.BACKEND) return new Response(null, { status: 503 });
      // Service bindings preserve the original request origin. In particular,
      // signed licenses must name the web origin rather than another hostname.
      return env.BACKEND.fetch(request);
    }
    if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
    if (!env.WEB_ASSETS) return new Response('Web app unavailable', { status: 503 });
    url.pathname = url.pathname.slice(4) || '/';
    let response = await env.WEB_ASSETS.fetch(new Request(url, request));
    if (response.status === 404 && !/\.[a-z0-9]+$/i.test(url.pathname)) {
      url.pathname = '/index.html'; response = await env.WEB_ASSETS.fetch(new Request(url, request));
    }
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff'); headers.set('Referrer-Policy', 'same-origin');
    headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    if (headers.get('Content-Type')?.includes('text/html')) headers.set('Cache-Control', 'no-store');
    return new Response(request.method === 'HEAD' ? null : response.body, { status: response.status, headers });
  },
};

/**
 * Cloudflare Pages -> Railway API proxy.
 *
 * The React frontend keeps using /api/*, while the real Express API runs on
 * Railway. Set API_ORIGIN in Cloudflare Pages environment variables to the
 * Railway service URL (for example https://cornmm-api.up.railway.app).
 *
 * No API secrets belong in this file or in the browser.
 */

interface Env {
  API_ORIGIN?: string;
}

export const onRequest = async ({ request, env }: { request: Request; env: Env }) => {
  const origin = String(env.API_ORIGIN || '').trim().replace(/\/$/, '');

  if (!origin) {
    return new Response(
      JSON.stringify({ error: 'API_ORIGIN is not configured on Cloudflare Pages.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const incoming = new URL(request.url);
  const target = new URL(`${origin}${incoming.pathname}${incoming.search}`);

  // Forward the request body/headers unchanged so video uploads continue to
  // stream through Cloudflare to the Railway Express backend.
  const proxyRequest = new Request(target.toString(), request);
  proxyRequest.headers.set('X-Forwarded-Host', incoming.host);
  proxyRequest.headers.set('X-Forwarded-Proto', incoming.protocol.replace(':', ''));

  const response = await fetch(proxyRequest);

  // Return the Railway response to the browser. The browser sees the
  // Cloudflare Pages origin, so no public API CORS configuration is required.
  return response;
};

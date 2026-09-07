/**
 * Cloudflare Pages -> Railway API proxy.
 *
 * The React frontend keeps using /api/* while the real Express API runs on
 * Railway. API_ORIGIN must contain only the Railway origin, for example:
 * https://cornmm-production.up.railway.app
 */

interface Env {
  API_ORIGIN?: string;
}

export const onRequest = async ({ request, env }: { request: Request; env: Env }) => {
  const rawOrigin = String(env.API_ORIGIN || '').trim();

  if (!rawOrigin) {
    return new Response(
      JSON.stringify({ error: 'API_ORIGIN is not configured on Cloudflare Pages.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let origin: URL;
  try {
    origin = new URL(rawOrigin);
    origin.pathname = origin.pathname.replace(/\/$/, '');
    origin.search = '';
    origin.hash = '';
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid API_ORIGIN.', value: rawOrigin }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const incoming = new URL(request.url);
  const target = new URL(`${origin.toString().replace(/\/$/, '')}${incoming.pathname}${incoming.search}`);

  const headers = new Headers(request.headers);
  headers.set('X-Forwarded-Host', incoming.host);
  headers.set('X-Forwarded-Proto', incoming.protocol.replace(':', ''));
  headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '');
  headers.delete('host');

  try {
    const proxyRequest = new Request(target.toString(), {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
    });

    const response = await fetch(proxyRequest);

    // Preserve Railway's status/body/headers while exposing only the proxied
    // response through the Cloudflare Pages origin.
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return new Response(
      JSON.stringify({
        error: 'Cloudflare could not reach the Railway API.',
        target: `${origin.origin}${incoming.pathname}`,
        message,
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      },
    );
  }
};

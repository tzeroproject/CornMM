/**
 * Cloudflare Worker entry point.
 *
 * This replaces the Express server (server.ts) for production on Cloudflare.
 * It only needs to handle /api/* — everything else (the built React app) is
 * served automatically by Cloudflare Workers "Assets" (configured in
 * wrangler.jsonc), because `run_worker_first` is scoped to "/api/*" only.
 *
 * Env vars / secrets must be configured in the Cloudflare dashboard:
 * Workers & Pages -> your project -> Settings -> Variables and Secrets.
 * They arrive here as the `env` object (NOT process.env).
 */

export interface Env {
  VITE_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  BUNNY_API_KEY?: string;
  BUNNY_LIBRARY_ID?: string;
  BUNNY_CDN_HOSTNAME?: string;
  BUNNY_WEBHOOK_KEY?: string;
  ASSETS: Fetcher;
}

const VIEW_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
// NOTE: these two Maps live only in the current Worker isolate's memory.
// They are a best-effort cache (fine for view-dedup / recent audit logs),
// but are NOT guaranteed to persist across requests, deploys, or across
// Cloudflare's many edge locations. For durable storage, move these to a
// Cloudflare KV namespace or D1 database instead.
const viewCache = new Map<string, number>();
const auditLogs: any[] = [];

function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

function clean(v: string | undefined): string {
  return (v || '').trim().replace(/^["']|["']$/g, '');
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    try {
      // ---------------------------------------------------------------
      // Health check
      // ---------------------------------------------------------------
      if (pathname === '/api/health' && method === 'GET') {
        const supabaseUrl = env.VITE_SUPABASE_URL || '';
        const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY || '';
        const hasValidSupabase = Boolean(
          supabaseUrl &&
          supabaseServiceKey &&
          supabaseUrl !== 'https://your-project.supabase.co' &&
          supabaseServiceKey !== 'your-supabase-service-role-key'
        );
        return json({
          status: 'ok',
          timestamp: new Date().toISOString(),
          supabaseConfigured: hasValidSupabase,
          bunnyConfigured: !!(env.BUNNY_API_KEY && env.BUNNY_LIBRARY_ID),
        });
      }

      // ---------------------------------------------------------------
      // 1. BUNNY STREAM INTEGRATION
      // ---------------------------------------------------------------
      if (pathname === '/api/bunny/create-video' && method === 'POST') {
        const body = await request.json().catch(() => ({} as any));
        const { title, collectionId, forceFallback } = body as any;

        const rawApiKey = clean(env.BUNNY_API_KEY);
        const rawLibraryId = clean(env.BUNNY_LIBRARY_ID);
        const cdnHostname = clean(env.BUNNY_CDN_HOSTNAME) || 'vz-cdn.bunnycdn.net';

        const isMissingOrPlaceholder =
          !rawApiKey || !rawLibraryId || rawApiKey === 'your_bunny_api_key' || rawLibraryId === 'your_library_id';

        if (isMissingOrPlaceholder || forceFallback) {
          const simulatedVideoId = 'bny_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
          return json({
            success: true,
            isSimulated: true,
            videoId: simulatedVideoId,
            libraryId: rawLibraryId || 'demo-lib-1234',
            uploadUrl: `/api/bunny/simulated-upload/${simulatedVideoId}`,
            proxyUploadUrl: `/api/bunny/upload/${simulatedVideoId}`,
            cdnHostname,
            message: 'Bunny Stream credentials not set or fallback requested. Running in simulated streaming mode.',
          });
        }

        const bunnyResponse = await fetch(`https://video.bunnycdn.com/library/${rawLibraryId}/videos`, {
          method: 'POST',
          headers: {
            AccessKey: rawApiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ title: title || 'Untitled Video', collectionId: collectionId || undefined }),
        });

        if (!bunnyResponse.ok) {
          const errorText = await bunnyResponse.text();
          let guidance = '';
          if (bunnyResponse.status === 401) {
            guidance =
              'Unauthorized (401). Please check BUNNY_API_KEY. In Bunny.net, you must use the "Library API Key" found under Stream > [Your Library] > API, NOT the Account-level API key.';
          } else if (bunnyResponse.status === 404) {
            guidance =
              'Library Not Found (404). Please check BUNNY_LIBRARY_ID. It must be the numeric ID (e.g. 123456) of your Stream Video Library, not the library name.';
          } else {
            guidance = `Bunny API returned error code ${bunnyResponse.status}: ${errorText}`;
          }
          return json(
            {
              error: 'Failed to create video on Bunny Stream',
              guidance,
              details: errorText,
              statusCode: bunnyResponse.status,
              allowFallback: true,
            },
            { status: bunnyResponse.status }
          );
        }

        const data = (await bunnyResponse.json()) as { guid: string };
        return json({
          success: true,
          videoId: data.guid,
          libraryId: rawLibraryId,
          uploadUrl: `https://video.bunnycdn.com/library/${rawLibraryId}/videos/${data.guid}`,
          proxyUploadUrl: `/api/bunny/upload/${data.guid}`,
          cdnHostname,
        });
      }

      // PUT /api/bunny/upload/:videoId
      {
        const m = pathname.match(/^\/api\/bunny\/upload\/([^/]+)$/);
        if (m && method === 'PUT') {
          const videoId = m[1];
          const apiKey = clean(env.BUNNY_API_KEY);
          const libraryId = clean(env.BUNNY_LIBRARY_ID);

          if (!apiKey || !libraryId || videoId.startsWith('bny_')) {
            return json({ success: true, message: 'Simulated binary video upload accepted.' });
          }

          const bunnyUrl = `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`;
          const contentType = request.headers.get('content-type') || 'application/octet-stream';

          const bunnyUploadRes = await fetch(bunnyUrl, {
            method: 'PUT',
            headers: { AccessKey: apiKey, 'Content-Type': contentType },
            body: request.body,
            // @ts-ignore - required by workerd when streaming a request body through
            duplex: 'half',
          });

          if (!bunnyUploadRes.ok) {
            const errText = await bunnyUploadRes.text();
            return json({ error: 'Bunny upload failed', details: errText }, { status: bunnyUploadRes.status });
          }
          return json({ success: true, videoId });
        }
      }

      // GET /api/bunny/status/:videoId
      {
        const m = pathname.match(/^\/api\/bunny\/status\/([^/]+)$/);
        if (m && method === 'GET') {
          const videoId = m[1];
          const apiKey = clean(env.BUNNY_API_KEY);
          const libraryId = clean(env.BUNNY_LIBRARY_ID);

          if (!apiKey || !libraryId || videoId.startsWith('bny_')) {
            return json({
              videoId,
              statusCode: 4,
              statusText: 'Transcoding Complete',
              encodeProgress: 100,
              hasMP4Fallback: true,
            });
          }

          const response = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, {
            headers: { AccessKey: apiKey, Accept: 'application/json' },
          });
          if (!response.ok) {
            return json({ error: 'Failed to fetch Bunny video status' }, { status: response.status });
          }
          const data = (await response.json()) as any;
          const statusMap: Record<number, string> = {
            0: 'Created', 1: 'Uploaded', 2: 'Processing', 3: 'Transcoding', 4: 'Finished', 5: 'Error', 6: 'Failed',
          };
          return json({
            videoId,
            statusCode: data.status,
            statusText: statusMap[data.status] || 'Unknown',
            encodeProgress: data.encodeProgress || 100,
            hasMP4Fallback: data.hasMP4Fallback || false,
            duration: data.length || 0,
            width: data.width || 1920,
            height: data.height || 1080,
          });
        }
      }

      // PUT /api/bunny/simulated-upload/:videoId
      if (/^\/api\/bunny\/simulated-upload\/[^/]+$/.test(pathname) && method === 'PUT') {
        return json({ success: true, message: 'Video upload processed successfully.' });
      }

      // POST /api/webhooks/bunny
      if (pathname === '/api/webhooks/bunny' && method === 'POST') {
        const webhookSecret = env.BUNNY_WEBHOOK_KEY;
        const authHeader = request.headers.get('authorization') || request.headers.get('x-bunny-webhook-key');
        if (webhookSecret && authHeader !== webhookSecret) {
          return json({ error: 'Unauthorized webhook request' }, { status: 401 });
        }

        const payload = (await request.json().catch(() => ({}))) as any;
        const videoGuid = payload.VideoGuid || payload.videoId || payload.id;
        const status = payload.Status;
        const cdnHostname = env.BUNNY_CDN_HOSTNAME || 'vz-cdn.bunnycdn.net';

        if (!videoGuid) {
          return json({ error: 'Missing VideoGuid in webhook payload' }, { status: 400 });
        }

        if (env.VITE_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
          if (status === 4) {
            await supabaseAdmin
              .from('videos')
              .update({
                moderation_status: 'pending_review',
                thumbnail_url: `https://${cdnHostname}/${videoGuid}/thumbnail.jpg`,
                video_url: `https://${cdnHostname}/${videoGuid}/playlist.m3u8`,
                duration: payload.Length || 0,
                updated_at: new Date().toISOString(),
              })
              .eq('bunny_video_id', videoGuid);
          } else if (status === 5 || status === 6) {
            await supabaseAdmin
              .from('videos')
              .update({
                moderation_status: 'rejected',
                rejection_reason: 'Automated video transcoding error on Bunny Stream.',
                updated_at: new Date().toISOString(),
              })
              .eq('bunny_video_id', videoGuid);
          }
        }

        return json({ success: true, received: true, videoGuid, status });
      }

      // ---------------------------------------------------------------
      // 2. VIEW COUNTER (deduplicated / rate limited by client IP)
      // ---------------------------------------------------------------
      {
        const m = pathname.match(/^\/api\/videos\/([^/]+)\/view$/);
        if (m && method === 'POST') {
          const videoId = m[1];
          const clientIp = request.headers.get('cf-connecting-ip') || '127.0.0.1';
          const cacheKey = `${videoId}_${clientIp}`;
          const now = Date.now();

          const lastViewed = viewCache.get(cacheKey);
          if (lastViewed && now - lastViewed < VIEW_COOLDOWN_MS) {
            return json({ success: false, incremented: false, reason: 'Rate limit: View already recorded recently from this client.' });
          }
          viewCache.set(cacheKey, now);
          if (viewCache.size > 5000) {
            for (const [k, v] of viewCache.entries()) {
              if (now - v > VIEW_COOLDOWN_MS) viewCache.delete(k);
            }
          }

          if (env.VITE_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
            try {
              await supabaseAdmin.rpc('increment_video_view', { p_video_id: videoId });
            } catch {
              try {
                const { data: v } = await supabaseAdmin.from('videos').select('views').eq('id', videoId).single();
                if (v) await supabaseAdmin.from('videos').update({ views: (v.views || 0) + 1 }).eq('id', videoId);
              } catch {}
            }
          }

          return json({ success: true, incremented: true, videoId, timestamp: now });
        }
      }

      // ---------------------------------------------------------------
      // 3. ADMIN AUDIT LOG (in-memory; see note at top of file)
      // ---------------------------------------------------------------
      if (pathname === '/api/admin/audit-log' && method === 'POST') {
        const body = (await request.json().catch(() => ({}))) as any;
        const { adminId, action, targetType, targetId, details } = body;
        const clientIp = request.headers.get('cf-connecting-ip') || '127.0.0.1';

        const logEntry = {
          id: crypto.randomUUID(),
          admin_id: adminId || 'admin-system',
          action,
          target_type: targetType,
          target_id: targetId,
          details: details || {},
          ip_address: String(clientIp),
          created_at: new Date().toISOString(),
        };
        auditLogs.unshift(logEntry);
        if (auditLogs.length > 500) auditLogs.pop();

        if (env.VITE_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && adminId && targetType && targetId) {
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
          try {
            await supabaseAdmin.from('admin_actions').insert([{
              admin_id: adminId, action, target_type: targetType, target_id: targetId,
              details: details || {}, ip_address: String(clientIp),
            }]);
          } catch {}
        }

        return json({ success: true, log: logEntry });
      }

      if (pathname === '/api/admin/audit-logs' && method === 'GET') {
        return json({ logs: auditLogs });
      }

      // Unknown /api/* route
      if (pathname.startsWith('/api/')) {
        return json({ error: 'Not found' }, { status: 404 });
      }

      // Anything else: let Cloudflare Assets handle it (static site / SPA fallback)
      return env.ASSETS.fetch(request);
    } catch (err: any) {
      return json({ error: err?.message || 'Internal server error' }, { status: 500 });
    }
  },
};

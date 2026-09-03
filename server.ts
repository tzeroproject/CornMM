import express from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Supabase Admin Client (server-side only)
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const hasValidSupabase = Boolean(
  supabaseUrl &&
  supabaseServiceKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseServiceKey !== 'your-supabase-service-role-key'
);

const supabaseAdmin = hasValidSupabase ? createClient(supabaseUrl, supabaseServiceKey) : null;

// In-memory view deduplication cache: `${videoId}_${ip}` -> timestamp
const viewCache = new Map<string, number>();
const VIEW_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown per IP per video

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    supabaseConfigured: hasValidSupabase,
    bunnyConfigured: !!(process.env.BUNNY_API_KEY && process.env.BUNNY_LIBRARY_ID),
  });
});

// ============================================================================
// 1. BUNNY STREAM INTEGRATION (Server-Side Only - Keeps API Keys Safe)
// ============================================================================

/**
 * Creates a video object in Bunny Stream and returns upload parameters
 */
app.post('/api/bunny/create-video', async (req, res) => {
  try {
    const { title, collectionId, forceFallback } = req.body;
    const rawApiKey = (process.env.BUNNY_API_KEY || '').trim().replace(/^["']|["']$/g, '');
    const rawLibraryId = (process.env.BUNNY_LIBRARY_ID || '').trim().replace(/^["']|["']$/g, '');
    const cdnHostname = (process.env.BUNNY_CDN_HOSTNAME || 'vz-cdn.bunnycdn.net').trim().replace(/^["']|["']$/g, '');

    const isMissingOrPlaceholder = !rawApiKey || !rawLibraryId || rawApiKey === 'your_bunny_api_key' || rawLibraryId === 'your_library_id';

    if (isMissingOrPlaceholder || forceFallback) {
      const simulatedVideoId = 'bny_' + crypto.randomBytes(8).toString('hex');
      return res.json({
        success: true,
        isSimulated: true,
        videoId: simulatedVideoId,
        libraryId: rawLibraryId || 'demo-lib-1234',
        uploadUrl: `/api/bunny/simulated-upload/${simulatedVideoId}`,
        proxyUploadUrl: `/api/bunny/upload/${simulatedVideoId}`,
        cdnHostname: cdnHostname,
        message: 'Bunny Stream credentials not set or fallback requested. Running in simulated streaming mode.',
      });
    }

    // Real Bunny Stream API call
    const bunnyResponse = await fetch(`https://video.bunnycdn.com/library/${rawLibraryId}/videos`, {
      method: 'POST',
      headers: {
        'AccessKey': rawApiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        title: title || 'Untitled Video',
        collectionId: collectionId || undefined,
      }),
    });

    if (!bunnyResponse.ok) {
      const errorText = await bunnyResponse.text();
      console.error(`[Bunny Stream create video error ${bunnyResponse.status}]:`, errorText);

      let guidance = '';
      if (bunnyResponse.status === 401) {
        guidance = 'Unauthorized (401). Please check BUNNY_API_KEY. In Bunny.net, you must use the "Library API Key" found under Stream > [Your Library] > API, NOT the Account-level API key.';
      } else if (bunnyResponse.status === 404) {
        hint: guidance = 'Library Not Found (404). Please check BUNNY_LIBRARY_ID. It must be the numeric ID (e.g. 123456) of your Stream Video Library, not the library name.';
      } else {
        guidance = `Bunny API returned error code ${bunnyResponse.status}: ${errorText}`;
      }

      return res.status(bunnyResponse.status).json({
        error: 'Failed to create video on Bunny Stream',
        guidance,
        details: errorText,
        statusCode: bunnyResponse.status,
        allowFallback: true,
      });
    }

    const data = (await bunnyResponse.json()) as { guid: string };
    const videoId = data.guid;

    res.json({
      success: true,
      videoId,
      libraryId: rawLibraryId,
      uploadUrl: `https://video.bunnycdn.com/library/${rawLibraryId}/videos/${videoId}`,
      proxyUploadUrl: `/api/bunny/upload/${videoId}`,
      cdnHostname,
    });
  } catch (err: any) {
    console.error('Error in /api/bunny/create-video:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * Server-side stream upload proxy (bypasses browser CORS & protects Bunny credentials)
 */
app.put('/api/bunny/upload/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const apiKey = (process.env.BUNNY_API_KEY || '').trim().replace(/^["']|["']$/g, '');
    const libraryId = (process.env.BUNNY_LIBRARY_ID || '').trim().replace(/^["']|["']$/g, '');

    if (!apiKey || !libraryId || videoId.startsWith('bny_')) {
      return res.json({ success: true, message: 'Simulated binary video upload accepted.' });
    }

    const bunnyUrl = `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`;
    const contentType = req.headers['content-type'] || 'application/octet-stream';

    const bunnyUploadRes = await fetch(bunnyUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': apiKey,
        'Content-Type': contentType,
      },
      body: req as any,
      // @ts-ignore
      duplex: 'half',
    });

    if (!bunnyUploadRes.ok) {
      const errText = await bunnyUploadRes.text();
      return res.status(bunnyUploadRes.status).json({ error: 'Bunny upload failed', details: errText });
    }

    res.json({ success: true, videoId });
  } catch (err: any) {
    console.error('Upload proxy error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Check transcoding and video status on Bunny Stream
 */
app.get('/api/bunny/status/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const apiKey = (process.env.BUNNY_API_KEY || '').trim().replace(/^["']|["']$/g, '');
    const libraryId = (process.env.BUNNY_LIBRARY_ID || '').trim().replace(/^["']|["']$/g, '');

    if (!apiKey || !libraryId || videoId.startsWith('bny_')) {
      return res.json({
        videoId,
        statusCode: 4, // 4 = Finished transcoding
        statusText: 'Transcoding Complete',
        encodeProgress: 100,
        hasMP4Fallback: true,
      });
    }

    const response = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, {
      headers: {
        'AccessKey': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch Bunny video status' });
    }

    const data = (await response.json()) as any;
    const statusMap: Record<number, string> = {
      0: 'Created',
      1: 'Uploaded',
      2: 'Processing',
      3: 'Transcoding',
      4: 'Finished',
      5: 'Error',
      6: 'Failed',
    };

    res.json({
      videoId,
      statusCode: data.status,
      statusText: statusMap[data.status] || 'Unknown',
      encodeProgress: data.encodeProgress || 100,
      hasMP4Fallback: data.hasMP4Fallback || false,
      duration: data.length || 0,
      width: data.width || 1920,
      height: data.height || 1080,
    });
  } catch (err: any) {
    console.error('Error in /api/bunny/status:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * Simulated upload receiver for testing when real Bunny API is not yet supplied
 */
app.put('/api/bunny/simulated-upload/:videoId', (req, res) => {
  res.json({ success: true, message: 'Video upload processed successfully.' });
});

/**
 * Secure Bunny Stream Webhook Receiver
 * Called by Bunny CDN when transcoding finishes or video status updates
 */
app.post('/api/webhooks/bunny', async (req, res) => {
  try {
    const webhookSecret = process.env.BUNNY_WEBHOOK_KEY;
    const authHeader = req.headers['authorization'] || req.headers['x-bunny-webhook-key'];

    // Verify secret if configured
    if (webhookSecret && authHeader !== webhookSecret) {
      return res.status(401).json({ error: 'Unauthorized webhook request' });
    }

    const payload = req.body;
    const videoGuid = payload.VideoGuid || payload.videoId || payload.id;
    const status = payload.Status; // 4 = Finished
    const cdnHostname = process.env.BUNNY_CDN_HOSTNAME || 'vz-cdn.bunnycdn.net';

    if (!videoGuid) {
      return res.status(400).json({ error: 'Missing VideoGuid in webhook payload' });
    }

    if (supabaseAdmin) {
      if (status === 4) {
        // Video transcoding complete!
        await supabaseAdmin
          .from('videos')
          .update({
            moderation_status: 'pending_review', // Ready for moderation
            thumbnail_url: `https://${cdnHostname}/${videoGuid}/thumbnail.jpg`,
            video_url: `https://${cdnHostname}/${videoGuid}/playlist.m3u8`,
            duration: payload.Length || 0,
            updated_at: new Date().toISOString(),
          })
          .eq('bunny_video_id', videoGuid);
      } else if (status === 5 || status === 6) {
        // Failed transcoding
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

    res.json({ success: true, received: true, videoGuid, status });
  } catch (err: any) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 2. VIEW COUNTER SYSTEM (Server-Side, Deduplicated & Rate-Limited)
// ============================================================================
app.post('/api/videos/:id/view', async (req, res) => {
  try {
    const videoId = req.params.id;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const cacheKey = `${videoId}_${clientIp}`;
    const now = Date.now();

    const lastViewed = viewCache.get(cacheKey);
    if (lastViewed && now - lastViewed < VIEW_COOLDOWN_MS) {
      return res.json({
        success: false,
        incremented: false,
        reason: 'Rate limit: View already recorded recently from this client.',
      });
    }

    // Record view in memory cooldown cache
    viewCache.set(cacheKey, now);

    // Clean up old cache entries
    if (viewCache.size > 5000) {
      for (const [k, v] of viewCache.entries()) {
        if (now - v > VIEW_COOLDOWN_MS) {
          viewCache.delete(k);
        }
      }
    }

    // Execute atomic increment in database if Supabase is connected
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.rpc('increment_video_view', { p_video_id: videoId });
      } catch (dbErr) {
        // Fallback to direct increment if RPC is missing
        try {
          const { data: v } = await supabaseAdmin.from('videos').select('views').eq('id', videoId).single();
          if (v) {
            await supabaseAdmin.from('videos').update({ views: (v.views || 0) + 1 }).eq('id', videoId);
          }
        } catch {}
      }
    }

    return res.json({
      success: true,
      incremented: true,
      videoId,
      timestamp: now,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 3. ADMIN AUDIT LOG RECORDER
// ============================================================================
const auditLogs: any[] = [];
app.post('/api/admin/audit-log', async (req, res) => {
  try {
    const { adminId, action, targetType, targetId, details } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

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

    // Persist to Supabase admin_actions table
    if (supabaseAdmin && adminId && targetType && targetId) {
      try {
        await supabaseAdmin.from('admin_actions').insert([{
          admin_id: adminId,
          action,
          target_type: targetType,
          target_id: targetId,
          details: details || {},
          ip_address: String(clientIp),
        }]);
      } catch (dbErr) {
        console.warn('Could not persist audit log to DB:', dbErr);
      }
    }

    res.json({ success: true, log: logEntry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/audit-logs', (req, res) => {
  res.json({ logs: auditLogs });
});

// ============================================================================
// 4. VITE MIDDLEWARE SETUP
// ============================================================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StreamSphere server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

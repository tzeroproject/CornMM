import express from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory view deduplication cache: `${videoId}_${ip}` -> timestamp
const viewCache = new Map<string, number>();
const VIEW_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown per IP per video

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    supabaseConfigured: !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
    bunnyConfigured: !!(process.env.BUNNY_API_KEY && process.env.BUNNY_LIBRARY_ID),
  });
});

// ============================================================================
// 1. BUNNY STREAM INTEGRATION (Server-Side Only - Keeps API Keys Safe)
// ============================================================================

/**
 * Creates a video object in Bunny Stream and returns direct upload credentials
 */
app.post('/api/bunny/create-video', async (req, res) => {
  try {
    const { title, collectionId } = req.body;
    const apiKey = process.env.BUNNY_API_KEY;
    const libraryId = process.env.BUNNY_LIBRARY_ID;
    const cdnHostname = process.env.BUNNY_CDN_HOSTNAME || 'vz-cdn.bunnycdn.net';

    if (!apiKey || !libraryId) {
      // In development or when credentials are not yet configured, return simulated successful response
      // with clear indicators, so testing the full upload flow works smoothly!
      const simulatedVideoId = 'bny_' + crypto.randomBytes(8).toString('hex');
      return res.json({
        success: true,
        isSimulated: true,
        videoId: simulatedVideoId,
        libraryId: libraryId || 'demo-lib-1234',
        uploadUrl: `/api/bunny/simulated-upload/${simulatedVideoId}`,
        cdnHostname: cdnHostname,
        message: 'Bunny Stream credentials not set in .env. Running in simulated streaming mode.',
      });
    }

    // Real Bunny Stream API call
    const bunnyResponse = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
      method: 'POST',
      headers: {
        'AccessKey': apiKey,
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
      return res.status(bunnyResponse.status).json({
        error: 'Failed to create video on Bunny Stream',
        details: errorText,
      });
    }

    const data = (await bunnyResponse.json()) as { guid: string };
    const videoId = data.guid;

    // Return upload parameters (client uploads directly to Bunny via PUT with AccessKey header or direct presigned upload)
    res.json({
      success: true,
      videoId,
      libraryId,
      uploadUrl: `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
      cdnHostname,
    });
  } catch (err: any) {
    console.error('Error in /api/bunny/create-video:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * Check transcoding and video status on Bunny Stream
 */
app.get('/api/bunny/status/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const apiKey = process.env.BUNNY_API_KEY;
    const libraryId = process.env.BUNNY_LIBRARY_ID;

    if (!apiKey || !libraryId || videoId.startsWith('bny_')) {
      // Return simulated completed status for test videos
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

// ============================================================================
// 2. VIEW COUNTER SYSTEM (Server-Side, Deduplicated & Rate-Limited)
// ============================================================================
app.post('/api/videos/:id/view', (req, res) => {
  try {
    const videoId = req.params.id;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const cacheKey = `${videoId}_${clientIp}`;
    const now = Date.now();

    const lastViewed = viewCache.get(cacheKey);
    if (lastViewed && now - lastViewed < VIEW_COOLDOWN_MS) {
      // Cooldown active; do not increment to prevent spamming
      return res.json({
        success: false,
        incremented: false,
        reason: 'Rate limit: View already recorded recently from this client.',
      });
    }

    // Record view
    viewCache.set(cacheKey, now);

    // Clean up old entries in cache occasionally
    if (viewCache.size > 5000) {
      for (const [k, v] of viewCache.entries()) {
        if (now - v > VIEW_COOLDOWN_MS) {
          viewCache.delete(k);
        }
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
app.post('/api/admin/audit-log', (req, res) => {
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

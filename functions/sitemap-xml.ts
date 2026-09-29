const SITE_URL = 'https://cornmm.com';
const API_URL = 'https://cornmm-production.up.railway.app/api/videos';

type ApiVideo = {
  id?: string;
  slug?: string;
  title?: string;
  description?: string | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
  playback_url?: string | null;
  created_at?: string | null;
};

function escapeXml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function videoUrl(video: ApiVideo) {
  const key = video.slug || video.id;
  return key ? `${SITE_URL}/watch/${encodeURIComponent(key)}` : null;
}

export async function onRequestGet() {
  try {
    const videos: ApiVideo[] = [];
    let page = 1;
    const pageSize = 100;

    while (page <= 20) {
      const response = await fetch(
        `${API_URL}?page=${page}&pageSize=${pageSize}&visibility=public&status=published&sortBy=created_at`
      );
      if (!response.ok) throw new Error(`Video API returned ${response.status}`);
      const payload = (await response.json()) as { videos?: ApiVideo[]; total?: number };
      const batch = Array.isArray(payload.videos) ? payload.videos : [];
      videos.push(...batch);
      if (batch.length < pageSize || videos.length >= Number(payload.total || videos.length)) break;
      page += 1;
    }

    const staticUrls = [
      ['/', 'hourly', '1.0'],
      ['/trending', 'hourly', '0.9'],
      ['/latest', 'hourly', '0.9'],
      ['/categories', 'daily', '0.8'],
    ];

    const urls = staticUrls.map(([path, changefreq, priority]) => `
  <url>
    <loc>${SITE_URL}${path}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('');

    const videoUrls = videos.map((video) => {
      const loc = videoUrl(video);
      if (!loc) return '';
      const thumbnail = String(video.thumbnail_url || '').trim();
      const title = String(video.title || 'CornMM Video').replace(/\s+/g, ' ').trim().slice(0, 200);
      const description = String(video.description || `Watch ${title} on CornMM.`).replace(/\s+/g, ' ').trim().slice(0, 2048);
      const player = String(video.video_url || video.playback_url || '').trim();
      if (!thumbnail || !player) return `
  <url>
    <loc>${escapeXml(loc)}</loc>
    ${video.created_at ? `<lastmod>${escapeXml(new Date(video.created_at).toISOString())}</lastmod>` : ''}
  </url>`;
      return `
  <url>
    <loc>${escapeXml(loc)}</loc>
    ${video.created_at ? `<lastmod>${escapeXml(new Date(video.created_at).toISOString())}</lastmod>` : ''}
    <video:video>
      <video:thumbnail_loc>${escapeXml(thumbnail)}</video:thumbnail_loc>
      <video:title>${escapeXml(title)}</video:title>
      <video:description>${escapeXml(description)}</video:description>
      <video:player_loc allow_embed="yes">${escapeXml(player)}</video:player_loc>
    </video:video>
  </url>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">${urls}${videoUrls}
</urlset>`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=UTF-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    });
  } catch (error) {
    console.error('[Sitemap] generation failed:', error);
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc></url>
  <url><loc>${SITE_URL}/trending</loc></url>
  <url><loc>${SITE_URL}/latest</loc></url>
  <url><loc>${SITE_URL}/categories</loc></url>
</urlset>`;
    return new Response(fallback, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=UTF-8',
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    });
  }
}

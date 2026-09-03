// Bunny Stream helper utilities and CDN URL constructors

export interface BunnyPlayerConfig {
  libraryId: string;
  videoId: string;
  cdnHostname?: string;
  token?: string;
  autoplay?: boolean;
}

/**
 * Returns iframe player embed URL for Bunny Stream
 */
export function getBunnyIframeUrl({
  libraryId,
  videoId,
  autoplay = false,
}: {
  libraryId?: string;
  videoId: string;
  autoplay?: boolean;
}): string {
  const lib = libraryId || 'demo-lib';
  return `https://iframe.mediadelivery.net/embed/${lib}/${videoId}?autoplay=${autoplay}&preload=true&responsive=true`;
}

/**
 * Returns direct HLS (.m3u8) stream URL for custom video players
 */
export function getBunnyHlsUrl(videoId: string, cdnHostname?: string): string {
  const host = cdnHostname || 'vz-cdn.bunnycdn.net';
  return `https://${host}/${videoId}/playlist.m3u8`;
}

/**
 * Returns standard Bunny thumbnail image URL
 */
export function getBunnyThumbnailUrl(videoId: string, cdnHostname?: string): string {
  const host = cdnHostname || 'vz-cdn.bunnycdn.net';
  return `https://${host}/${videoId}/thumbnail.jpg`;
}

/**
 * Returns dynamic animated preview (WebP) for hover preview
 */
export function getBunnyPreviewUrl(videoId: string, cdnHostname?: string): string {
  const host = cdnHostname || 'vz-cdn.bunnycdn.net';
  return `https://${host}/${videoId}/preview.webp`;
}

/**
 * Helper to check whether Bunny Stream server endpoints are available
 */
export async function initBunnyVideoUpload(title: string): Promise<{
  success: boolean;
  videoId: string;
  libraryId: string;
  uploadUrl: string;
  cdnHostname?: string;
  isSimulated?: boolean;
}> {
  const res = await fetch('/api/bunny/create-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to initialize Bunny video upload');
  }

  return await res.json();
}

/**
 * Check transcoding status from server
 */
export async function checkBunnyVideoStatus(videoId: string): Promise<{
  videoId: string;
  statusCode: number;
  statusText: string;
  encodeProgress: number;
}> {
  const res = await fetch(`/api/bunny/status/${videoId}`);
  if (!res.ok) {
    throw new Error('Failed to query video status');
  }
  return await res.json();
}

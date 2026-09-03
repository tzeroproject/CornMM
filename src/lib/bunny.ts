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

export interface BunnyUploadInitResult {
  success: boolean;
  videoId: string;
  libraryId: string;
  uploadUrl: string;
  proxyUploadUrl?: string;
  cdnHostname?: string;
  isSimulated?: boolean;
}

export interface BunnyUploadError extends Error {
  guidance?: string;
  details?: string;
  statusCode?: number;
  allowFallback?: boolean;
}

/**
 * Helper to initialize Bunny video creation via backend proxy
 */
export async function initBunnyVideoUpload(
  title: string,
  forceFallback: boolean = false
): Promise<BunnyUploadInitResult> {
  const res = await fetch('/api/bunny/create-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, forceFallback }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.guidance 
      ? `${data.error}: ${data.guidance}`
      : (data.error || 'Failed to initialize Bunny video upload');
    const customErr = new Error(errorMsg) as BunnyUploadError;
    customErr.guidance = data.guidance;
    customErr.details = data.details;
    customErr.statusCode = data.statusCode;
    customErr.allowFallback = data.allowFallback;
    throw customErr;
  }

  return data as BunnyUploadInitResult;
}

/**
 * Uploads video file binary to Bunny CDN or server proxy with real progress tracking
 */
export function uploadVideoBinary({
  file,
  uploadUrl,
  proxyUploadUrl,
  onProgress,
}: {
  file: File;
  uploadUrl: string;
  proxyUploadUrl?: string;
  onProgress?: (percent: number) => void;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    // Prefer server proxy upload to avoid browser CORS and protect secrets
    const targetUrl = proxyUploadUrl || uploadUrl;
    const xhr = new XMLHttpRequest();

    xhr.open('PUT', targetUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status code ${xhr.status}: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => {
      // If direct PUT had network/CORS error and we haven't tried proxy yet, fallback gracefully
      reject(new Error('Network error during video upload'));
    };

    xhr.send(file);
  });
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

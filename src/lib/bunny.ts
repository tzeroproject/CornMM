// Bunny Stream helper utilities and CDN URL constructors

export interface BunnyPlayerConfig {
  libraryId: string;
  videoId: string;
  cdnHostname?: string;
  token?: string;
  autoplay?: boolean;
}

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

export function getBunnyHlsUrl(videoId: string, cdnHostname?: string): string {
  const host = cdnHostname || 'vz-cdn.bunnycdn.net';
  return `https://${host}/${videoId}/playlist.m3u8`;
}

export function getBunnyThumbnailUrl(videoId: string, cdnHostname?: string): string {
  const host = cdnHostname || 'vz-cdn.bunnycdn.net';
  return `https://${host}/${videoId}/thumbnail.jpg`;
}

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
 * Initialize a REAL Bunny Stream video via the backend proxy.
 * Demo/prototype uploads are intentionally rejected so a bad deployment
 * can never create fake video records in Supabase.
 */
export async function initBunnyVideoUpload(
  title: string,
  _forceFallback: boolean = false
): Promise<BunnyUploadInitResult> {
  const res = await fetch('/api/bunny/create-video', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify({ title, forceFallback: false }),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.guidance
      ? `${data.error || 'Bunny Stream error'}: ${data.guidance}`
      : (data.error || `Bunny Stream initialization failed (${res.status})`);
    const customErr = new Error(errorMsg) as BunnyUploadError;
    customErr.guidance = data.guidance;
    customErr.details = data.details;
    customErr.statusCode = data.statusCode || res.status;
    customErr.allowFallback = false;
    throw customErr;
  }

  // Never accept a simulated response as a successful production upload.
  if (data.isSimulated || String(data.videoId || '').startsWith('bny_')) {
    const customErr = new Error(
      'The production Worker cannot access the Bunny Stream credentials.'
    ) as BunnyUploadError;
    customErr.guidance =
      'Check /api/health and make sure BUNNY_API_KEY, BUNNY_LIBRARY_ID, and BUNNY_CDN_HOSTNAME are configured for the Production Worker, then Deploy the updated variables.';
    customErr.statusCode = 503;
    customErr.allowFallback = false;
    throw customErr;
  }

  if (!data.videoId || !data.libraryId || !data.proxyUploadUrl) {
    const customErr = new Error('Bunny Stream returned an incomplete upload configuration.') as BunnyUploadError;
    customErr.guidance = 'The server must return videoId, libraryId, and proxyUploadUrl before an upload can begin.';
    customErr.statusCode = 502;
    customErr.allowFallback = false;
    throw customErr;
  }

  return data as BunnyUploadInitResult;
}

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
    // Prefer the same-origin Worker proxy so Bunny credentials never reach the browser.
    const targetUrl = proxyUploadUrl || uploadUrl;
    const xhr = new XMLHttpRequest();

    xhr.open('PUT', targetUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }

      let serverMessage = '';
      try {
        const body = JSON.parse(xhr.responseText || '{}');
        serverMessage = body.details || body.error || '';
      } catch {
        serverMessage = xhr.responseText || '';
      }

      reject(
        new Error(
          serverMessage
            ? `Bunny upload failed (${xhr.status}): ${serverMessage}`
            : `Bunny upload failed with status code ${xhr.status}: ${xhr.statusText}`
        )
      );
    };

    xhr.onerror = () => {
      reject(new Error('Network error during video upload. Check the Worker/API deployment and try again.'));
    };

    xhr.send(file);
  });
}

export async function checkBunnyVideoStatus(videoId: string): Promise<{
  videoId: string;
  statusCode: number;
  statusText: string;
  encodeProgress: number;
}> {
  const res = await fetch(`/api/bunny/status/${encodeURIComponent(videoId)}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to query video status (${res.status})`);
  }
  return data;
}

import { supabase } from './supabase';

export interface BunnyPlayerConfig { libraryId: string; videoId: string; cdnHostname?: string; token?: string; autoplay?: boolean; }

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getBunnyIframeUrl({ libraryId, videoId, autoplay = false }: { libraryId?: string; videoId: string; autoplay?: boolean }): string {
  const lib = libraryId || 'demo-lib';
  return `https://iframe.mediadelivery.net/embed/${lib}/${videoId}?autoplay=${autoplay}&preload=true&responsive=true`;
}
export function getBunnyHlsUrl(libraryId: string, videoId: string): string { return `https://iframe.mediadelivery.net/play/${libraryId}/${videoId}`; }
export function getBunnyThumbnailUrl(libraryId: string, videoId: string): string { return `https://vz-${libraryId}.b-cdn.net/${videoId}/thumbnail.jpg`; }
export function getBunnyPreviewUrl(libraryId: string, videoId: string): string { return `https://vz-${libraryId}.b-cdn.net/${videoId}/preview.webp`; }

export interface BunnyUploadInitResult { success: boolean; videoId: string; libraryId: string; uploadUrl: string; proxyUploadUrl?: string; cdnHostname?: string; isSimulated?: boolean; }
export interface BunnyUploadError extends Error { guidance?: string; details?: string; statusCode?: number; allowFallback?: boolean; }

export async function initBunnyVideoUpload(title: string, _forceFallback = false): Promise<BunnyUploadInitResult> {
  const auth = await authHeaders();
  const res = await fetch('/api/bunny/create-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Cache-Control': 'no-cache', ...auth },
    body: JSON.stringify({ title, forceFallback: false }),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Bunny Stream initialization failed (${res.status})`) as BunnyUploadError;
    err.guidance = data.guidance; err.details = data.details; err.statusCode = data.statusCode || res.status; err.allowFallback = false;
    throw err;
  }
  if (!data.videoId || !data.libraryId || !data.proxyUploadUrl) {
    const err = new Error('Bunny Stream returned an incomplete upload configuration.') as BunnyUploadError;
    err.statusCode = 502; err.allowFallback = false; throw err;
  }
  return data as BunnyUploadInitResult;
}

export async function uploadVideoBinary(proxyUploadUrl: string, file: File, onProgress?: (percent: number) => void): Promise<void> {
  const auth = await authHeaders();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', proxyUploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
    xhr.setRequestHeader('Accept', 'application/json');
    if (auth.Authorization) xhr.setRequestHeader('Authorization', auth.Authorization);
    xhr.upload.onprogress = event => {
      if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = '';
      try { const body = JSON.parse(xhr.responseText || '{}'); msg = body.details || body.error || ''; } catch { msg = xhr.responseText || ''; }
      reject(new Error(msg ? `Bunny upload failed (${xhr.status}): ${msg}` : `Bunny upload failed with status code ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Network error during video upload. Check the API deployment and try again.'));
    xhr.send(file);
  });
}

export async function checkBunnyVideoStatus(videoId: string): Promise<{ videoId: string; statusCode: number; statusText: string; encodeProgress: number }> {
  const auth = await authHeaders();
  const res = await fetch(`/api/bunny/status/${encodeURIComponent(videoId)}`, { cache: 'no-store', headers: { Accept: 'application/json', ...auth } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Failed to query video status (${res.status})`);
  return data;
}

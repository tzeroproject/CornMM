// LuluStream helper utilities.
//
// LuluStream is used as a SECONDARY / BACKUP video host: when Bunny Stream
// is unreachable or misconfigured, the upload flow falls back to LuluStream
// so the creator's upload still succeeds instead of failing outright.
//
// The raw file is streamed to our own backend (Worker or Express server),
// which attaches LULU_API_KEY server-side and forwards it to LuluStream.
// The key never reaches the browser.

export interface LuluUploadResult {
  success: boolean;
  fileCode: string;
  embedUrl: string;
}

export interface LuluUploadError extends Error {
  details?: string;
  statusCode?: number;
}

export function uploadToLulu({
  file,
  title,
  onProgress,
}: {
  file: File;
  title: string;
  onProgress?: (percent: number) => void;
}): Promise<LuluUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `/api/lulu/upload?title=${encodeURIComponent(title || 'Untitled Video')}`;

    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let data: any = {};
      try {
        data = JSON.parse(xhr.responseText || '{}');
      } catch {
        // handled by the status/success check below
      }

      if (xhr.status >= 200 && xhr.status < 300 && data.success && data.fileCode) {
        resolve({
          success: true,
          fileCode: data.fileCode,
          embedUrl: data.embedUrl || `https://lulustream.com/e/${data.fileCode}`,
        });
        return;
      }

      const err = new Error(
        data.error || `LuluStream backup upload failed (${xhr.status})`
      ) as LuluUploadError;
      err.details = data.details;
      err.statusCode = xhr.status;
      reject(err);
    };

    xhr.onerror = () => {
      reject(new Error('Network error while uploading to the LuluStream backup host.'));
    };

    xhr.send(file);
  });
}

export function getLuluEmbedUrl(fileCode: string): string {
  return `https://lulustream.com/e/${fileCode}`;
}

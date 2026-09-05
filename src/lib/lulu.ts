// Lulu upload helper.
// The API key stays on the server. The browser sends the video as
// multipart/form-data so the backend can stream the temporary file onward.

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
    const formData = new FormData();

    formData.append('file', file, file.name || 'upload.mp4');
    formData.append('file_title', title || 'Untitled Video');

    xhr.open('POST', '/api/lulu/upload');
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
        data.error || `Lulu upload failed (${xhr.status})`
      ) as LuluUploadError;
      err.details = data.details;
      err.statusCode = xhr.status;
      reject(err);
    };

    xhr.onerror = () => {
      reject(new Error('Network error while uploading to the Lulu backup host.'));
    };

    xhr.send(formData);
  });
}

export function getLuluEmbedUrl(fileCode: string): string {
  return `https://lulustream.com/e/${fileCode}`;
}

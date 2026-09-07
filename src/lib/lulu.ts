import { supabase } from './supabase';

export interface LuluUploadResult { success: boolean; fileCode: string; embedUrl: string; }
export interface LuluUploadError extends Error { details?: string; statusCode?: number; }

export function uploadToLulu({ file, title, onProgress }: { file: File; title: string; onProgress?: (percent: number) => void }): Promise<LuluUploadResult> {
  return new Promise(async (resolve, reject) => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Please sign in before uploading to LuluStream.');
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file, file.name || 'upload.mp4');
      formData.append('file_title', title || 'Untitled Video');
      xhr.open('POST', '/api/lulu/upload');
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = event => { if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100)); };
      xhr.onload = () => {
        let data: any = {}; try { data = JSON.parse(xhr.responseText || '{}'); } catch {}
        if (xhr.status >= 200 && xhr.status < 300 && data.success && data.fileCode) return resolve({ success: true, fileCode: data.fileCode, embedUrl: data.embedUrl || `https://lulustream.com/e/${data.fileCode}` });
        const err = new Error(data.error || `Lulu upload failed (${xhr.status})`) as LuluUploadError;
        err.details = data.details; err.statusCode = xhr.status; reject(err);
      };
      xhr.onerror = () => reject(new Error('Network error while uploading to the Lulu backup host.'));
      xhr.send(formData);
    } catch (error) { reject(error); }
  });
}

export function getLuluEmbedUrl(fileCode: string): string { return `https://lulustream.com/e/${fileCode}`; }
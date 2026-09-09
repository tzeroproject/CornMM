import React, { useEffect, useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { videoService } from '../services/videoService';
import { supabase } from '../lib/supabase';
import type { Category } from '../types';

export default function FileMoonUploadPage() {
  const { user, isAdmin } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { videoService.getCategories().then(setCategories).catch(() => setCategories([])); }, []);

  const selectFile = (value?: File) => {
    setError(''); setSuccess('');
    if (!value) return;
    if (!value.type.startsWith('video/')) return setError('Please select a valid video file.');
    if (value.size > 1024 * 1024 * 1024) return setError('Video file must be 1GB or smaller.');
    setFile(value);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setSuccess('');
    if (!user) return setError('Please sign in before uploading.');
    if (!isAdmin) return setError('Admin access required for FileMoon uploads.');
    if (!title.trim()) return setError('Please enter a title.');
    if (!file) return setError('Please select a video file.');
    try {
      setUploading(true);
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Your session has expired. Please sign in again.');
      const form = new FormData(); form.append('file', file); form.append('title', title.trim());
      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest(); xhr.open('POST', '/api/filemoon/proxy-upload');
        xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        xhr.upload.onprogress = e => { if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100)); };
        xhr.onload = () => { try { const data = JSON.parse(xhr.responseText || '{}'); if (xhr.status >= 200 && xhr.status < 300) resolve(data); else reject(new Error(data?.error || 'FileMoon upload failed (' + xhr.status + ').')); } catch { reject(new Error('FileMoon upload failed (' + xhr.status + ').')); } };
        xhr.onerror = () => reject(new Error('Network error while uploading to FileMoon.'));
        xhr.send(form);
      });
      const fileId = String(result.fileId || result.providerId || '');
      if (!fileId) throw new Error('FileMoon did not return a file ID.');
      const videoUrl = String(result.embedUrl || result.videoUrl || ('https://filemoon.org/' + encodeURIComponent(fileId) + '/embed'));
      await videoService.createVideo({ title: title.trim(), description: description.trim(), category_id: categoryId || undefined, creator_id: user.id, video_url: videoUrl, thumbnail_url: result.thumbnailUrl || '', preview_animation_url: '', provider: 'filemoon', provider_id: fileId, is_published: true });
      setSuccess('FileMoon upload completed successfully.'); setTitle(''); setDescription(''); setCategoryId(''); setFile(null); setProgress(0);
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed.'); }
    finally { setUploading(false); }
  };

  return <div className="min-h-screen bg-black text-white p-6 md:p-10"><div className="max-w-3xl mx-auto space-y-6">
    <div><h1 className="text-3xl font-black">FileMoon Upload</h1><p className="text-sm text-zinc-400 mt-1">Admin-only upload. FileMoon API credentials stay on the server.</p></div>
    <form onSubmit={submit} className="space-y-6">
      <div className="p-6 rounded-3xl bg-[#0a0a0a] border border-white/10 space-y-4">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Video title" className="w-full px-4 py-3 rounded-xl bg-black border border-white/10 text-white" />
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" className="w-full h-24 px-4 py-3 rounded-xl bg-black border border-white/10 text-white" />
        <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-black border border-white/10 text-white"><option value="">No category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </div>
      <div onClick={() => inputRef.current?.click()} className="border border-dashed border-white/10 rounded-3xl p-10 text-center cursor-pointer bg-[#0a0a0a] hover:border-white/20">
        <input ref={inputRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska" className="hidden" onChange={e => selectFile(e.target.files?.[0])} />
        <Upload className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <h3 className="font-bold">{file ? file.name : 'Select a video file'}</h3>
        <p className="text-xs text-zinc-400 mt-1">MP4, WebM, MOV, or MKV up to 1GB</p>
      </div>
      {uploading && <div className="text-sm text-zinc-300">Uploading to FileMoon... {progress}%</div>}
      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>}
      {success && <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">{success}</div>}
      <button disabled={uploading} className="w-full py-3 rounded-xl bg-amber-500 text-black font-black disabled:opacity-50 flex items-center justify-center gap-2">{uploading && <Loader2 className="w-4 h-4 animate-spin" />}{uploading ? 'Uploading...' : 'Upload to FileMoon'}</button>
    </form>
  </div></div>;
}

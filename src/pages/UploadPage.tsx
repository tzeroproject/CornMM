import React, { useEffect, useRef, useState } from 'react';
import { Upload, X, Sparkles, Link as LinkIcon, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { videoService } from '../services/videoService';
import { initBunnyVideoUpload, uploadVideoBinary, getBunnyHlsUrl, getBunnyThumbnailUrl, getBunnyPreviewUrl } from '../lib/bunny';
import type { Category } from '../types';

type UploadMode = 'bunny' | 'uqload' | 'embed';
const getEmbedSource = (value: string) => { const trimmed = value.trim(); const iframeMatch = trimmed.match(/<iframe[^>]+src=["']([^"']+)["']/i); return iframeMatch?.[1] || trimmed; };
const extractUqloadFileCode = (payload: any) => { const file = payload?.files?.[0]; return file?.filecode || file?.fileCode || payload?.filecode || payload?.fileCode || null; };

export default function UploadPage() {
  const { user, isAdmin } = useAuth();
  const [uploadMode, setUploadMode] = useState<UploadMode>('bunny');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [embedUrl, setEmbedUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { videoService.getCategories().then(setCategories).catch(() => setCategories([])); }, []);
  const handleFileSelect = (file?: File) => { setError(''); setSuccess(''); if (!file) return; if (!file.type.startsWith('video/')) { setError('Please select a valid video file.'); return; } if (file.size > 1024 * 1024 * 1024) { setError('Video file must be 1GB or smaller.'); return; } setSelectedFile(file); };
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => { event.preventDefault(); setIsDragging(false); handleFileSelect(event.dataTransfer.files?.[0]); };
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setSuccess('');
    if (!user) { setError('Please sign in before uploading a video.'); return; }
    if (!title.trim()) { setError('Please enter a title.'); return; }
    try {
      setIsUploading(true);
      if (uploadMode === 'embed') {
        if (!isAdmin) throw new Error('Admin access required for embed uploads.');
        const source = getEmbedSource(embedUrl); if (!/^https?:\/\//i.test(source)) throw new Error('Please enter a valid HTTP(S) embed URL or iframe code.');
        await videoService.createVideo({ title: title.trim(), description: description.trim(), category_id: categoryId || undefined, creator_id: user.id, video_url: source, thumbnail_url: '', preview_animation_url: '', provider: 'embed', is_published: true }); setSuccess('Embed video added successfully.');
      } else if (uploadMode === 'bunny') {
        if (!selectedFile) throw new Error('Please select a video file.');
        const upload = await initBunnyVideoUpload(title.trim()); await uploadVideoBinary(upload.proxyUploadUrl, selectedFile); const videoId = upload.videoId;
        await videoService.createVideo({ title: title.trim(), description: description.trim(), category_id: categoryId || undefined, creator_id: user.id, video_url: getBunnyHlsUrl(upload.libraryId, videoId), thumbnail_url: getBunnyThumbnailUrl(upload.libraryId, videoId), preview_animation_url: getBunnyPreviewUrl(upload.libraryId, videoId), provider: 'bunny', provider_id: videoId, is_published: true }); setSuccess('Bunny Stream upload completed successfully.');
      } else {
        if (!isAdmin) throw new Error('Admin access required for UQLOAD uploads.'); if (!selectedFile) throw new Error('Please select a video file.');
        const session = await import('../lib/supabase').then(({ supabase }) => supabase.auth.getSession()); const token = session.data.session?.access_token; if (!token) throw new Error('Your session has expired. Please sign in again.');
        const formData = new FormData(); formData.append('file', selectedFile); formData.append('title', title.trim());
        const response = await new Promise<any>((resolve, reject) => { const xhr = new XMLHttpRequest(); xhr.open('POST', '/api/uqload/proxy-upload'); xhr.setRequestHeader('Authorization', `Bearer ${token}`); xhr.onload = () => { try { const data = JSON.parse(xhr.responseText || '{}'); if (xhr.status >= 200 && xhr.status < 300) resolve(data); else reject(new Error(data?.error || data?.message || `UQLOAD upload failed (${xhr.status}).`)); } catch { reject(new Error(`UQLOAD upload failed (${xhr.status}).`)); } }; xhr.onerror = () => reject(new Error('Network error while uploading to UQLOAD.')); xhr.send(formData); });
        const fileCode = extractUqloadFileCode(response); if (!fileCode) throw new Error('UQLOAD did not return a file code.');
        await videoService.createVideo({ title: title.trim(), description: description.trim(), category_id: categoryId || undefined, creator_id: user.id, video_url: `https://uqload.vc/e/${fileCode}`, thumbnail_url: '', preview_animation_url: '', provider: 'uqload', provider_id: fileCode, is_published: true }); setSuccess('UQLOAD upload completed successfully.');
      }
      setTitle(''); setDescription(''); setCategoryId(''); setSelectedFile(null); setEmbedUrl('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Upload failed.'); } finally { setIsUploading(false); }
  };
  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10"><div className="max-w-3xl mx-auto space-y-6">
      <div><h1 className="text-3xl font-black">Upload Video</h1><p className="text-sm text-zinc-400 mt-1">Sign in is required for all video uploads. UQLOAD and Embed are admin-only.</p></div>
      <div className="flex bg-[#0a0a0a] border border-white/10 rounded-xl p-1">{(['bunny', 'uqload', 'embed'] as UploadMode[]).map((mode) => <button key={mode} type="button" onClick={() => setUploadMode(mode)} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${uploadMode === mode ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-400 hover:text-white'}`}>{mode === 'bunny' ? 'Bunny Stream' : mode === 'uqload' ? 'UQLOAD Stream' : 'Any Embed Link'}</button>)}</div>
      <form onSubmit={handleSubmit} className="space-y-6"><div className="p-6 rounded-3xl bg-[#0a0a0a] border border-white/10 space-y-4">
        <div><label className="block text-sm font-bold text-white mb-2">Title</label><input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full px-4 py-3 rounded-xl bg-black border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" placeholder="Video title" /></div>
        <div><label className="block text-sm font-bold text-white mb-2">Description</label><textarea value={description} onChange={(event) => setDescription(event.target.value)} className="w-full h-24 px-4 py-3 rounded-xl bg-black border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" placeholder="Optional description" /></div>
        <div><label className="block text-sm font-bold text-white mb-2">Category</label><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="w-full px-4 py-3 rounded-xl bg-black border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"><option value="">No category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
      </div>
      {uploadMode === 'embed' ? <div className="p-6 rounded-3xl bg-[#0a0a0a] border border-white/10 space-y-4"><label className="block text-sm font-bold text-white">Embed Code or URL</label><textarea value={embedUrl} onChange={(event) => setEmbedUrl(event.target.value)} placeholder={'<iframe src="https://example.com/embed/...">...</iframe>'} className="w-full h-32 px-4 py-3 rounded-xl bg-black border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50" /></div> : (!selectedFile ? <div onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} className={`border border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${isDragging ? 'border-amber-400 bg-amber-500/10' : 'border-white/10 hover:border-white/20 bg-[#0a0a0a]'}`}><input ref={fileInputRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska" onChange={(event) => handleFileSelect(event.target.files?.[0])} className="hidden" /><div className="w-16 h-16 rounded-2xl bg-[#141414] border border-white/10 text-amber-400 flex items-center justify-center mx-auto mb-4"><Upload className="w-8 h-8" /></div><h3 className="font-bold text-base text-white">Select or drag a video file here</h3><p className="text-xs text-zinc-400 mt-1">MP4, WebM, MOV, or MKV up to 1GB</p>{uploadMode === 'bunny' && <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#161616] border border-white/10 text-[11px] text-zinc-300"><Sparkles className="w-3.5 h-3.5 text-amber-400" /> HLS transcoding via Bunny Stream</div>}</div> : <div className="p-6 rounded-3xl bg-[#0a0a0a] border border-white/10 flex items-center justify-between gap-4"><div className="min-w-0"><p className="font-semibold truncate">{selectedFile.name}</p><p className="text-xs text-zinc-500">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p></div><button type="button" onClick={() => setSelectedFile(null)} className="p-2 rounded-lg hover:bg-white/10" aria-label="Remove file"><X className="w-5 h-5" /></button></div>)}
      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">{error}</div>}{success && <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300">{success}</div>}
      <button type="submit" disabled={isUploading} className="w-full py-4 rounded-2xl bg-amber-500 text-black font-black disabled:opacity-50 flex items-center justify-center gap-2">{isUploading ? <><Loader2 className="w-5 h-5 animate-spin" /> Uploading...</> : <><LinkIcon className="w-5 h-5" /> {uploadMode === 'embed' ? 'Add Embed Video' : 'Upload Video'}</>}</button>
      </form>
    </div></div>
  );
}

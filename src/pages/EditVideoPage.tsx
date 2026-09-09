import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit3, ArrowLeft, Trash2, Save, ImagePlus, Loader2 } from 'lucide-react';
import { videoService } from '../services/videoService';
import { Video, Category } from '../types';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export const EditVideoPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { showToast } = useNotification();

  const [video, setVideo] = useState<Video | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [isAgeRestricted, setIsAgeRestricted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setIsLoading(true);
      const [v, cats] = await Promise.all([videoService.getVideoById(id), videoService.getCategories()]);
      if (!v) { showToast({ type: 'error', title: 'Video not found' }); navigate('/dashboard'); return; }
      if (user && v.creator_id !== user.id && !isAdmin) { showToast({ type: 'error', title: 'Unauthorized', message: 'You cannot edit another creator\'s video.' }); navigate('/dashboard'); return; }
      setVideo(v); setCategories(cats); setTitle(v.title); setDescription(v.description); setCategoryId(v.category_id); setVisibility(v.visibility); setIsAgeRestricted(v.is_age_restricted); setThumbnailPreview(v.thumbnail_url || ''); setIsLoading(false);
    }
    load();
  }, [id, user, isAdmin, navigate, showToast]);

  const handleThumbnailUpload = async () => {
    if (!video || !thumbnailFile) return;
    setIsUploadingThumbnail(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error('Your session has expired. Please sign in again.');
      const formData = new FormData(); formData.append('thumbnail', thumbnailFile);
      const response = await fetch('/api/videos/' + encodeURIComponent(video.id) + '/thumbnail', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: formData });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Thumbnail upload failed.');
      setVideo(data.video || { ...video, thumbnail_url: data.thumbnailUrl }); setThumbnailFile(null); setThumbnailPreview(data.thumbnailUrl || ''); showToast({ type: 'success', title: 'Thumbnail Updated' });
    } catch (err: any) { showToast({ type: 'error', title: 'Thumbnail Upload Failed', message: err.message }); }
    finally { setIsUploadingThumbnail(false); }
  };

  const loadImage = (url: string) => new Promise<boolean>((resolve) => {
    const image = new Image();
    const timer = window.setTimeout(() => { image.src = ''; resolve(false); }, 10000);
    image.onload = () => { window.clearTimeout(timer); resolve(true); };
    image.onerror = () => { window.clearTimeout(timer); resolve(false); };
    image.src = url;
  });

  const handleGenerateFileMoonThumbnail = async () => {
    if (!video) return;
    const provider = String((video as any).provider || '').toLowerCase();
    const providerId = String((video as any).provider_id || '').trim();
    const videoUrl = String((video as any).video_url || '').trim();

    if (!providerId && !videoUrl) {
      showToast({ type: 'error', title: 'Thumbnail Generation Failed', message: 'FileMoon video ID or URL is missing.' });
      return;
    }

    let fileId = providerId;
    if (!fileId && videoUrl) {
      const match = videoUrl.match(/(?:filemoon\.(?:sx|to|in)|fmoon\.in)\/[^/]+\/([A-Za-z0-9_-]+)/i) || videoUrl.match(/\/([A-Za-z0-9_-]{6,})(?:\?.*)?$/);
      if (match) fileId = match[1];
    }

    if (!fileId) {
      showToast({ type: 'error', title: 'Thumbnail Generation Failed', message: 'Could not determine the FileMoon video ID.' });
      return;
    }

    if (provider && provider !== 'filemoon' && !videoUrl.toLowerCase().includes('filemoon')) {
      showToast({ type: 'error', title: 'Thumbnail Generation Failed', message: 'This video is not a FileMoon video.' });
      return;
    }

    setIsUploadingThumbnail(true);
    try {
      const candidates = [
        `https://thumbs.filemoon.sx/${encodeURIComponent(fileId)}.jpg`,
        `https://thumbs.filemoon.sx/${encodeURIComponent(fileId)}_t.jpg`,
      ];

      let selected = '';
      for (let attempt = 0; attempt < 4 && !selected; attempt += 1) {
        for (const candidate of candidates) {
          if (await loadImage(candidate)) {
            selected = candidate;
            break;
          }
        }
        if (!selected && attempt < 3) await new Promise((resolve) => window.setTimeout(resolve, 2500));
      }

      if (!selected) {
        throw new Error('FileMoon has not generated a thumbnail for this video yet. Please wait until the video finishes processing, then try again.');
      }

      const saved = await videoService.updateVideo(video.id, { thumbnail_url: selected });
      setVideo(saved || { ...video, thumbnail_url: selected });
      setThumbnailPreview(selected + '?v=' + Date.now());
      showToast({ type: 'success', title: 'Thumbnail Generated', message: 'FileMoon thumbnail verified and saved.' });
    } catch (err: any) {
      showToast({ type: 'error', title: 'Thumbnail Generation Failed', message: err?.message || 'Could not load the FileMoon thumbnail.' });
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); if (!video) return; setIsSaving(true);
    try {
      await videoService.updateVideo(video.id, { title: title.trim(), description: description.trim(), category_id: categoryId, visibility, is_age_restricted: isAgeRestricted });
      showToast({ type: 'success', title: 'Changes Saved' }); navigate('/dashboard');
    } catch (err: any) { showToast({ type: 'error', title: 'Save Failed', message: err.message }); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!video) return; if (!window.confirm(`Permanently delete "${video.title}"?`)) return;
    try { await videoService.deleteVideo(video.id); showToast({ type: 'success', title: 'Video Deleted' }); navigate('/dashboard'); }
    catch (err: any) { showToast({ type: 'error', title: 'Delete Failed', message: err.message }); }
  };

  if (isLoading || !video) return <div className="py-20 text-center"><div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" /></div>;
  const hasFileMoonSource = String((video as any).provider || '').toLowerCase() === 'filemoon' || String((video as any).video_url || '').toLowerCase().includes('filemoon');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button type="button" onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"><ArrowLeft className="w-4 h-4" /> Back to Studio</button>
      <div className="pb-4 border-b border-white/10 flex items-center justify-between"><h1 className="text-xl font-bold text-white flex items-center gap-2 font-editorial italic"><Edit3 className="w-5 h-5 text-amber-400" /> Edit Stream Details</h1><button type="button" onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 border border-rose-900/40 transition-colors cursor-pointer"><Trash2 className="w-3.5 h-3.5" /> Delete</button></div>
      <form onSubmit={handleSave} className="space-y-5">
        <div><label className="block text-xs font-semibold text-zinc-300 mb-1.5">Title</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full h-10 px-3.5 rounded-xl bg-[#0a0a0a] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400" required /></div>
        <div><label className="block text-xs font-semibold text-zinc-300 mb-1.5">Description</label><textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 rounded-xl bg-[#0a0a0a] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400" /></div>
        <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-zinc-300 mb-1.5">Category</label><select value={categoryId || ''} onChange={(e) => setCategoryId(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-[#0a0a0a] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div><label className="block text-xs font-semibold text-zinc-300 mb-1.5">Visibility</label><select value={visibility || 'public'} onChange={(e) => setVisibility(e.target.value as any)} className="w-full h-10 px-3 rounded-xl bg-[#0a0a0a] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option></select></div></div>
        <div className="p-5 rounded-2xl bg-[#0a0a0a] border border-white/10 space-y-4">
          <div><label className="block text-xs font-semibold text-zinc-300 mb-1.5">Thumbnail</label><p className="text-[11px] text-zinc-500">Generate a thumbnail from the FileMoon video or upload your own. JPG, PNG, or WebP up to 10MB.</p></div>
          <div className="flex flex-col sm:flex-row gap-4 items-start"><div className="w-full sm:w-48 aspect-video rounded-xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">{(thumbnailPreview || video.thumbnail_url) ? <img key={thumbnailPreview || video.thumbnail_url} src={thumbnailPreview || video.thumbnail_url} alt="Current thumbnail" className="w-full h-full object-cover" onError={(e) => { const img = e.currentTarget; if (!img.dataset.fallbackT) { img.dataset.fallbackT = '1'; const current = img.src.split('?')[0]; img.src = current.includes('_t.jpg') ? current : current.replace(/\.jpg$/i, '_t.jpg'); } }} /> : <div className="text-zinc-600 flex flex-col items-center gap-2"><ImagePlus className="w-7 h-7" /><span className="text-[10px]">No thumbnail</span></div>}</div><div className="flex-1 space-y-2">
            {hasFileMoonSource && <button type="button" onClick={handleGenerateFileMoonThumbnail} disabled={isUploadingThumbnail} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-bold hover:bg-amber-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">{isUploadingThumbnail ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}{isUploadingThumbnail ? 'Checking FileMoon Thumbnail...' : 'Generate from FileMoon Video'}</button>}
            <input id="video-thumbnail" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(ev) => { const file = ev.target.files?.[0] || null; setThumbnailFile(file); if (file) setThumbnailPreview(URL.createObjectURL(file)); }} />
            <label htmlFor="video-thumbnail" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-white hover:bg-white/10 cursor-pointer"><ImagePlus className="w-4 h-4" /> Choose Thumbnail</label>
            {thumbnailFile && <p className="text-[11px] text-zinc-400 truncate">{thumbnailFile.name}</p>}
            <button type="button" onClick={handleThumbnailUpload} disabled={!thumbnailFile || isUploadingThumbnail} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold disabled:opacity-50">{isUploadingThumbnail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{isUploadingThumbnail ? 'Uploading Thumbnail...' : 'Upload Thumbnail'}</button>
          </div></div>
        </div>
        <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10"><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={isAgeRestricted} onChange={(e) => setIsAgeRestricted(e.target.checked)} className="w-4 h-4 rounded text-amber-500 accent-amber-500 bg-[#050505] border-white/10" /><span className="text-xs text-zinc-300">Age Restricted (18+). Requires viewer age consent.</span></label></div>
        <div className="flex justify-end gap-3 pt-4 border-t border-white/10"><button type="button" onClick={() => navigate('/dashboard')} className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer">Cancel</button><button type="submit" disabled={isSaving} className="flex items-center gap-2 px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold uppercase tracking-wider shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"><Save className="w-3.5 h-3.5" />{isSaving ? 'Saving Changes...' : 'Save Changes'}</button></div>
      </form>
    </div>
  );
};

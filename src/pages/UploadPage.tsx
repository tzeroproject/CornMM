import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ExternalLink, FileVideo, RefreshCw, ShieldAlert, Sparkles, Upload, X } from 'lucide-react';
import { videoService } from '../services/videoService';
import {
  getBunnyHlsUrl,
  getBunnyPreviewUrl,
  getBunnyThumbnailUrl,
  initBunnyVideoUpload,
  uploadVideoBinary,
} from '../lib/bunny';
import { supabase } from '../lib/supabase';
import { Category } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

type UploadMode = 'bunny' | 'uqload' | 'embed';
type UploadStep = 'idle' | 'authorizing' | 'uploading' | 'transcoding' | 'done';

export const UploadPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<UploadMode>('bunny');
  const [embedUrl, setEmbedUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [isAgeRestricted, setIsAgeRestricted] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState<UploadStep>('idle');
  const [bunnyError, setBunnyError] = useState<{ message: string; guidance?: string; statusCode?: number } | null>(null);

  useEffect(() => {
    videoService.getCategories().then((cats) => {
      setCategories(cats);
      if (cats.length && !categoryId) setCategoryId(cats[0].id);
    }).catch((error) => {
      console.warn('Failed to load categories:', error);
    });
  }, [categoryId]);

  const handleFileSelect = (file?: File) => {
    if (!file) return;
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
    const validExtension = /\.(mp4|webm|mov|mkv)$/i.test(file.name);

    if (!validTypes.includes(file.type) && !validExtension) {
      showToast({ type: 'error', title: 'Unsupported Format', message: 'Please select an MP4, WebM, MOV, or MKV video.' });
      return;
    }
    if (file.size > 1024 * 1024 * 1024) {
      showToast({ type: 'error', title: 'File Too Large', message: 'Video files are limited to 1GB.' });
      return;
    }

    setSelectedFile(file);
    if (!title.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    handleFileSelect(event.dataTransfer.files?.[0]);
  };

  const createVideoRecord = async (data: {
    videoUrl: string;
    bunnyVideoId: string;
    thumbnailUrl: string;
    previewUrl?: string;
    duration?: number;
  }) => videoService.createVideo({
    title: title.trim(),
    description: description.trim(),
    category_id: categoryId || undefined,
    creator_id: user?.id,
    visibility,
    moderation_status: 'published',
    is_age_restricted: isAgeRestricted,
    allow_comments: allowComments,
    bunny_video_id: data.bunnyVideoId,
    video_url: data.videoUrl,
    thumbnail_url: data.thumbnailUrl,
    preview_animation_url: data.previewUrl,
    duration: data.duration || 0,
  });

  const uploadToBunny = async () => {
    if (!selectedFile) throw new Error('Video file is required.');

    setUploadStep('authorizing');
    setUploadProgress(0);
    const bunny = await initBunnyVideoUpload(title.trim(), false);

    setUploadStep('uploading');
    await uploadVideoBinary({
      file: selectedFile,
      uploadUrl: bunny.uploadUrl,
      proxyUploadUrl: bunny.proxyUploadUrl,
      onProgress: (percent) => {
        setUploadProgress(percent);
        if (percent >= 98) setUploadStep('transcoding');
      },
    });

    setUploadProgress(100);
    setUploadStep('transcoding');
    await new Promise((resolve) => setTimeout(resolve, 1500));

    return createVideoRecord({
      bunnyVideoId: bunny.videoId,
      videoUrl: getBunnyHlsUrl(bunny.videoId, bunny.cdnHostname),
      thumbnailUrl: getBunnyThumbnailUrl(bunny.videoId, bunny.cdnHostname),
      previewUrl: getBunnyPreviewUrl(bunny.videoId, bunny.cdnHostname),
    });
  };

  const uploadToUqload = async () => {
    if (!selectedFile) throw new Error('Video file is required.');

    setUploadStep('uploading');
    setUploadProgress(10);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('file_title', title.trim());

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (sessionError || !token) throw new Error('Authentication required. Please sign in again.');

    const result = await new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/uqload/proxy-upload');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) setUploadProgress(10 + Math.round((event.loaded / event.total) * 90));
      };
      xhr.onload = () => {
        let body: any = {};
        try { body = JSON.parse(xhr.responseText || '{}'); } catch { /* handled below */ }
        if (xhr.status >= 200 && xhr.status < 300) return resolve(body);
        reject(new Error(body.details || body.error || `UQLOAD upload failed (${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error('Network error while uploading to UQLOAD.'));
      xhr.send(formData);
    });

    const fileCode = result?.files?.[0]?.filecode || result?.filecode || result?.fileCode;
    if (!fileCode) throw new Error('UQLOAD returned an invalid upload response.');

    setUploadProgress(100);
    setUploadStep('done');
    return createVideoRecord({
      bunnyVideoId: 'embed',
      videoUrl: `https://uqload.vc/e/${fileCode}`,
      thumbnailUrl: 'https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=800&auto=format&fit=crop&q=80',
    });
  };

  const publishEmbed = async () => {
    let finalUrl = embedUrl.trim();
    const srcMatch = finalUrl.match(/src\s*=\s*["'](.*?)["']/i);
    if (srcMatch?.[1]) finalUrl = srcMatch[1];
    if (!/^https?:\/\//i.test(finalUrl)) throw new Error('Please enter a valid HTTP(S) embed URL or iframe code.');

    setUploadStep('done');
    return createVideoRecord({
      bunnyVideoId: 'embed',
      videoUrl: finalUrl,
      thumbnailUrl: 'https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=800&auto=format&fit=crop&q=80',
    });
  };

  const performUpload = async () => {
    if (!user) {
      showToast({ type: 'error', title: 'Sign In Required', message: 'Please sign in before publishing a video.' });
      return;
    }
    if (!title.trim()) {
      showToast({ type: 'error', title: 'Title Required' });
      return;
    }
    if (uploadMode !== 'embed' && !selectedFile) {
      showToast({ type: 'error', title: 'Video File Required' });
      return;
    }
    if (uploadMode === 'embed' && !embedUrl.trim()) {
      showToast({ type: 'error', title: 'Embed URL Required' });
      return;
    }

    setIsUploading(true);
    setBunnyError(null);
    try {
      const video = uploadMode === 'bunny'
        ? await uploadToBunny()
        : uploadMode === 'uqload'
          ? await uploadToUqload()
          : await publishEmbed();

      showToast({ type: 'success', title: 'Video Published!', message: 'Your video is ready to watch.' });
      setTimeout(() => navigate(`/watch/${video.slug || video.id}`), 1000);
    } catch (error: any) {
      if (uploadMode === 'bunny') {
        setBunnyError({ message: error.message, guidance: error.guidance, statusCode: error.statusCode });
      }
      showToast({ type: 'error', title: 'Upload Failed', message: error.message || 'Failed to publish video.' });
      setUploadStep('idle');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await performUpload();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="pb-4 border-b border-white/10">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Upload className="w-6 h-6 text-amber-400" />
          Creator Studio Upload
        </h1>
        <p className="text-xs text-zinc-400 mt-1">Publish videos through Bunny Stream, UQLOAD, or an external embed URL.</p>
      </div>

      {bunnyError && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <AlertCircle className="w-5 h-5" /> Bunny Stream Upload Error
            </div>
            <button type="button" onClick={() => setBunnyError(null)} className="text-zinc-400 hover:text-white p-1"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-xs text-zinc-300">{bunnyError.guidance || bunnyError.message}</p>
          <a href="https://dash.bunny.net/stream" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300">
            Open Bunny Dashboard <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
        <div>
          <p className="font-semibold text-amber-300">Lawful, Consensual & Copyright Standards</p>
          <p className="text-[11px] text-amber-200/80 mt-1 leading-relaxed">Only upload media you own or are licensed to distribute. Copyright piracy, non-consensual content, and illegal media are prohibited.</p>
        </div>
      </div>

      {isAdmin && (
        <div className="flex bg-[#0a0a0a] border border-white/10 rounded-xl p-1">
          {(['bunny', 'uqload', 'embed'] as UploadMode[]).map((mode) => (
            <button key={mode} type="button" onClick={() => setUploadMode(mode)} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${uploadMode === mode ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-400 hover:text-white'}`}>
              {mode === 'bunny' ? 'Bunny Stream' : mode === 'uqload' ? 'UQLOAD Stream' : 'Any Embed Link'}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {uploadMode === 'embed' ? (
          <div className="p-6 rounded-3xl bg-[#0a0a0a] border border-white/10 space-y-4">
            <label className="block text-sm font-bold text-white">Embed Code or URL</label>
            <textarea value={embedUrl} onChange={(event) => setEmbedUrl(event.target.value)} placeholder="<iframe src=\"https://example.com/embed/...\"></iframe>" className="w-full h-32 px-4 py-3 rounded-xl bg-black border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
          </div>
        ) : (
          !selectedFile ? (
            <div onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} className={`border border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${isDragging ? 'border-amber-400 bg-amber-500/10' : 'border-white/10 hover:border-white/20 bg-[#0a0a0a]'}`}>
              <input ref={fileInputRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska" onChange={(event) => handleFileSelect(event.target.files?.[0])} className="hidden" />
              <div className="w-16 h-16 rounded-2xl bg-[#141414] border border-white/10 text-amber-400 flex items-center justify-center mx-auto mb-4"><Upload className="w-8 h-8" /></div>
              <h3 className="font-bold text-base text-white">Select or drag a video file here</h3>
              <p className="text-xs text-zinc-400 mt-1">MP4, WebM, MOV, or MKV up to 1GB</p>
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#161616] border border-white/10 text-[11px] text-zinc-300"><Sparkles className="w-3.5 h-3.5 text-amber-400" /> HLS transcoding via Bunny Stream</div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center"><FileVideo className="w-5 h-5" /></div><div><p className="text-xs font-semibold text-zinc-200">{selectedFile.name}</p><p className="text-[10px] text-zinc-500">{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</p></div></div>
              {!isUploading && <button type="button" onClick={() => setSelectedFile(null)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"><X className="w-4 h-4" /></button>}
            </div>
          )
        )}

        {isUploading && (
          <div className="p-5 rounded-2xl bg-[#0a0a0a] border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs"><span className="font-semibold text-amber-400">{uploadStep === 'authorizing' ? 'Authorizing upload...' : uploadStep === 'uploading' ? 'Uploading video...' : uploadStep === 'transcoding' ? 'Processing video...' : 'Completed!'}</span><span className="font-mono text-zinc-300">{uploadProgress}%</span></div>
            <div className="w-full h-2 bg-[#1a1a1a] rounded-full overflow-hidden"><div className="h-full bg-amber-500 transition-all duration-300 rounded-full" style={{ width: `${uploadProgress}%` }} /></div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2"><label className="block text-xs font-semibold text-zinc-300 mb-1.5">Video Title <span className="text-rose-400">*</span></label><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Video title" className="w-full h-11 px-4 rounded-xl bg-[#0a0a0a] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500" required /></div>
          <div className="md:col-span-2"><label className="block text-xs font-semibold text-zinc-300 mb-1.5">Description</label><textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe your video..." className="w-full p-3 rounded-xl bg-[#0a0a0a] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500" /></div>
          <div><label className="block text-xs font-semibold text-zinc-300 mb-1.5">Category</label><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="w-full h-11 px-3 rounded-xl bg-[#0a0a0a] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"><option value="">No category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
          <div><label className="block text-xs font-semibold text-zinc-300 mb-1.5">Visibility</label><select value={visibility} onChange={(event) => setVisibility(event.target.value as typeof visibility)} className="w-full h-11 px-3 rounded-xl bg-[#0a0a0a] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option></select></div>
          <div className="md:col-span-2 p-4 rounded-2xl bg-[#0a0a0a] border border-white/5 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer text-xs text-zinc-300"><input type="checkbox" checked={isAgeRestricted} onChange={(event) => setIsAgeRestricted(event.target.checked)} className="w-4 h-4" /> Mark as <strong>Age-Restricted (18+)</strong></label>
            <label className="flex items-center gap-3 cursor-pointer text-xs text-zinc-300"><input type="checkbox" checked={allowComments} onChange={(event) => setAllowComments(event.target.checked)} className="w-4 h-4" /> Allow viewer comments</label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <button type="button" onClick={() => navigate('/dashboard')} className="px-5 py-2.5 rounded-xl border border-white/10 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5">Cancel</button>
          <button type="submit" disabled={isUploading || (uploadMode !== 'embed' && !selectedFile) || (uploadMode === 'embed' && !embedUrl.trim())} className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold disabled:opacity-50 flex items-center gap-2"><RefreshCw className={`w-3.5 h-3.5 ${isUploading ? 'animate-spin' : ''}`} />{isUploading ? 'Publishing...' : 'Publish Video'}</button>
        </div>
      </form>
    </div>
  );
};

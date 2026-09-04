import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  FileVideo, 
  CheckCircle, 
  AlertCircle, 
  ShieldAlert, 
  Sparkles,
  Layers,
  HelpCircle,
  X,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { videoService } from '../services/videoService';
import { 
  initBunnyVideoUpload, 
  uploadVideoBinary, 
  checkBunnyVideoStatus,
  getBunnyHlsUrl,
  getBunnyThumbnailUrl,
  getBunnyPreviewUrl 
} from '../lib/bunny';
import { uploadToLulu } from '../lib/lulu';
import { Category, Tag } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export const UploadPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useNotification();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<"bunny" | "lulu" | "uqload" | "good">("bunny");
  const [embedUrl, setEmbedUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [isAgeRestricted, setIsAgeRestricted] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [autoFallback, setAutoFallback] = useState(true);

  // Bunny diagnostic error state
  const [bunnyError, setBunnyError] = useState<{
    message: string;
    guidance?: string;
    statusCode?: number;
  } | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState<'idle' | 'authorizing' | 'uploading' | 'transcoding' | 'done'>('idle');

  useEffect(() => {
    async function loadCategories() {
      const cats = await videoService.getCategories();
      setCategories(cats);
      if (cats.length > 0) setCategoryId(cats[0].id);
    }
    loadCategories();
  }, []);

  const handleFileSelect = (file: File) => {
    // Validate file type
    const validExtensions = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
    const hasValidExt = validExtensions.includes(file.type) || /\.(mp4|webm|mov|mkv)$/i.test(file.name);

    if (!hasValidExt) {
      showToast({
        type: 'error',
        title: 'Unsupported Format',
        message: 'Please select a standard video file (MP4, WebM, MOV, or MKV).',
      });
      return;
    }

    // Supabase Free projects currently cap individual Storage objects at 50 MB.
    if (file.size > 50 * 1024 * 1024) {
      showToast({
        type: 'error',
        title: 'File Too Large',
        message: 'Uqload uploads are currently limited to 50 MB on this Supabase Free project.',
      });
      return;
    }

    setSelectedFile(file);
    if (!title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const performUpload = async (forceSimulated: boolean = false) => {
    

    if (!title.trim()) {
      showToast({ type: 'error', title: 'Title Required' });
      return;
    }

    if (uploadMode === 'bunny' && !selectedFile) {
      showToast({ type: 'error', title: 'Video File Required' });
      return;
    }
    
    if (uploadMode === 'lulu' && !selectedFile) {
      showToast({ type: 'error', title: 'Video File Required for Lulu Stream' });
      return;
    }
    
    if (uploadMode === 'uqload' && !selectedFile) {
      showToast({ type: 'error', title: 'Video File Required for Uqload Stream' });
      return;
    }

    if (uploadMode === 'good' && !embedUrl.trim()) {
      showToast({ type: 'error', title: 'Embed URL Required' });
      return;
    }

    setIsUploading(true);
    setUploadStep('authorizing');
    setUploadProgress(10);
    setBunnyError(null);

    try {
      if (uploadMode === 'good') {
        setUploadStep('done');
        let finalEmbedUrl = embedUrl;
        const srcMatch = embedUrl.match(/src\s*=\s*["'](.*?)["']/i);
        if (srcMatch && srcMatch[1]) {
          finalEmbedUrl = srcMatch[1];
        }

        const newVideo = await videoService.createVideo({
          title: title.trim(),
          description: description.trim(),
          category_id: categoryId,
          creator_id: user?.id || 'anonymous_user',
          visibility,
          moderation_status: 'published',
          is_age_restricted: isAgeRestricted,
          allow_comments: allowComments,
          bunny_video_id: 'embed',
          video_url: finalEmbedUrl,
          thumbnail_url: 'https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=800&auto=format&fit=crop&q=80',
          preview_animation_url: 'https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=800&auto=format&fit=crop&q=80',
          duration: 0,
        });
        
        showToast({ type: 'success', title: 'Embed Successful', message: 'Your video embed was published.' });
        setTimeout(() => {
          navigate(`/watch/${newVideo.slug || newVideo.id}`);
        }, 1200);
        return;
      }

      if (uploadMode === 'lulu' && selectedFile) {
        setUploadStep('uploading');
        setUploadProgress(0);

        const luluResult = await uploadToLulu({
          file: selectedFile,
          title: title.trim(),
          onProgress: (percent) => setUploadProgress(percent),
        });

        setUploadStep('done');

        const newVideo = await videoService.createVideo({
          title: title.trim(),
          description: description.trim(),
          category_id: categoryId,
          creator_id: user?.id || 'anonymous_user',
          visibility,
          moderation_status: 'published',
          is_age_restricted: isAgeRestricted,
          allow_comments: allowComments,
          bunny_video_id: 'embed',
          video_url: luluResult.embedUrl,
          thumbnail_url: 'https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=800&auto=format&fit=crop&q=80',
          preview_animation_url: 'https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=800&auto=format&fit=crop&q=80',
          duration: 0,
        });
        
        showToast({ type: 'success', title: 'Upload Successful', message: 'Your video is now on Lulu Stream.' });
        setTimeout(() => {
          navigate(`/watch/${newVideo.slug || newVideo.id}`);
        }, 1200);
        return;
      }

      if (uploadMode === 'uqload' && selectedFile) {
        setUploadStep('uploading');
        setUploadProgress(0);

        // Direct browser -> Uqload upload. Supabase Storage and the Worker
        // do not receive the video bytes.
        const serverResponse = await fetch('/api/uqload/upload-server');
        const serverConfig = await serverResponse.json().catch(() => ({}));

        if (!serverResponse.ok || !serverConfig.uploadUrl || !serverConfig.apiKey) {
          throw new Error(serverConfig.error || 'Failed to get Uqload upload server.');
        }

        const result = await new Promise<any>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', serverConfig.uploadUrl);

          const form = new FormData();
          form.append('key', serverConfig.apiKey);
          form.append('file_title', title.trim());
          form.append('file_public', '1');
          form.append('file_adult', isAgeRestricted ? '1' : '0');
          form.append('html_redirect', '0');
          form.append('file', selectedFile, selectedFile.name);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              setUploadProgress(Math.round((event.loaded / event.total) * 98));
            }
          };

          xhr.onload = () => {
            let payload: any = {};
            try { payload = JSON.parse(xhr.responseText || '{}'); }
            catch { reject(new Error('Invalid JSON response from Uqload.')); return; }
            const uploaded = payload?.files?.[0];
            if (xhr.status >= 200 && xhr.status < 300 && payload.status === 200 && uploaded?.filecode) {
              resolve(uploaded);
            } else {
              reject(new Error(uploaded?.status || payload.msg || 'Uqload upload failed (' + xhr.status + ')'));
            }
          };
          xhr.onerror = () => reject(new Error('Uqload upload network error.'));
          xhr.onabort = () => reject(new Error('Uqload upload was cancelled.'));
          xhr.send(form);
        });

        setUploadProgress(100);
        setUploadStep('done');
        const embedUrl = 'https://uqload.vc/e/' + result.filecode;

        const newVideo = await videoService.createVideo({
          title: title.trim(), description: description.trim(), category_id: categoryId,
          creator_id: user?.id || 'anonymous_user', visibility, moderation_status: 'published',
          is_age_restricted: isAgeRestricted, allow_comments: allowComments, bunny_video_id: 'uqload',
          video_url: embedUrl,
          thumbnail_url: 'https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=800&auto=format&fit=crop&q=80',
          preview_animation_url: 'https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=800&auto=format&fit=crop&q=80',
          duration: 0,
        });

        showToast({ type: 'success', title: 'Upload Successful', message: 'Your video has been uploaded directly to Uqload.' });
        setTimeout(() => navigate('/watch/' + (newVideo.slug || newVideo.id)), 1200);
        return;
      }

      // 1. Authorize + upload on Bunny Stream (primary host). If Bunny fails
      // at either step and Auto-Resilience is on, fall back to LuluStream
      // as a real secondary host — only if Lulu also fails do we drop to
      // the simulated demo stream as a last resort.
      let videoRecord: {
        provider: 'bunny' | 'lulu' | 'simulated';
        bunnyVideoId: string;
        videoUrl: string;
        thumbnailUrl: string;
        previewUrl?: string;
        duration: number;
      };

      const runBunnyUpload = async (simulated: boolean) => {
        const bunnyInit = await initBunnyVideoUpload(title.trim(), simulated);

        setUploadStep('uploading');
        await uploadVideoBinary({
          file: selectedFile as File,
          uploadUrl: bunnyInit.uploadUrl,
          proxyUploadUrl: bunnyInit.proxyUploadUrl,
          onProgress: (percent) => {
            setUploadProgress(percent);
            if (percent >= 98) setUploadStep('transcoding');
          },
        });

        setUploadProgress(100);
        setUploadStep('transcoding');
        await new Promise((r) => setTimeout(r, 1500));

        const isSimulated = Boolean(bunnyInit.isSimulated || bunnyInit.videoId.startsWith('bny_'));
        return {
          provider: isSimulated ? ('simulated' as const) : ('bunny' as const),
          bunnyVideoId: bunnyInit.videoId,
          videoUrl: isSimulated
            ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
            : getBunnyHlsUrl(bunnyInit.videoId, bunnyInit.cdnHostname),
          thumbnailUrl: isSimulated
            ? 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=1280&auto=format&fit=crop&q=85'
            : getBunnyThumbnailUrl(bunnyInit.videoId, bunnyInit.cdnHostname),
          previewUrl: isSimulated
            ? 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=640&auto=format&fit=crop&q=80'
            : getBunnyPreviewUrl(bunnyInit.videoId, bunnyInit.cdnHostname),
          duration: 180,
        };
      };

      const runLuluBackupUpload = async () => {
        setUploadStep('authorizing');
        setUploadProgress(0);
        const luluResult = await uploadToLulu({
          file: selectedFile as File,
          title: title.trim(),
          onProgress: (percent) => {
            setUploadProgress(percent);
            if (percent >= 98) setUploadStep('transcoding');
          },
        });
        return {
          provider: 'lulu' as const,
          bunnyVideoId: 'embed',
          videoUrl: luluResult.embedUrl,
          thumbnailUrl: 'https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=800&auto=format&fit=crop&q=80',
          previewUrl: undefined,
          duration: 0,
        };
      };

      try {
        videoRecord = await runBunnyUpload(forceSimulated);
      } catch (bunnyErr: any) {
        if (forceSimulated || !autoFallback) {
          setBunnyError({
            message: bunnyErr.message,
            guidance: bunnyErr.guidance,
            statusCode: bunnyErr.statusCode,
          });
          throw bunnyErr;
        }

        console.warn('Bunny Stream failed, trying LuluStream backup host:', bunnyErr);
        showToast({
          type: 'warning',
          title: 'Switching to Backup Host',
          message: 'Bunny Stream is unavailable — uploading to the LuluStream backup instead.',
        });

        try {
          videoRecord = await runLuluBackupUpload();
        } catch (luluErr: any) {
          console.warn('LuluStream backup also failed, using demo stream mode:', luluErr);
          showToast({
            type: 'warning',
            title: 'Resilient Mode Activated',
            message: 'Bunny Stream and the LuluStream backup are both unavailable. Video will be published in demo stream mode so you can watch immediately.',
          });
          videoRecord = await runBunnyUpload(true);
        }
      }

      // Store video metadata in database
      const newVideo = await videoService.createVideo({
        title: title.trim(),
        description: description.trim(),
        category_id: categoryId,
        creator_id: user?.id || 'anonymous_user',
        visibility,
        moderation_status: 'published',
        is_age_restricted: isAgeRestricted,
        allow_comments: allowComments,
        bunny_video_id: videoRecord.bunnyVideoId,
        video_url: videoRecord.videoUrl,
        thumbnail_url: videoRecord.thumbnailUrl,
        preview_animation_url: videoRecord.previewUrl,
        duration: videoRecord.duration,
      });

      setUploadStep('done');
      const successMessages: Record<typeof videoRecord.provider, string> = {
        bunny: 'Your stream is live on Bunny CDN.',
        lulu: 'Your stream is live on the LuluStream backup host.',
        simulated: 'Video published and ready to watch.',
      };
      showToast({
        type: 'success',
        title: 'Video Published!',
        message: successMessages[videoRecord.provider],
      });
      setTimeout(() => {
        navigate(`/watch/${newVideo.slug || newVideo.id}`);
      }, 1200);

    } catch (err: any) {
      showToast({ 
         type: 'error', 
         title: 'Upload Failed', 
         message: err.guidance || err.message || 'Failed to create video.'
      });
      setIsUploading(false);
      setUploadStep('idle');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performUpload(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="pb-4 border-b border-white/10">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Upload className="w-6 h-6 text-amber-400" />
          Creator Studio Upload
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Upload video for adaptive transcoding, HLS CDN streaming, and global delivery via Bunny Stream.
        </p>
      </div>

      {/* Bunny API Diagnostic Notice if error occurred */}
      {bunnyError && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-white space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Bunny Stream Configuration Error</span>
            </div>
            <button
              type="button"
              onClick={() => setBunnyError(null)}
              className="text-zinc-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-zinc-300 space-y-1.5 leading-relaxed">
            <p className="font-semibold text-red-300">{bunnyError.guidance || bunnyError.message}</p>
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1 text-[11px] font-mono">
              <p className="text-amber-300 font-sans font-bold">📌 Bunny Stream အသုံးပြုနည်း လမ်းညွှန်ချက်:</p>
              <p>1. <strong>BUNNY_API_KEY:</strong> Account API Key မဟုတ်ဘဲ Bunny Dashboard &gt; Stream &gt; [သင့် Video Library] &gt; API ထဲရှိ <strong>Library API Key</strong> ကို အသုံးပြုရပါမည်။</p>
              <p>2. <strong>BUNNY_LIBRARY_ID:</strong> Library နာမည်မဟုတ်ဘဲ ဂဏန်းနံပါတ် (ဥပမာ- <code>348123</code>) ဖြစ်ရပါမည်။</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => performUpload(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Continue Upload in Prototype Mode (စမ်းသပ်မုဒ်ဖြင့် တိုက်ရိုက်တင်မည်)
            </button>
            <a
              href="https://dash.bunny.net/stream"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-xs text-zinc-300 flex items-center gap-1.5 transition-colors"
            >
              <span>Open Bunny Dashboard</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </a>
          </div>
        </div>
      )}

      {/* Compliance & Content Warning Notice */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-300">Lawful, Consensual & Copyright Standards</p>
          <p className="text-[11px] text-amber-200/80 leading-relaxed">
            By uploading, you affirm that you own or have obtained all necessary licenses and model releases for this media. Any copyrighted piracy, non-consensual content, or illegal media is strictly forbidden and subject to instant automated takedown and account termination.
          </p>
        </div>
      </div>

      
      {/* Upload Mode Switcher */}
      <div className="flex bg-[#0a0a0a] border border-white/10 rounded-xl p-1 mb-6">
        <button
          type="button"
          onClick={() => setUploadMode('bunny')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${uploadMode === 'bunny' ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-400 hover:text-white'}`}
        >
          Bunny Stream
        </button>
        <button
          type="button"
          onClick={() => setUploadMode('lulu')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${uploadMode === 'lulu' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:text-white'}`}
        >
          Lulu Stream
        </button>
        <button
          type="button"
          onClick={() => setUploadMode('uqload')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${uploadMode === 'uqload' ? 'bg-purple-500/20 text-purple-400' : 'text-zinc-400 hover:text-white'}`}
        >
          Uqload Stream
        </button>
        <button
          type="button"
          onClick={() => setUploadMode('good')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${uploadMode === 'good' ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-400 hover:text-white'}`}
        >Any Embed Link</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Upload Mode conditional rendering */}
        {uploadMode === 'bunny' || uploadMode === 'lulu' || uploadMode === 'uqload' ? (
          !selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-amber-400 bg-amber-500/10'
                  : 'border-white/10 hover:border-white/20 bg-[#0a0a0a] hover:bg-[#0e0e0e]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-2xl bg-[#141414] border border-white/10 text-amber-400 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-base text-white">Select or Drag video file here</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Supports MP4, WebM, MOV, or MKV up to 1GB
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#161616] border border-white/10 text-[11px] font-mono text-zinc-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Auto-transcoded to 1080p, 720p & 480p HLS
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <FileVideo className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-200">{selectedFile.name}</p>
                  <p className="text-[10px] text-zinc-500">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB • Ready for Bunny upload
                  </p>
                </div>
              </div>
              {!isUploading && (
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )
        ) : (
          <div className="p-6 rounded-3xl bg-[#0a0a0a] border border-white/10 space-y-4">
            <label className="block text-sm font-bold text-white uppercase tracking-wider mb-2">Good Stream Embed Code or URL</label>
            <textarea
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              placeholder={'<iframe src="https://goodstream.com/embed/..." ...></iframe>'}
              className="w-full h-32 px-4 py-3 rounded-xl bg-black border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            <p className="text-xs text-zinc-400">Paste an iframe code or direct embed URL from a third-party streaming site.</p>
          </div>
        )}

        {/* Upload Progress Bar when uploading */}
        {isUploading && (
          <div className="p-5 rounded-2xl bg-[#0a0a0a] border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-400 capitalize">
                Step: {uploadStep === 'authorizing' ? 'Contacting Bunny Stream API...' : uploadStep === 'uploading' ? 'Uploading direct to CDN...' : uploadStep === 'transcoding' ? 'Processing adaptive HLS tracks...' : 'Completed!'}
              </span>
              <span className="font-mono text-zinc-300">{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300 rounded-full shadow-lg shadow-amber-500/40"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Metadata Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Video Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Real-Time Procedural Shaders with WebGL"
              className="w-full h-10 px-3.5 rounded-xl bg-[#0a0a0a] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your stream, equipment, source code links, or chapters..."
              className="w-full p-3 rounded-xl bg-[#0a0a0a] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Category
            </label>
            <select
              value={categoryId || ''}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#0a0a0a] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Visibility
            </label>
            <select
              value={visibility || 'public'}
              onChange={(e) => setVisibility(e.target.value as any)}
              className="w-full h-10 px-3 rounded-xl bg-[#0a0a0a] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
            >
              <option value="public">Public (Listed & Searchable)</option>
              <option value="unlisted">Unlisted (Anyone with link can watch)</option>
              <option value="private">Private (Only you can view)</option>
            </select>
          </div>

          {/* Safety & Content Toggles */}
          <div className="md:col-span-2 p-4 rounded-2xl bg-[#0a0a0a] border border-white/5 space-y-3">
            <h4 className="text-xs font-semibold text-white">Delivery & Content Controls</h4>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoFallback}
                onChange={(e) => setAutoFallback(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-[#050505] border-white/20 focus:ring-amber-500"
              />
              <span className="text-xs text-zinc-300">
                <strong>Auto-Resilience (အလိုအလျောက် backup host):</strong> Bunny Stream ချိတ်ဆက်မှု အဆင်မပြေပါက LuluStream backup host ကို အလိုအလျောက် ပြောင်းပြီး တင်ပေးမည်။ Lulu ပါ မအောင်မြင်မှသာ demo mode ကို အသုံးပြုမည်။
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isAgeRestricted}
                onChange={(e) => setIsAgeRestricted(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-[#050505] border-white/20 focus:ring-amber-500"
              />
              <span className="text-xs text-zinc-300">
                Mark as <strong>Age-Restricted (18+)</strong>. Displays required age verification before playback.
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowComments}
                onChange={(e) => setAllowComments(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-[#050505] border-white/20 focus:ring-amber-500"
              />
              <span className="text-xs text-zinc-300">
                Allow viewer comments and discussions.
              </span>
            </label>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 rounded-xl border border-white/10 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isUploading || ((uploadMode === "bunny" || uploadMode === "lulu" || uploadMode === "uqload") && !selectedFile) || (uploadMode === "good" && !embedUrl)}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20"
          >
            {isUploading ? 'Publishing Video...' : 'Publish to cornmm'}
          </button>
        </div>
      </form>
    </div>
  );
};
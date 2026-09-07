import React, { useEffect, useRef, useState } from 'react';
import { Upload, X, Sparkles, Link as LinkIcon, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createVideo, videoService } from '../services/videoService';
import { initBunnyVideoUpload, uploadVideoBinary, getBunnyHlsUrl, getBunnyThumbnailUrl, getBunnyPreviewUrl } from '../lib/bunny';
import type { Category } from '../types';

type UploadMode = 'bunny' | 'uqload' | 'embed';

const getEmbedSource = (value: string) => {
  const trimmed = value.trim();
  const iframeMatch = trimmed.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  return iframeMatch?.[1] || trimmed;
};

const extractUqloadFileCode = (payload: any) => {
  const file = payload?.files?.[0];
  return file?.filecode || file?.fileCode || payload?.filecode || payload?.fileCode || null;
};

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

  useEffect(() => {
    if (!isAdmin) return;
    videoService.getCategories().then(setCategories).catch(() => setCategories([]));
  }, [isAdmin]);

  const handleFileSelect = (file?: File) => {
    setError('');
    setSuccess('');
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file.');
      return;
    }
    if (file.size > 1024 * 1024 * 1024) {
      setError('Video file must be 1GB or smaller.');
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFileSelect(event.dataTransfer.files?.[0]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!user) {
      setError('Please sign in before uploading.');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a title.');
      return;
    }

    try {
      setIsUploading(true);

      if (uploadMode === 'embed') {
        const source = getEmbedSource(embedUrl);
        if (!/^https?:\/\//i.test(source)) throw new Error('Please enter a valid HTTP(S) embed URL or iframe code.');
        await createVideo({
          title: title.trim(),
          description: description.trim(),
          category_id: categoryId || undefined,
          creator_id: user.id,
          video_url: source,
          thumbnail_url: '',
          preview_animation_url: '',
          provider: 'embed',
          is_published: true,
        });
        setSuccess('Embed video added successfully.');
      } else if (uploadMode === 'bunny') {
        if (!selectedFile) throw new Error('Please select a video file.');
        const upload = await initBunnyVideoUpload(title.trim());
        await uploadVideoBinary(upload.proxyUploadUrl, selectedFile);
        const videoId = upload.videoId;
        await createVideo({
          title: title.trim(),
          description: description.trim(),
          category_id: categoryId || undefined,
          creator_id: user.id,
          video_url: getBunnyHlsUrl(upload.libraryId, videoId),
          thumbnail_url: getBunnyThumbnailUrl(upload.libraryId, videoId),
          preview_animation_url: getBunnyPreviewUrl(upload.libraryId, videoId),
          provider: 'bunny',
          provider_id: videoId,
          is_published: true,
        });
        setSuccess('Bunny Stream upload completed successfully.');
      } else {
        if (!selectedFile) throw new Error('Please select a video file.');
        const session = await import('../lib/supabase').then(({ supabase }) => supabase.auth.getSession());
        const token = session.data.session?.access_token;
        if (!token) throw new Error('Your session has expired. Please sign in again.');

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', title.trim());

        const response = await new Promise<any>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/uqload/proxy-upload');
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.onload = () => {
            try {
              const data = JSON.parse(xhr.responseText || '{}');
              if (xhr.status >= 200 && xhr.status < 300) resolve(data);
              else reject(new Error(data?.error || data?.message || `UQLOAD upload failed (${xhr.status}).`));
            } catch {
              reject(new Error(`UQLOAD upload failed (${xhr.status}).`));
            }
          };
          xhr.onerror = () => reject(new Error('Network error while uploading to UQLOAD.'));
          xhr.send(formData);
        });

        const fileCode = extractUqloadFileCode(response);
        if (!fileCode) throw new Error('UQLOAD did not return a file code.');
        await createVideo({
          title: title.trim(),
          description: description.trim(),
          category_id: categoryId || undefined,
          creator_id: user.id,
          video_url: `https://uqload.vc/e/${fileCode}`,
          thumbnail_url: '',
          preview_animation_url: '',
          provider: 'uqload',
          provider_id: fileCode,
          is_published: true,
        });
        setSuccess('UQLOAD upload completed successfully.');
      }

      setTitle('');
      setDescription('');
      setCategoryId('');
      setSelectedFile(null);
      setEmbedUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center text-zinc-400">Admin access required.</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-black">Upload Video</h1>
          <p className="text-sm text-zinc-400 mt-1">Upload through Bunny Stream, UQLOAD, or add an external embed link.</p>
        </div>

        <div className="flex bg-[#0a0a0a] border border-white/10 rounded-xl p-1">
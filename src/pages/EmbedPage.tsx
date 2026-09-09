import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { videoService } from '../services/videoService';
import { VideoPlayer } from '../components/video/VideoPlayer';
import type { Video } from '../types';

export default function EmbedPage() {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<Video | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    videoService.getVideoById(id).then(v => {
      if (!v) setError('Video not found.');
      else setVideo(v);
    }).catch(e => setError(e instanceof Error ? e.message : 'Failed to load video.'));
  }, [id]);

  if (error) return <div className="min-h-screen bg-black text-white flex items-center justify-center p-6"><div className="text-sm text-red-300">{error}</div></div>;
  if (!video) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;

  return <div className="min-h-screen bg-black flex items-center justify-center p-0"><div className="w-full max-w-6xl"><VideoPlayer video={video} /></div></div>;
}

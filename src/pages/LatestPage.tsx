import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { videoService } from '../services/videoService';
import { Video } from '../types';
import { VideoGrid } from '../components/video/VideoGrid';
import { ReportModal } from '../components/video/ReportModal';
import { ShareModal } from '../components/video/ShareModal';

export const LatestPage: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportVideo, setReportVideo] = useState<Video | null>(null);
  const [shareVideo, setShareVideo] = useState<Video | null>(null);

  useEffect(() => {
    async function loadLatest() {
      setIsLoading(true);
      try {
        const res = await videoService.getVideos({
          sortBy: 'latest',
          pageSize: 24,
        });
        setVideos(res.videos);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    loadLatest();
  }, []);

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-white/10">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2 font-editorial italic">
          <Clock className="w-6 h-6 text-amber-400" />
          Latest Uploads
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Chronological feed of recently approved and published videos.
        </p>
      </div>

      <VideoGrid
        videos={videos}
        isLoading={isLoading}
        onOpenReport={setReportVideo}
        onOpenShare={setShareVideo}
      />

      <ReportModal video={reportVideo} isOpen={Boolean(reportVideo)} onClose={() => setReportVideo(null)} />
      <ShareModal video={shareVideo} isOpen={Boolean(shareVideo)} onClose={() => setShareVideo(null)} />
    </div>
  );
};

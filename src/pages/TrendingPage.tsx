import React, { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { videoService } from '../services/videoService';
import { Video } from '../types';
import { VideoGrid } from '../components/video/VideoGrid';
import { ReportModal } from '../components/video/ReportModal';
import { ShareModal } from '../components/video/ShareModal';

export const TrendingPage: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'all'>('week');
  const [reportVideo, setReportVideo] = useState<Video | null>(null);
  const [shareVideo, setShareVideo] = useState<Video | null>(null);

  useEffect(() => {
    async function loadTrending() {
      setIsLoading(true);
      try {
        const res = await videoService.getVideos({
          sortBy: 'trending',
          pageSize: 24,
        });
        setVideos(res.videos);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    loadTrending();
  }, [timeframe]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 font-editorial italic">
            <Flame className="w-6 h-6 text-amber-400" />
            Trending Videos
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Top momentum and engagement across the decentralized cornmm network.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-[#0a0a0a] border border-white/10 rounded-xl">
          {(['today', 'week', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                timeframe === t ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {t === 'today' ? 'Today' : t === 'week' ? 'This Week' : 'All-Time'}
            </button>
          ))}
        </div>
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

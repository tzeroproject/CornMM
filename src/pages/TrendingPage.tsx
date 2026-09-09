import React, { useEffect, useState } from 'react';
import { Flame, ChevronLeft, ChevronRight } from 'lucide-react';
import { videoService } from '../services/videoService';
import { Video } from '../types';
import { VideoGrid } from '../components/video/VideoGrid';
import { ReportModal } from '../components/video/ReportModal';
import { ShareModal } from '../components/video/ShareModal';

const PAGE_SIZE = 10;

export const TrendingPage: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'all'>('week');
  const [page, setPage] = useState(1);
  const [reportVideo, setReportVideo] = useState<Video | null>(null);
  const [shareVideo, setShareVideo] = useState<Video | null>(null);

  useEffect(() => {
    async function loadTrending() {
      setIsLoading(true);
      try {
        const res = await videoService.getVideos({
          sortBy: 'trending',
          page,
          pageSize: PAGE_SIZE,
        });
        setVideos(res.videos);
        setTotal(res.total);
      } catch (e) {
        console.error(e);
        setVideos([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    }
    loadTrending();
  }, [timeframe, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const changePage = (nextPage: number) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    setPage(safePage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const changeTimeframe = (next: 'today' | 'week' | 'all') => {
    setTimeframe(next);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 font-editorial italic">
            <Flame className="w-6 h-6 text-amber-400" />
            Trending Videos
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Top momentum and engagement across the decentralized StreamSphere network.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-[#0a0a0a] border border-white/10 rounded-xl">
          {(['today', 'week', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => changeTimeframe(t)}
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

      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => changePage(page - 1)}
            disabled={page === 1}
            className="w-9 h-9 rounded-lg border border-white/10 bg-[#0a0a0a] text-zinc-300 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:border-amber-500/40 hover:text-amber-400 transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => changePage(pageNumber)}
              className={`min-w-9 h-9 px-2 rounded-lg border text-xs font-semibold transition-colors ${
                pageNumber === page
                  ? 'bg-amber-500 text-black border-amber-500'
                  : 'bg-[#0a0a0a] text-zinc-400 border-white/10 hover:border-amber-500/40 hover:text-white'
              }`}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            onClick={() => changePage(page + 1)}
            disabled={page === totalPages}
            className="w-9 h-9 rounded-lg border border-white/10 bg-[#0a0a0a] text-zinc-300 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:border-amber-500/40 hover:text-amber-400 transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <ReportModal video={reportVideo} isOpen={Boolean(reportVideo)} onClose={() => setReportVideo(null)} />
      <ShareModal video={shareVideo} isOpen={Boolean(shareVideo)} onClose={() => setShareVideo(null)} />
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Clock, Sparkles, Play, ArrowRight, Compass, ShieldCheck } from 'lucide-react';
import { videoService } from '../services/videoService';
import { interactionService } from '../services/interactionService';
import { Video, Category, WatchHistoryItem } from '../types';
import { VideoGrid } from '../components/video/VideoGrid';
import { ReportModal } from '../components/video/ReportModal';
import { ShareModal } from '../components/video/ShareModal';
import { useAuth } from '../context/AuthContext';

export const HomePage: React.FC = () => {
  const { user } = useAuth();

  const [featuredVideo, setFeaturedVideo] = useState<Video | null>(null);
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const [latestVideos, setLatestVideos] = useState<Video[]>([]);
  const [continueWatching, setContinueWatching] = useState<WatchHistoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [reportVideo, setReportVideo] = useState<Video | null>(null);
  const [shareVideo, setShareVideo] = useState<Video | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [cats, trendingRes, latestRes] = await Promise.all([
          videoService.getCategories(),
          videoService.getVideos({ sortBy: 'trending', pageSize: 8 }),
          videoService.getVideos({ sortBy: 'latest', pageSize: 8 }),
        ]);

        setCategories(cats);
        setTrendingVideos(trendingRes.videos);
        setLatestVideos(latestRes.videos);

        if (trendingRes.videos.length > 0) {
          setFeaturedVideo(trendingRes.videos[0]);
        }

        // Load continue watching for current user
        if (user) {
          const history = await interactionService.getWatchHistory(user.id);
          setContinueWatching(history.slice(0, 4));
        }
      } catch (err) {
        console.error('Failed to load home page data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user]);

  const handleCategoryFilter = async (catId: string) => {
    setSelectedCategory(catId);
    setIsLoading(true);
    const { videos } = await videoService.getVideos({
      categoryId: catId === 'all' ? undefined : catId,
      pageSize: 12,
    });
    setLatestVideos(videos);
    setIsLoading(false);
  };

  return (
    <div className="space-y-10">


      {/* Hero Featured Video Banner */}
      {featuredVideo && selectedCategory === 'all' && (
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 bg-[#0a0a0a] shadow-2xl">
          <div className="absolute inset-0">
            <img
              src={featuredVideo.thumbnail_url}
              alt={featuredVideo.title}
              className="w-full h-full object-cover opacity-35 blur-[2px] scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/70 to-transparent" />
          </div>

          <div className="relative p-6 sm:p-10 lg:p-12 max-w-3xl flex flex-col justify-end min-h-[360px]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-semibold tracking-wider uppercase mb-4 w-fit">
              <Sparkles className="w-3.5 h-3.5" />
              Featured Presentation
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-editorial italic font-bold text-white tracking-tight leading-tight mb-3">
              {featuredVideo.title}
            </h1>

            <p className="text-sm text-zinc-300 line-clamp-2 leading-relaxed mb-6 max-w-2xl font-sans">
              {featuredVideo.description}
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                to={`/watch/${featuredVideo.slug || featuredVideo.id}`}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs sm:text-sm shadow-xl shadow-amber-500/20 hover:scale-[1.02] transition-all uppercase tracking-wider"
              >
                <Play className="w-4 h-4 fill-current" />
                Watch Now
              </Link>

              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <img
                  src={featuredVideo.creator?.avatar_url}
                  alt={featuredVideo.creator?.display_name}
                  className="w-7 h-7 rounded-full object-cover border border-white/10"
                />
                <span className="text-white font-medium">{featuredVideo.creator?.display_name}</span>
                <span>•</span>
                <span>{(featuredVideo.views).toLocaleString()} views</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Continue Watching (if user has active history) */}
      {continueWatching.length > 0 && selectedCategory === 'all' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-3 sm:px-0">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              Continue Watching
            </h2>
            <Link to="/history" className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1">
              View History <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {continueWatching.map((item) => {
              if (!item.video) return null;
              const percent = item.duration_seconds > 0 ? (item.progress_seconds / item.duration_seconds) * 100 : 0;
              return (
                <Link
                  key={item.id}
                  to={`/watch/${item.video.slug || item.video.id}`}
                  className="group relative rounded-xl overflow-hidden bg-[#0a0a0a] border border-white/5 hover:border-white/20 transition-all"
                >
                  <div className="aspect-video relative overflow-hidden bg-black">
                    <img
                      src={item.video.thumbnail_url}
                      alt={item.video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Progress Bar overlay */}
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-[#1a1a1a]">
                      <div className="h-full bg-amber-500" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="text-xs font-semibold text-zinc-200 line-clamp-1 group-hover:text-amber-400 transition-colors">
                      {item.video.title}
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {Math.floor(item.progress_seconds / 60)}m left
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

            )}

      {/* Trending Section */}
      {trendingVideos.length > 0 && selectedCategory === 'all' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-3 sm:px-0">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500 fill-amber-500/20" />
              Trending Now
            </h2>
          </div>
          <VideoGrid
            videos={trendingVideos}
            isLoading={isLoading}
            onOpenReport={setReportVideo}
            onOpenShare={setShareVideo}
          />
        </section>
      )}

      {/* Latest / All Videos */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-3 sm:px-0">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-500" />
            {selectedCategory === 'all' ? 'Latest Uploads' : 'Explore Category'}
          </h2>
        </div>
        <VideoGrid
          videos={latestVideos}
          isLoading={isLoading}
          onOpenReport={setReportVideo}
          onOpenShare={setShareVideo}
        />
      </section>

      {/* Modals */}
      <ReportModal
        video={reportVideo}
        isOpen={Boolean(reportVideo)}
        onClose={() => setReportVideo(null)}
      />

      <ShareModal
        video={shareVideo}
        isOpen={Boolean(shareVideo)}
        onClose={() => setShareVideo(null)}
      />
    </div>
  );
};

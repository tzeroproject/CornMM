import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Clock, Sparkles, Play, ArrowRight, Compass, ChevronLeft, ChevronRight } from 'lucide-react';
import { videoService } from '../services/videoService';
import { interactionService } from '../services/interactionService';
import { Video, Category, WatchHistoryItem } from '../types';
import { VideoGrid } from '../components/video/VideoGrid';
import { ReportModal } from '../components/video/ReportModal';
import { ShareModal } from '../components/video/ShareModal';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZE = 10;

const Pagination: React.FC<{
  page: number;
  total: number;
  onChange: (page: number) => void;
}> = ({ page, total, onChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (totalPages <= 1) return null;

  const changePage = (nextPage: number) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    if (safePage !== page) {
      onChange(safePage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
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
  );
};

export const HomePage: React.FC = () => {
  const { user } = useAuth();

  const [featuredVideo, setFeaturedVideo] = useState<Video | null>(null);
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const [latestVideos, setLatestVideos] = useState<Video[]>([]);
  const [trendingTotal, setTrendingTotal] = useState(0);
  const [latestTotal, setLatestTotal] = useState(0);
  const [categoryTotal, setCategoryTotal] = useState(0);
  const [continueWatching, setContinueWatching] = useState<WatchHistoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [trendingPage, setTrendingPage] = useState(1);
  const [latestPage, setLatestPage] = useState(1);
  const [categoryPage, setCategoryPage] = useState(1);
  const [isTrendingLoading, setIsTrendingLoading] = useState(true);
  const [isLatestLoading, setIsLatestLoading] = useState(true);

  // Modals
  const [reportVideo, setReportVideo] = useState<Video | null>(null);
  const [shareVideo, setShareVideo] = useState<Video | null>(null);

  // Load categories and continue-watching independently.
  useEffect(() => {
    async function loadSupportingData() {
      try {
        const cats = await videoService.getCategories();
        setCategories(cats);

        if (user) {
          const history = await interactionService.getWatchHistory(user.id);
          setContinueWatching(history.slice(0, 4));
        } else {
          setContinueWatching([]);
        }
      } catch (err) {
        console.error('Failed to load home supporting data:', err);
      }
    }

    loadSupportingData();
  }, [user]);

  // Trending: only fetch the requested 10-video page.
  useEffect(() => {
    async function loadTrending() {
      setIsTrendingLoading(true);
      try {
        const res = await videoService.getVideos({
          sortBy: 'trending',
          page: trendingPage,
          pageSize: PAGE_SIZE,
        });
        setTrendingVideos(res.videos);
        setTrendingTotal(res.total);

        if (trendingPage === 1) {
          setFeaturedVideo(res.videos[0] || null);
        }
      } catch (err) {
        console.error('Failed to load home trending videos:', err);
        setTrendingVideos([]);
        setTrendingTotal(0);
        if (trendingPage === 1) setFeaturedVideo(null);
      } finally {
        setIsTrendingLoading(false);
      }
    }

    loadTrending();
  }, [trendingPage]);

  // Latest / category: only fetch the requested 10-video page.
  useEffect(() => {
    async function loadLatest() {
      setIsLatestLoading(true);
      try {
        const res = await videoService.getVideos({
          categoryId: selectedCategory === 'all' ? undefined : selectedCategory,
          sortBy: selectedCategory === 'all' ? 'latest' : undefined,
          page: selectedCategory === 'all' ? latestPage : categoryPage,
          pageSize: PAGE_SIZE,
        });
        setLatestVideos(res.videos);
        if (selectedCategory === 'all') {
          setLatestTotal(res.total);
        } else {
          setCategoryTotal(res.total);
        }
      } catch (err) {
        console.error('Failed to load home latest/category videos:', err);
        setLatestVideos([]);
        if (selectedCategory === 'all') setLatestTotal(0);
        else setCategoryTotal(0);
      } finally {
        setIsLatestLoading(false);
      }
    }

    loadLatest();
  }, [selectedCategory, latestPage, categoryPage]);

  const handleCategoryFilter = (catId: string) => {
    setSelectedCategory(catId);
    setCategoryPage(1);
    setLatestPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const latestTotalForPagination = selectedCategory === 'all' ? latestTotal : categoryTotal;
  const latestPageForPagination = selectedCategory === 'all' ? latestPage : categoryPage;

  return (
    <div className="space-y-10">
      {/* Hero Featured Video Banner */}
      {featuredVideo && selectedCategory === 'all' && trendingPage === 1 && (
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
                <span>{featuredVideo.views.toLocaleString()} views</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Continue Watching */}
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
      <section className="space-y-4">
        <div className="flex items-center justify-between px-3 sm:px-0">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500 fill-amber-500/20" />
            Trending Now
          </h2>
        </div>
        <VideoGrid
          videos={trendingVideos}
          isLoading={isTrendingLoading}
          onOpenReport={setReportVideo}
          onOpenShare={setShareVideo}
        />
        <Pagination page={trendingPage} total={trendingTotal} onChange={setTrendingPage} />
      </section>

      {/* Latest / Category Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3 sm:px-0">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-500" />
            {selectedCategory === 'all' ? 'Latest Uploads' : 'Explore Category'}
          </h2>

          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedCategory === 'all' ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white bg-[#0a0a0a] border border-white/10'
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategoryFilter(category.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    selectedCategory === category.id ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white bg-[#0a0a0a] border border-white/10'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <VideoGrid
          videos={latestVideos}
          isLoading={isLatestLoading}
          onOpenReport={setReportVideo}
          onOpenShare={setShareVideo}
        />
        <Pagination
          page={latestPageForPagination}
          total={latestTotalForPagination}
          onChange={selectedCategory === 'all' ? setLatestPage : setCategoryPage}
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

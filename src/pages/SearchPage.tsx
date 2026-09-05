import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { videoService } from '../services/videoService';
import { Video, Category, Tag } from '../types';
import { VideoGrid } from '../components/video/VideoGrid';
import { ReportModal } from '../components/video/ReportModal';
import { ShareModal } from '../components/video/ShareModal';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const queryParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('cat') || '';
  const tagParam = searchParams.get('tag') || '';
  const sortParam = (searchParams.get('sort') as any) || 'latest';

  const [inputQuery, setInputQuery] = useState(queryParam);
  const [videos, setVideos] = useState<Video[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [reportVideo, setReportVideo] = useState<Video | null>(null);
  const [shareVideo, setShareVideo] = useState<Video | null>(null);

  useEffect(() => {
    async function loadMeta() {
      const [cats, tgs] = await Promise.all([
        videoService.getCategories(),
        videoService.getTags(),
      ]);
      setCategories(cats);
      setTags(tgs);
    }
    loadMeta();
  }, []);

  useEffect(() => {
    setInputQuery(queryParam);
    async function executeSearch() {
      setIsLoading(true);
      try {
        const { videos, total } = await videoService.getVideos({
          searchQuery: queryParam,
          categoryId: categoryParam || undefined,
          tag: tagParam || undefined,
          sortBy: sortParam,
          pageSize: 24,
        });
        setVideos(videos);
        setTotalCount(total);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    executeSearch();
  }, [queryParam, categoryParam, tagParam, sortParam]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (inputQuery.trim()) {
      newParams.set('q', inputQuery.trim());
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams);
  };

  const updateParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  return (
    <div className="space-y-6">
      {/* Search Header Bar */}
      <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-lg space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Search by keywords, title, description, or creator..."
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-[#050505] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
            />
            <Search className="w-5 h-5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
          <button
            type="submit"
            className="px-6 h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Filter Controls Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-3 border-t border-white/5 text-xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Category:</span>
            </div>
            <select
              value={categoryParam}
              onChange={(e) => updateParam('cat', e.target.value)}
              className="bg-[#050505] border border-white/10 rounded-lg px-2.5 py-1.5 text-zinc-300 focus:outline-none focus:border-amber-400"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 text-zinc-400 ml-2">
              <span>Tag:</span>
            </div>
            <select
              value={tagParam}
              onChange={(e) => updateParam('tag', e.target.value)}
              className="bg-[#050505] border border-white/10 rounded-lg px-2.5 py-1.5 text-zinc-300 focus:outline-none focus:border-amber-400"
            >
              <option value="">All Tags</option>
              {tags.map((t) => (
                <option key={t.id} value={t.slug}>#{t.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort by:</span>
            </div>
            <select
              value={sortParam}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="bg-[#050505] border border-white/10 rounded-lg px-2.5 py-1.5 text-zinc-300 focus:outline-none focus:border-amber-400"
            >
              <option value="latest">Latest</option>
              <option value="trending">Trending</option>
              <option value="views">Most Views</option>
              <option value="likes">Most Likes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Meta */}
      <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
        <span>
          Found <strong className="text-white">{totalCount}</strong> results
          {queryParam && <span> for &ldquo;{queryParam}&rdquo;</span>}
        </span>
        {(queryParam || categoryParam || tagParam) && (
          <button
            onClick={() => setSearchParams({})}
            className="text-amber-400 hover:underline cursor-pointer"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Video Grid */}
      <VideoGrid
        videos={videos}
        isLoading={isLoading}
        emptyTitle="No matching videos"
        emptyDescription="Try adjusting your keywords or clearing category filters."
        onOpenReport={setReportVideo}
        onOpenShare={setShareVideo}
      />

      <ReportModal video={reportVideo} isOpen={Boolean(reportVideo)} onClose={() => setReportVideo(null)} />
      <ShareModal video={shareVideo} isOpen={Boolean(shareVideo)} onClose={() => setShareVideo(null)} />
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Grid, ChevronLeft, ChevronRight } from 'lucide-react';
import { videoService } from '../services/videoService';
import { Category, Video } from '../types';
import { VideoGrid } from '../components/video/VideoGrid';
import { SEO } from '../components/SEO';

const PAGE_SIZE = 10;

export const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [slug]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const categories = await videoService.getCategories();
        const found = categories.find((item) => item.slug?.toLowerCase() === slug?.toLowerCase());
        if (!found) {
          if (!cancelled) {
            setCategory(null);
            setVideos([]);
            setTotal(0);
            setError('Category not found');
          }
          return;
        }

        const result = await videoService.getVideos({
          categoryId: found.id,
          page,
          pageSize: PAGE_SIZE,
          sortBy: 'latest',
        });

        if (!cancelled) {
          setCategory(found);
          setVideos(result.videos);
          setTotal(result.total);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load category');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [slug, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const changePage = (nextPage: number) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    setPage(safePage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (error || (!isLoading && !category)) {
    return (
      <div className="py-20 text-center space-y-4">
        <Grid className="w-10 h-10 text-zinc-600 mx-auto" />
        <h1 className="text-xl font-bold text-white">Category not found</h1>
        <Link to="/categories" className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300">
          <ArrowLeft className="w-4 h-4" /> Back to categories
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SEO />
      <div className="pb-4 border-b border-white/10">
        <Link to="/categories" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-amber-400 mb-3 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> All Categories
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 font-editorial italic">
              <Grid className="w-6 h-6 text-amber-400" />
              {category?.name}
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">{category?.description || 'Browse videos in this category.'}</p>
          </div>
          {category && <span className="shrink-0 px-3 py-1.5 rounded-full bg-[#121212] border border-white/10 text-[11px] text-zinc-300">{category.video_count} videos</span>}
        </div>
      </div>

      <VideoGrid
        videos={videos}
        isLoading={isLoading}
        emptyTitle="No videos in this category"
        emptyDescription="Published videos will appear here when they are available."
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
    </div>
  );
};

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Grid, Loader2 } from 'lucide-react';
import { videoService } from '../services/videoService';
import { Category, Video } from '../types';
import { VideoGrid } from '../components/video/VideoGrid';
import { SEO } from '../components/SEO';

const PAGE_SIZE = 20;

export const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      setVideos([]);
      setHasMore(true);
      try {
        const categories = await videoService.getCategories();
        const found = categories.find((item) => item.slug?.toLowerCase() === slug?.toLowerCase());
        if (!found) {
          if (!cancelled) {
            setCategory(null);
            setError('Category not found');
          }
          return;
        }
        const result = await videoService.getVideos({ categoryId: found.id, page: 1, pageSize: PAGE_SIZE, sortBy: 'latest' });
        if (!cancelled) {
          setCategory(found);
          setVideos(result.videos);
          setHasMore(result.videos.length < result.total);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load category');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  const loadMore = useCallback(async () => {
    if (!category || isLoading || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = Math.floor(videos.length / PAGE_SIZE) + 1;
      const result = await videoService.getVideos({ categoryId: category.id, page: nextPage, pageSize: PAGE_SIZE, sortBy: 'latest' });
      setVideos((current) => [...current, ...result.videos]);
      setHasMore(videos.length + result.videos.length < result.total);
    } catch (err) {
      console.error('Failed to load more category videos:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [category, hasMore, isLoading, isLoadingMore, videos.length]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    }, { rootMargin: '600px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

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

      <VideoGrid videos={videos} isLoading={isLoading} emptyTitle="No videos in this category" emptyDescription="Published videos will appear here when they are available." />

      <div ref={sentinelRef} className="h-16 flex items-center justify-center">
        {isLoadingMore && <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />}
        {!isLoadingMore && hasMore && <span className="text-[11px] text-zinc-600">Scroll for more</span>}
        {!isLoadingMore && !hasMore && videos.length > 0 && <span className="text-[11px] text-zinc-600">You reached the end</span>}
      </div>
    </div>
  );
};

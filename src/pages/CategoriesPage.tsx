import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, Video as VideoIcon, ArrowRight } from 'lucide-react';
import { videoService } from '../services/videoService';
import { Category } from '../types';

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        setCategories(await videoService.getCategories());
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-white/10">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2 font-editorial italic">
          <Grid className="w-6 h-6 text-amber-400" />
          Content Categories
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Explore published streams by category.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-44 rounded-2xl bg-[#0a0a0a] border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigate(`/category/${encodeURIComponent(cat.slug)}`)}
              className="group text-left cursor-pointer p-6 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:border-amber-500/40 transition-all hover:bg-[#121212] hover:shadow-xl hover:shadow-black/50 flex flex-col justify-between min-h-44"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                    <VideoIcon className="w-5 h-5" />
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-[#181818] border border-white/10 text-[11px] font-semibold text-zinc-300">
                    {cat.video_count} videos
                  </span>
                </div>
                <h2 className="font-bold text-base text-white group-hover:text-amber-400 transition-colors">{cat.name}</h2>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  {cat.description || 'Explore videos in this category.'}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-white/5 flex items-center text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
                Browse Streams <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

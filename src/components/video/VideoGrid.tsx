import React from 'react';
import { Video } from '../../types';
import { VideoCard } from './VideoCard';
import { Video as VideoIcon } from 'lucide-react';

interface VideoGridProps {
  videos: Video[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onOpenReport?: (video: Video) => void;
  onOpenShare?: (video: Video) => void;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  videos,
  isLoading = false,
  emptyTitle = 'No videos found',
  emptyDescription = 'There are no videos matching this criteria yet.',
  onOpenReport,
  onOpenShare,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col rounded-2xl bg-[#0a0a0a] border border-white/5 overflow-hidden animate-pulse">
            <div className="aspect-video w-full bg-[#141414]" />
            <div className="p-4 flex gap-3">
              <div className="w-9 h-9 rounded-full bg-[#181818] shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[#181818] rounded w-5/6" />
                <div className="h-3 bg-[#181818]/60 rounded w-1/2" />
                <div className="h-3 bg-[#181818]/40 rounded w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="py-16 px-4 text-center rounded-2xl border border-dashed border-white/10 bg-[#0a0a0a] max-w-lg mx-auto my-6">
        <div className="w-12 h-12 rounded-2xl bg-[#141414] border border-white/10 text-zinc-500 flex items-center justify-center mx-auto mb-4">
          <VideoIcon className="w-6 h-6" />
        </div>
        <h3 className="font-semibold text-base text-white">{emptyTitle}</h3>
        <p className="text-xs text-zinc-400 mt-1.5 max-w-sm mx-auto">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 sm:gap-5">
      {videos.map(video => (
        <VideoCard
          key={video.id}
          video={video}
          onOpenReport={onOpenReport}
          onOpenShare={onOpenShare}
        />
      ))}
    </div>
  );
};

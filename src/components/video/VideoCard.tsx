import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Eye, Heart, Clock, MoreVertical, Share2, Flag, Bookmark } from 'lucide-react';
import { Video } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { interactionService } from '../../services/interactionService';
import { useNotification } from '../../context/NotificationContext';

interface VideoCardProps {
  video: Video;
  onOpenReport?: (video: Video) => void;
  onOpenShare?: (video: Video) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, onOpenReport, onOpenShare }) => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [showMenu, setShowMenu] = useState(false);
  const [isFavorited, setIsFavorited] = useState(video.is_favorited || false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      showToast({ type: 'warning', title: 'Sign In Required', message: 'Please sign in to save favorites.' });
      return;
    }
    const state = await interactionService.toggleFavorite(user.id, video.id);
    setIsFavorited(state);
    showToast({
      type: 'success',
      title: state ? 'Added to Favorites' : 'Removed from Favorites',
      message: video.title,
    });
    setShowMenu(false);
  };

  return (
    <div className="group relative flex flex-col rounded-none sm:rounded-2xl bg-[#0a0a0a] border-y border-x-0 sm:border-x border-white/5 hover:border-white/15 transition-all duration-300 overflow-hidden hover:shadow-xl hover:shadow-black">
      {/* Thumbnail Container */}
      <Link to={`/watch/${video.slug || video.id}`} className="relative aspect-video w-full overflow-hidden bg-[#050505]">
        <img
          src={video.thumbnail_url}
          alt={video.title}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1280&auto=format&fit=crop&q=80';
          }}
          className="w-full h-full object-cover scale-110 blur-xl group-hover:scale-105 group-hover:blur-0 transition-all duration-500"
        />

        {/* Duration Badge */}
        <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/85 backdrop-blur-md text-[10px] font-medium text-zinc-200 flex items-center gap-1 border border-white/10 shadow">
          <Clock className="w-3 h-3 text-amber-400" />
          {formatDuration(video.duration)}
        </div>

        {/* Category Pill */}
        {video.category && (
          <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[9px] font-semibold text-zinc-300 border border-white/10 uppercase tracking-wider">
            {video.category.name}
          </div>
        )}

        {/* Age Gate Flag */}
        {video.is_age_restricted && (
          <div className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded bg-amber-500 text-black font-bold text-[9px] tracking-wider uppercase">
            18+
          </div>
        )}

        {/* Pending Review Badge (if viewer is creator or admin) */}
        {video.moderation_status !== 'published' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 text-center">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
              Status: {video.moderation_status.toUpperCase()}
            </span>
          </div>
        )}
      </Link>

      {/* Details Row */}
      <div className="p-3.5 flex items-start gap-3">
        {/* Creator Avatar */}
        <Link to={`/creator/${video.creator?.username || video.creator_id}`} className="shrink-0 mt-0.5">
          <img
            src={video.creator?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
            alt={video.creator?.display_name || 'Creator'}
            className="w-8 h-8 rounded-full object-cover border border-white/10 hover:border-amber-500/50 transition-colors"
          />
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <Link to={`/watch/${video.slug || video.id}`} className="block">
            <h3 className="font-semibold text-sm text-white line-clamp-2 leading-snug group-hover:text-amber-400 transition-colors">
              {video.title}
            </h3>
          </Link>

          <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
            <Link
              to={`/creator/${video.creator?.username || video.creator_id}`}
              className="hover:text-zinc-200 truncate font-medium"
            >
              {video.creator?.display_name}
            </Link>
            {video.creator?.is_verified && (
              <CheckCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400/20" />
            )}
          </div>

          <div className="mt-1 flex items-center gap-2.5 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {formatViews(video.views)}
            </span>
            <span>•</span>
            <span>{formatRelativeDate(video.created_at)}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-zinc-400" />
              {formatViews(video.likes_count)}
            </span>
          </div>
        </div>

        {/* Options Menu Toggle */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-8 w-44 rounded-xl bg-[#0e0e0e] border border-white/10 shadow-2xl p-1 z-30">
              <button
                onClick={handleToggleFavorite}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Bookmark className={`w-4 h-4 ${isFavorited ? 'text-amber-400 fill-amber-400' : ''}`} />
                {isFavorited ? 'Saved to Favorites' : 'Save to Favorites'}
              </button>

              {onOpenShare && (
                <button
                  onClick={() => { setShowMenu(false); onOpenShare(video); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Share Video
                </button>
              )}

              {onOpenReport && (
                <button
                  onClick={() => { setShowMenu(false); onOpenReport(video); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors border-t border-white/5 mt-1"
                >
                  <Flag className="w-4 h-4" />
                  Report Video
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

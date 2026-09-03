import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Heart, 
  Bookmark, 
  Share2, 
  Flag, 
  Eye, 
  Clock, 
  CheckCircle, 
  UserPlus, 
  UserCheck, 
  MessageSquare, 
  Send,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { videoService } from '../services/videoService';
import { interactionService } from '../services/interactionService';
import { Video, Comment } from '../types';
import { VideoPlayer } from '../components/video/VideoPlayer';
import { AgeGateModal } from '../components/video/AgeGateModal';
import { ReportModal } from '../components/video/ReportModal';
import { ShareModal } from '../components/video/ShareModal';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export const WatchPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAgeVerified } = useAuth();
  const { showToast } = useNotification();

  const [video, setVideo] = useState<Video | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // User interactions state
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);

  // Modals
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    async function loadVideoData() {
      if (!id) return;
      setIsLoading(true);
      window.scrollTo(0, 0);

      try {
        const found = await videoService.getVideoById(id);
        if (!found) {
          showToast({ type: 'error', title: 'Video Not Found' });
          navigate('/');
          return;
        }

        setVideo(found);
        setLikesCount(found.likes_count || 0);

        // Check Age Gate requirement
        if (found.is_age_restricted && !isAgeVerified) {
          setShowAgeGate(true);
        }

        // Fetch related videos
        const related = await videoService.getRelatedVideos(found.id, found.category_id, 8);
        setRelatedVideos(related);

        // Fetch comments
        const coms = await interactionService.getComments(found.id);
        setComments(coms);

        // Fetch user interactions if logged in
        if (user) {
          const [liked, faved, subbed] = await Promise.all([
            interactionService.isVideoLiked(user.id, found.id),
            interactionService.isVideoFavorited(user.id, found.id),
            interactionService.isSubscribed(user.id, found.creator_id),
          ]);
          setIsLiked(liked);
          setIsFavorited(faved);
          setIsSubscribed(subbed);
        }

        setSubscriberCount(found.creator?.subscriber_count || 100);
      } catch (err) {
        console.error('Error loading video:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadVideoData();
  }, [id, user, isAgeVerified, navigate, showToast]);

  const handleWatchProgress = useCallback((progress: number, dur: number) => {
    if (user && video) {
      interactionService.recordWatchProgress(user.id, video.id, progress, dur);
    }
  }, [user, video]);

  const handleToggleLike = async () => {
    if (!user) {
      showToast({ type: 'warning', title: 'Sign In Required', message: 'Please sign in to like this stream.' });
      return;
    }
    if (!video) return;

    const { isLiked: nextLiked, newCount } = await interactionService.toggleLike(user.id, video.id);
    setIsLiked(nextLiked);
    setLikesCount(newCount);
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      showToast({ type: 'warning', title: 'Sign In Required', message: 'Please sign in to favorite this video.' });
      return;
    }
    if (!video) return;

    const nextFaved = await interactionService.toggleFavorite(user.id, video.id);
    setIsFavorited(nextFaved);
    showToast({
      type: 'success',
      title: nextFaved ? 'Added to Saved Favorites' : 'Removed from Favorites',
    });
  };

  const handleToggleSubscribe = async () => {
    if (!user) {
      showToast({ type: 'warning', title: 'Sign In Required', message: 'Please sign in to follow creators.' });
      return;
    }
    if (!video) return;

    const { isSubscribed: nextSub, newSubscriberCount } = await interactionService.toggleSubscription(
      user.id,
      video.creator_id
    );
    setIsSubscribed(nextSub);
    setSubscriberCount(newSubscriberCount);
    showToast({
      type: 'success',
      title: nextSub ? 'Subscribed' : 'Unsubscribed',
      message: `Notifications set for ${video.creator?.display_name}`,
    });
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast({ type: 'warning', title: 'Sign In Required', message: 'Sign in to join the conversation.' });
      return;
    }
    if (!video || !newCommentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      const added = await interactionService.addComment(video.id, user, newCommentText.trim());
      setComments([added, ...comments]);
      setNewCommentText('');
      showToast({ type: 'success', title: 'Comment Posted' });
    } catch (e: any) {
      showToast({ type: 'error', title: 'Failed to post comment', message: e.message });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (isLoading || !video) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-zinc-400">Loading stream from Bunny CDN...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left 2 Columns: Video Player, Title, Creator, Actions, Description, Comments */}
      <div className="lg:col-span-2 space-y-6">
        {/* Video Player */}
        <VideoPlayer
          video={video}
          onProgress={handleWatchProgress}
        />

        {/* Video Title */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white leading-snug">
            {video.title}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-4 mt-3 pb-4 border-b border-white/10">
            {/* Creator Row */}
            <div className="flex items-center gap-3">
              <Link to={`/creator/${video.creator?.username || video.creator_id}`}>
                <img
                  src={video.creator?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                  alt={video.creator?.display_name}
                  className="w-11 h-11 rounded-full object-cover border border-white/10 hover:border-amber-500 transition-colors"
                />
              </Link>
              <div>
                <Link
                  to={`/creator/${video.creator?.username || video.creator_id}`}
                  className="font-bold text-sm text-white hover:text-amber-400 flex items-center gap-1.5 transition-colors"
                >
                  {video.creator?.display_name}
                  {video.creator?.is_verified && <CheckCircle className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />}
                </Link>
                <p className="text-xs text-zinc-500 font-mono">
                  {subscriberCount.toLocaleString()} subscribers
                </p>
              </div>

              <button
                onClick={handleToggleSubscribe}
                className={`ml-3 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isSubscribed
                    ? 'bg-[#161616] border border-white/10 text-zinc-300 hover:bg-[#202020]'
                    : 'bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/20'
                }`}
              >
                {isSubscribed ? <UserCheck className="w-4 h-4 text-emerald-400" /> : <UserPlus className="w-4 h-4" />}
                {isSubscribed ? 'Subscribed' : 'Subscribe'}
              </button>
            </div>

            {/* Actions: Like, Favorite, Share, Report */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleLike}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  isLiked
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : 'bg-[#0a0a0a] border-white/10 text-zinc-300 hover:border-white/20 hover:text-white'
                }`}
                title="Like this video"
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-400 text-rose-400' : ''}`} />
                <span>{likesCount.toLocaleString()}</span>
              </button>

              <button
                onClick={handleToggleFavorite}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  isFavorited
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-[#0a0a0a] border-white/10 text-zinc-300 hover:border-white/20 hover:text-white'
                }`}
                title="Save to Favorites"
              >
                <Bookmark className={`w-4 h-4 ${isFavorited ? 'fill-amber-400 text-amber-400' : ''}`} />
                <span className="hidden sm:inline">Save</span>
              </button>

              <button
                onClick={() => setShowShare(true)}
                className="p-2 rounded-xl bg-[#0a0a0a] border border-white/10 text-zinc-300 hover:border-white/20 hover:text-white transition-colors"
                title="Share Video"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowReport(true)}
                className="p-2 rounded-xl bg-[#0a0a0a] border border-white/10 text-zinc-400 hover:text-rose-400 hover:border-rose-900/50 transition-colors"
                title="Report Video"
              >
                <Flag className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Description Box */}
        <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/5 text-xs">
          <div className="flex items-center gap-4 text-zinc-400 font-medium pb-2 border-b border-white/5 mb-2">
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              {(video.views).toLocaleString()} views
            </span>
            <span>•</span>
            <span>Uploaded {new Date(video.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            {video.category && (
              <>
                <span>•</span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300 font-semibold">
                  {video.category.name}
                </span>
              </>
            )}
          </div>

          <p className={`text-zinc-300 leading-relaxed whitespace-pre-line ${descExpanded ? '' : 'line-clamp-3'}`}>
            {video.description || 'No description provided.'}
          </p>

          <button
            onClick={() => setDescExpanded(!descExpanded)}
            className="mt-2 text-amber-400 font-semibold flex items-center gap-1 hover:underline text-[11px]"
          >
            {descExpanded ? <>Show Less <ChevronUp className="w-3 h-3" /></> : <>Show More <ChevronDown className="w-3 h-3" /></>}
          </button>
        </div>

        {/* Comments Section */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              Comments ({comments.length})
            </h3>
          </div>

          {/* New Comment Box */}
          {user ? (
            <form onSubmit={handleAddComment} className="flex gap-3">
              <img
                src={user.avatar_url}
                alt={user.display_name}
                className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0"
              />
              <div className="flex-1 space-y-2">
                <textarea
                  rows={2}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Share your perspective or feedback..."
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
                  maxLength={1000}
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !newCommentText.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold disabled:opacity-50 transition-all shadow-md shadow-amber-500/20"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Comment
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/5 text-center text-xs text-zinc-400">
              <Link to="/login" className="text-amber-400 font-semibold hover:underline">Sign in</Link> to participate in the conversation.
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-3 pt-2">
            {comments.map((c) => (
              <div key={c.id} className="p-3.5 rounded-xl bg-[#0a0a0a] border border-white/5 flex gap-3">
                <img
                  src={c.user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                  alt={c.user.display_name}
                  className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-zinc-200">{c.user.display_name}</span>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Related Videos Stream */}
      <div className="space-y-4">
        <h3 className="font-bold text-sm text-zinc-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Related Streams
        </h3>

        <div className="space-y-3">
          {relatedVideos.map((item) => (
            <Link
              key={item.id}
              to={`/watch/${item.slug || item.id}`}
              className="group flex gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
            >
              <div className="relative aspect-video w-36 rounded-lg overflow-hidden bg-black shrink-0 border border-white/5">
                <img
                  src={item.thumbnail_url}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/85 text-[10px] font-mono text-zinc-200 border border-white/10">
                  {Math.floor(item.duration / 60)}:{item.duration % 60 < 10 ? '0' : ''}{item.duration % 60}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-xs text-zinc-200 line-clamp-2 group-hover:text-amber-400 transition-colors">
                  {item.title}
                </h4>
                <p className="text-[11px] text-zinc-400 truncate mt-1">
                  {item.creator?.display_name}
                </p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {(item.views).toLocaleString()} views
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Modals */}
      <AgeGateModal
        isOpen={showAgeGate}
        onCancel={() => navigate('/')}
        onConfirm={() => setShowAgeGate(false)}
      />

      <ReportModal
        video={video}
        isOpen={showReport}
        onClose={() => setShowReport(false)}
      />

      <ShareModal
        video={video}
        isOpen={showShare}
        onClose={() => setShowShare(false)}
      />
    </div>
  );
};

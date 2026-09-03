import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Trash2, Play, ExternalLink } from 'lucide-react';
import { interactionService } from '../services/interactionService';
import { WatchHistoryItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export const WatchHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      setIsLoading(true);
      const items = await interactionService.getWatchHistory(user.id);
      setHistory(items);
      setIsLoading(false);
    }
    load();
  }, [user]);

  const handleRemoveItem = async (videoId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    await interactionService.removeWatchHistoryItem(user.id, videoId);
    setHistory(history.filter((h) => h.video_id !== videoId));
    showToast({ type: 'success', title: 'Removed from history' });
  };

  const handleClearAll = async () => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to clear your entire watch history?')) return;
    await interactionService.clearWatchHistory(user.id);
    setHistory([]);
    showToast({ type: 'success', title: 'Watch history cleared' });
  };

  if (!user) {
    return (
      <div className="py-20 text-center space-y-3">
        <Clock className="w-10 h-10 text-zinc-600 mx-auto" />
        <h2 className="text-lg font-bold text-white font-editorial italic">Sign In to View Watch History</h2>
        <p className="text-xs text-zinc-400">Keep track of what you’ve watched across all your devices.</p>
        <Link to="/corn-admin-login" className="inline-block px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-400" />
            Watch History
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Resume streams right where you left off.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0a0a0a] hover:bg-rose-950/40 border border-white/10 hover:border-rose-800/60 text-zinc-300 hover:text-rose-400 text-xs font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All History
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-zinc-500 text-xs">Loading history...</div>
      ) : history.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-white/10 bg-[#0a0a0a]">
          <Clock className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="font-semibold text-white">No watch history yet</h3>
          <p className="text-xs text-zinc-500 mt-1">Videos you watch will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => {
            if (!item.video) return null;
            const percent = item.duration_seconds > 0 ? (item.progress_seconds / item.duration_seconds) * 100 : 0;
            return (
              <div
                key={item.id}
                className="group p-3 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:border-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all shadow-md"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <Link
                    to={`/watch/${item.video.slug || item.video.id}`}
                    className="relative aspect-video w-40 rounded-xl overflow-hidden bg-[#050505] border border-white/10 shrink-0"
                  >
                    <img
                      src={item.video.thumbnail_url}
                      alt={item.video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-black/60">
                      <div className="h-full bg-amber-400" style={{ width: `${percent}%` }} />
                    </div>
                  </Link>

                  <div className="min-w-0">
                    <Link
                      to={`/watch/${item.video.slug || item.video.id}`}
                      className="font-semibold text-sm text-white hover:text-amber-400 line-clamp-1 block transition-colors"
                    >
                      {item.video.title}
                    </Link>
                    <p className="text-xs text-zinc-400 mt-1">
                      {item.video.creator?.display_name} • {(item.video.views).toLocaleString()} views
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                      Watched at {new Date(item.last_watched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {Math.floor(item.progress_seconds / 60)}m / {Math.floor(item.duration_seconds / 60)}m
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <Link
                    to={`/watch/${item.video.slug || item.video.id}`}
                    className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Resume
                  </Link>

                  <button
                    onClick={(e) => handleRemoveItem(item.video_id, e)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Remove from history"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

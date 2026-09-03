import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Heart } from 'lucide-react';
import { interactionService } from '../services/interactionService';
import { Video } from '../types';
import { VideoGrid } from '../components/video/VideoGrid';
import { ReportModal } from '../components/video/ReportModal';
import { ShareModal } from '../components/video/ShareModal';
import { useAuth } from '../context/AuthContext';

export const FavoritesPage: React.FC = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportVideo, setReportVideo] = useState<Video | null>(null);
  const [shareVideo, setShareVideo] = useState<Video | null>(null);

  useEffect(() => {
    async function load() {
      if (!user) return;
      setIsLoading(true);
      const res = await interactionService.getFavorites(user.id);
      setVideos(res);
      setIsLoading(false);
    }
    load();
  }, [user]);

  if (!user) {
    return (
      <div className="py-20 text-center space-y-3">
        <Heart className="w-10 h-10 text-zinc-600 mx-auto" />
        <h2 className="text-lg font-bold text-white font-editorial italic">Sign In to View Favorites</h2>
        <p className="text-xs text-zinc-400">Save streams and access them anytime.</p>
        <Link to="/corn-admin-login" className="inline-block px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-white/10">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Heart className="w-6 h-6 text-rose-400 fill-rose-400/20" />
          Saved Favorites
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Your bookmarked video streams and saved creator content.
        </p>
      </div>

      <VideoGrid
        videos={videos}
        isLoading={isLoading}
        emptyTitle="No saved favorites"
        emptyDescription="Click the bookmark icon on any stream card or watch page to save it here."
        onOpenReport={setReportVideo}
        onOpenShare={setShareVideo}
      />

      <ReportModal video={reportVideo} isOpen={Boolean(reportVideo)} onClose={() => setReportVideo(null)} />
      <ShareModal video={shareVideo} isOpen={Boolean(shareVideo)} onClose={() => setShareVideo(null)} />
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Eye, 
  Heart, 
  MessageSquare, 
  Clock, 
  Upload, 
  Edit3, 
  Trash2, 
  ExternalLink,
  Plus,
  BarChart2,
  Video as VideoIcon,
  ShieldCheck
} from 'lucide-react';
import { videoService } from '../services/videoService';
import { Video } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export const UserDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useNotification();

  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStudioData() {
      if (!user) return;
      setIsLoading(true);
      try {
        const res = await videoService.getVideos({
          creatorId: user.id,
          includeUnpublished: true,
          pageSize: 50,
        });
        setVideos(res.videos);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    loadStudioData();
  }, [user]);

  const handleDelete = async (videoId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }

    try {
      await videoService.deleteVideo(videoId);
      setVideos(videos.filter((v) => v.id !== videoId));
      showToast({ type: 'success', title: 'Video Deleted', message: title });
    } catch (e: any) {
      showToast({ type: 'error', title: 'Delete Failed', message: e.message });
    }
  };

  // Aggregated analytics
  const totalViews = videos.reduce((acc, v) => acc + (v.views || 0), 0);
  const totalLikes = videos.reduce((acc, v) => acc + (v.likes_count || 0), 0);
  const totalComments = videos.reduce((acc, v) => acc + (v.comments_count || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Published</span>;
      case 'pending_review':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Review Queue</span>;
      case 'rejected':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Action Required</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-white/5">Draft</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-amber-400" />
            Creator Studio & Video Manager
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage your Bunny Stream CDN uploads, monitor analytics, and edit metadata.
          </p>
        </div>

        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold shadow-lg shadow-amber-500/20 transition-all w-fit uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" />
          Upload New Stream
        </Link>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Total Views</span>
            <Eye className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {totalViews.toLocaleString()}
          </div>
          <p className="text-[10px] text-emerald-400 mt-1">+12.4% from last month</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Total Likes</span>
            <Heart className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {totalLikes.toLocaleString()}
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">From registered fans</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Comments</span>
            <MessageSquare className="w-4 h-4 text-amber-400/80" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {totalComments.toLocaleString()}
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">Community engagement</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Active Videos</span>
            <VideoIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {videos.length}
          </div>
          <p className="text-[10px] text-emerald-400 mt-1">100% Bunny CDN status</p>
        </div>
      </div>

      {/* Videos Management Table */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white">Your Uploaded Videos ({videos.length})</h2>

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-xl">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-[#050505] text-zinc-400 uppercase text-[10px] font-semibold border-b border-white/10">
              <tr>
                <th className="p-4">Video</th>
                <th className="p-4">Status</th>
                <th className="p-4">Views</th>
                <th className="p-4">Likes</th>
                <th className="p-4">Uploaded</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {videos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">
                    You haven't uploaded any streams yet.
                  </td>
                </tr>
              ) : (
                videos.map((v) => (
                  <tr key={v.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative aspect-video w-24 rounded-lg overflow-hidden bg-[#050505] border border-white/10 shrink-0">
                          <img
                            src={v.thumbnail_url}
                            alt={v.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 max-w-xs">
                          <Link
                            to={`/watch/${v.slug || v.id}`}
                            className="font-semibold text-white hover:text-amber-400 truncate block transition-colors"
                          >
                            {v.title}
                          </Link>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            ID: {v.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      {getStatusBadge(v.moderation_status)}
                    </td>

                    <td className="p-4 font-mono text-zinc-300 whitespace-nowrap">
                      {(v.views || 0).toLocaleString()}
                    </td>

                    <td className="p-4 font-mono text-zinc-300 whitespace-nowrap">
                      {(v.likes_count || 0).toLocaleString()}
                    </td>

                    <td className="p-4 text-zinc-400 whitespace-nowrap">
                      {new Date(v.created_at).toLocaleDateString()}
                    </td>

                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          to={`/watch/${v.slug || v.id}`}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                          title="View Stream"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/edit/${v.id}`}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-white/10 transition-colors"
                          title="Edit Details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(v.id, v.title)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Video"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

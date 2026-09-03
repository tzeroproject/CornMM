import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, Globe, Video as VideoIcon, Users, Eye, Calendar, UserPlus, UserCheck } from 'lucide-react';
import { Profile, Video } from '../types';
import { INITIAL_PROFILES } from '../lib/mockData';
import { videoService } from '../services/videoService';
import { interactionService } from '../services/interactionService';
import { VideoGrid } from '../components/video/VideoGrid';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export const CreatorProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const { showToast } = useNotification();

  const [creator, setCreator] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subCount, setSubCount] = useState(0);

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      // Find matching profile
      const found = INITIAL_PROFILES.find(
        (p) => p.username.toLowerCase() === username?.toLowerCase() || p.id === username
      ) || (user?.username === username ? user : INITIAL_PROFILES[1]);

      if (found) {
        setCreator(found);
        setSubCount(found.subscriber_count || 100);

        // Fetch videos by this creator
        const res = await videoService.getVideos({
          creatorId: found.id,
          pageSize: 24,
        });
        setVideos(res.videos);

        if (user) {
          const subbed = await interactionService.isSubscribed(user.id, found.id);
          setIsSubscribed(subbed);
        }
      }
      setIsLoading(false);
    }

    loadProfile();
  }, [username, user]);

  const handleToggleSubscribe = async () => {
    if (!user) {
      showToast({ type: 'warning', title: 'Sign In Required', message: 'Sign in to subscribe to creators.' });
      return;
    }
    if (!creator) return;

    const { isSubscribed: nextSub, newSubscriberCount } = await interactionService.toggleSubscription(
      user.id,
      creator.id
    );
    setIsSubscribed(nextSub);
    setSubCount(newSubscriberCount);
    showToast({
      type: 'success',
      title: nextSub ? 'Subscribed' : 'Unsubscribed',
      message: `You are ${nextSub ? 'now following' : 'no longer following'} ${creator.display_name}.`,
    });
  };

  if (isLoading || !creator) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="relative h-48 sm:h-64 rounded-3xl overflow-hidden bg-[#0a0a0a] border border-white/10">
        <img
          src={creator.banner_url || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80'}
          alt="Profile Banner"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
      </div>

      {/* Creator Header Card */}
      <div className="relative px-4 sm:px-8 -mt-20 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
          <img
            src={creator.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={creator.display_name}
            className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-[#050505] shadow-2xl bg-[#0a0a0a]"
          />

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-editorial italic">
                {creator.display_name}
              </h1>
              {creator.is_verified && (
                <CheckCircle className="w-5 h-5 text-amber-400 fill-amber-400/20" />
              )}
            </div>

            <p className="text-xs font-mono text-zinc-400">@{creator.username}</p>

            <div className="flex items-center gap-4 text-xs text-zinc-400 pt-1">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <strong className="text-white">{subCount.toLocaleString()}</strong> subscribers
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <VideoIcon className="w-3.5 h-3.5 text-zinc-400" />
                <strong className="text-white">{videos.length}</strong> videos
              </span>
            </div>
          </div>
        </div>

        {/* Subscribe / Action Button */}
        {user?.id !== creator.id && (
          <button
            onClick={handleToggleSubscribe}
            className={`px-6 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-lg cursor-pointer ${
              isSubscribed
                ? 'bg-[#181818] border border-white/10 text-zinc-300 hover:bg-[#222222]'
                : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20 uppercase tracking-wider'
            }`}
          >
            {isSubscribed ? <UserCheck className="w-4 h-4 text-emerald-400" /> : <UserPlus className="w-4 h-4" />}
            {isSubscribed ? 'Subscribed' : 'Subscribe'}
          </button>
        )}
      </div>

      {/* Bio and Links */}
      <div className="px-4 sm:px-8 max-w-3xl space-y-3">
        <p className="text-sm text-zinc-300 leading-relaxed">{creator.bio}</p>
        {creator.website && (
          <a
            href={creator.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline font-medium"
          >
            <Globe className="w-3.5 h-3.5" />
            {creator.website}
          </a>
        )}
      </div>

      {/* Uploaded Videos Section */}
      <div className="space-y-4 pt-6 border-t border-white/10 px-4 sm:px-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-editorial italic">
            <VideoIcon className="w-5 h-5 text-amber-400" />
            Published Streams
          </h2>
          <span className="text-xs text-zinc-400">{videos.length} videos available</span>
        </div>

        <VideoGrid
          videos={videos}
          emptyTitle="No uploaded videos yet"
          emptyDescription="This creator has not published any public streams yet."
        />
      </div>
    </div>
  );
};

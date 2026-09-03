import { Comment, Report, ReportReason, WatchHistoryItem, FavoriteItem, Profile } from '../types';
import { supabase, isSupabaseConfigured, isSchemaReady, handleSupabaseError } from '../lib/supabase';
import { videoService } from './videoService';

const STORAGE_LIKES_KEY = 'streamsphere_production_likes_v2';
const STORAGE_FAVORITES_KEY = 'streamsphere_production_favorites_v2';
const STORAGE_HISTORY_KEY = 'streamsphere_production_history_v2';
const STORAGE_COMMENTS_KEY = 'streamsphere_production_comments_v2';
const STORAGE_REPORTS_KEY = 'streamsphere_production_reports_v2';
const STORAGE_SUBSCRIPTIONS_KEY = 'streamsphere_production_subs_v2';

function getLocal<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

export const interactionService = {
  // LIKES
  async isVideoLiked(userId: string, videoId: string): Promise<boolean> {
    if (isSupabaseConfigured && isSchemaReady() && userId) {
      try {
        const { data, error } = await supabase
          .from('likes')
          .select('id')
          .eq('user_id', userId)
          .eq('video_id', videoId)
          .maybeSingle();
        if (error) {
          handleSupabaseError(error, 'isVideoLiked');
        } else if (data) {
          return true;
        } else {
          return false;
        }
      } catch (err) {
        handleSupabaseError(err, 'isVideoLiked catch');
      }
    }

    const likes = getLocal<string[]>(STORAGE_LIKES_KEY, []);
    return likes.includes(`${userId}_${videoId}`);
  },

  async toggleLike(userId: string, videoId: string): Promise<{ isLiked: boolean; newCount: number }> {
    if (isSupabaseConfigured && isSchemaReady() && userId) {
      try {
        const { data: existing, error: fetchErr } = await supabase
          .from('likes')
          .select('id')
          .eq('user_id', userId)
          .eq('video_id', videoId)
          .maybeSingle();

        if (fetchErr) {
          handleSupabaseError(fetchErr, 'toggleLike fetch');
        } else {
          const video = await videoService.getVideoById(videoId);
          const currentCount = video?.likes_count || 0;

          if (existing) {
            // Unlike
            await supabase.from('likes').delete().eq('id', existing.id);
            const newCount = Math.max(0, currentCount - 1);
            await supabase.from('videos').update({ likes_count: newCount }).eq('id', videoId);
            return { isLiked: false, newCount };
          } else {
            // Like
            await supabase.from('likes').insert([{ user_id: userId, video_id: videoId }]);
            const newCount = currentCount + 1;
            await supabase.from('videos').update({ likes_count: newCount }).eq('id', videoId);
            return { isLiked: true, newCount };
          }
        }
      } catch (err) {
        handleSupabaseError(err, 'toggleLike catch');
      }
    }

    // Local fallback
    const key = `${userId}_${videoId}`;
    const likes = getLocal<string[]>(STORAGE_LIKES_KEY, []);
    const isCurrentlyLiked = likes.includes(key);

    let updatedLikes: string[];
    let diff = 0;
    if (isCurrentlyLiked) {
      updatedLikes = likes.filter(k => k !== key);
      diff = -1;
    } else {
      updatedLikes = [...likes, key];
      diff = 1;
    }
    setLocal(STORAGE_LIKES_KEY, updatedLikes);

    const video = await videoService.getVideoById(videoId);
    const newCount = Math.max(0, (video?.likes_count || 0) + diff);
    if (video) {
      await videoService.updateVideo(videoId, { likes_count: newCount });
    }

    return { isLiked: !isCurrentlyLiked, newCount };
  },

  // FAVORITES
  async isVideoFavorited(userId: string, videoId: string): Promise<boolean> {
    if (isSupabaseConfigured && userId) {
      try {
        const { data, error } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', userId)
          .eq('video_id', videoId)
          .maybeSingle();
        if (!error && data) return true;
        if (!error && !data) return false;
      } catch (err) {
        console.warn('Supabase isVideoFavorited failed:', err);
      }
    }

    const favs = getLocal<FavoriteItem[]>(STORAGE_FAVORITES_KEY, []);
    return favs.some(f => f.user_id === userId && f.video_id === videoId);
  },

  async toggleFavorite(userId: string, videoId: string): Promise<boolean> {
    if (isSupabaseConfigured && isSchemaReady() && userId) {
      try {
        const { data: existing, error: fetchErr } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', userId)
          .eq('video_id', videoId)
          .maybeSingle();

        if (fetchErr) {
          handleSupabaseError(fetchErr, 'toggleFavorite fetch');
        } else if (existing) {
          await supabase.from('favorites').delete().eq('id', existing.id);
          return false;
        } else {
          await supabase.from('favorites').insert([{ user_id: userId, video_id: videoId }]);
          return true;
        }
      } catch (err) {
        handleSupabaseError(err, 'toggleFavorite catch');
      }
    }

    const favs = getLocal<FavoriteItem[]>(STORAGE_FAVORITES_KEY, []);
    const exists = favs.some(f => f.user_id === userId && f.video_id === videoId);

    if (exists) {
      const filtered = favs.filter(f => !(f.user_id === userId && f.video_id === videoId));
      setLocal(STORAGE_FAVORITES_KEY, filtered);
      return false;
    } else {
      const newItem: FavoriteItem = {
        id: 'fav_' + Math.random().toString(36).substring(2, 9),
        user_id: userId,
        video_id: videoId,
        created_at: new Date().toISOString(),
      };
      setLocal(STORAGE_FAVORITES_KEY, [newItem, ...favs]);
      return true;
    }
  },

  async getUserFavorites(userId: string): Promise<FavoriteItem[]> {
    if (isSupabaseConfigured && isSchemaReady() && userId) {
      try {
        const { data, error } = await supabase
          .from('favorites')
          .select('*, video:videos(*, category:categories(*), creator:profiles(*))')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          handleSupabaseError(error, 'getUserFavorites');
        } else if (data) {
          return data as FavoriteItem[];
        }
      } catch (err) {
        handleSupabaseError(err, 'getUserFavorites catch');
      }
    }

    const favs = getLocal<FavoriteItem[]>(STORAGE_FAVORITES_KEY, []);
    const userFavs = favs.filter(f => f.user_id === userId);

    const populated = await Promise.all(
      userFavs.map(async item => {
        const video = await videoService.getVideoById(item.video_id);
        return { ...item, video: video || undefined };
      })
    );

    return populated.filter(item => Boolean(item.video));
  },

  // WATCH HISTORY
  async recordWatchProgress(userId: string, videoId: string, progress: number, duration: number): Promise<void> {
    const isCompleted = duration > 0 && progress >= duration * 0.9;
    const now = new Date().toISOString();

    if (isSupabaseConfigured && isSchemaReady() && userId) {
      try {
        const { error } = await supabase.from('watch_history').upsert({
          user_id: userId,
          video_id: videoId,
          progress_seconds: Math.floor(progress),
          duration_seconds: Math.floor(duration),
          completed: isCompleted,
          watched_at: now,
        }, { onConflict: 'user_id,video_id' });
        if (error) {
          handleSupabaseError(error, 'recordWatchProgress');
        } else {
          return;
        }
      } catch (err) {
        handleSupabaseError(err, 'recordWatchProgress catch');
      }
    }

    const history = getLocal<WatchHistoryItem[]>(STORAGE_HISTORY_KEY, []);
    const index = history.findIndex(h => h.user_id === userId && h.video_id === videoId);

    const record: WatchHistoryItem = {
      id: index !== -1 ? history[index].id : 'hist_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      video_id: videoId,
      progress_seconds: Math.floor(progress),
      duration_seconds: Math.floor(duration),
      completed: isCompleted,
      watched_at: now,
    };

    if (index !== -1) {
      history.splice(index, 1);
    }
    const updatedHistory = [record, ...history].slice(0, 100);
    setLocal(STORAGE_HISTORY_KEY, updatedHistory);
  },

  async getWatchHistory(userId: string): Promise<WatchHistoryItem[]> {
    if (isSupabaseConfigured && isSchemaReady() && userId) {
      try {
        const { data, error } = await supabase
          .from('watch_history')
          .select('*, video:videos(*, category:categories(*), creator:profiles(*))')
          .eq('user_id', userId)
          .order('watched_at', { ascending: false })
          .limit(50);

        if (error) {
          handleSupabaseError(error, 'getWatchHistory');
        } else if (data) {
          return data as WatchHistoryItem[];
        }
      } catch (err) {
        handleSupabaseError(err, 'getWatchHistory catch');
      }
    }

    const history = getLocal<WatchHistoryItem[]>(STORAGE_HISTORY_KEY, []);
    const userHistory = history.filter(h => h.user_id === userId);

    const populated = await Promise.all(
      userHistory.map(async item => {
        const video = await videoService.getVideoById(item.video_id);
        return { ...item, video: video || undefined };
      })
    );

    return populated.filter(item => Boolean(item.video));
  },

  async removeHistoryItem(userId: string, videoId: string): Promise<void> {
    if (isSupabaseConfigured && isSchemaReady() && userId) {
      try {
        const { error } = await supabase.from('watch_history').delete().eq('user_id', userId).eq('video_id', videoId);
        if (error) handleSupabaseError(error, 'removeHistoryItem');
      } catch (err) {
        handleSupabaseError(err, 'removeHistoryItem catch');
      }
    }

    const history = getLocal<WatchHistoryItem[]>(STORAGE_HISTORY_KEY, []);
    const filtered = history.filter(h => !(h.user_id === userId && h.video_id === videoId));
    setLocal(STORAGE_HISTORY_KEY, filtered);
  },

  async clearWatchHistory(userId: string): Promise<void> {
    if (isSupabaseConfigured && isSchemaReady() && userId) {
      try {
        const { error } = await supabase.from('watch_history').delete().eq('user_id', userId);
        if (error) handleSupabaseError(error, 'clearWatchHistory');
      } catch (err) {
        handleSupabaseError(err, 'clearWatchHistory catch');
      }
    }

    const history = getLocal<WatchHistoryItem[]>(STORAGE_HISTORY_KEY, []);
    const filtered = history.filter(h => h.user_id !== userId);
    setLocal(STORAGE_HISTORY_KEY, filtered);
  },

  // SUBSCRIPTIONS
  async isSubscribed(subscriberId: string, creatorId: string): Promise<boolean> {
    if (isSupabaseConfigured && isSchemaReady() && subscriberId && creatorId) {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('subscriber_id', subscriberId)
          .eq('creator_id', creatorId)
          .maybeSingle();

        if (error) {
          handleSupabaseError(error, 'isSubscribed');
        } else if (data) {
          return true;
        } else {
          return false;
        }
      } catch (e) {
        handleSupabaseError(e, 'isSubscribed catch');
      }
    }

    const subs = getLocal<string[]>(STORAGE_SUBSCRIPTIONS_KEY, []);
    return subs.includes(`${subscriberId}_${creatorId}`);
  },

  async toggleSubscription(subscriberId: string, creatorId: string): Promise<{ isSubscribed: boolean; newSubscriberCount: number }> {
    if (isSupabaseConfigured && isSchemaReady() && subscriberId && creatorId) {
      try {
        const { data: existing, error: fetchErr } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('subscriber_id', subscriberId)
          .eq('creator_id', creatorId)
          .maybeSingle();

        if (fetchErr) {
          handleSupabaseError(fetchErr, 'toggleSubscription fetch');
        } else {
          const { data: creatorProfile } = await supabase
            .from('profiles')
            .select('subscriber_count')
            .eq('id', creatorId)
            .single();

          const currentCount = creatorProfile?.subscriber_count || 0;

          if (existing) {
            await supabase.from('subscriptions').delete().eq('id', existing.id);
            const newCount = Math.max(0, currentCount - 1);
            await supabase.from('profiles').update({ subscriber_count: newCount }).eq('id', creatorId);
            return { isSubscribed: false, newSubscriberCount: newCount };
          } else {
            await supabase.from('subscriptions').insert([{ subscriber_id: subscriberId, creator_id: creatorId }]);
            const newCount = currentCount + 1;
            await supabase.from('profiles').update({ subscriber_count: newCount }).eq('id', creatorId);
            return { isSubscribed: true, newSubscriberCount: newCount };
          }
        }
      } catch (err) {
        handleSupabaseError(err, 'toggleSubscription catch');
      }
    }

    const key = `${subscriberId}_${creatorId}`;
    const subs = getLocal<string[]>(STORAGE_SUBSCRIPTIONS_KEY, []);
    const exists = subs.includes(key);

    let updated: string[];
    let diff = 0;
    if (exists) {
      updated = subs.filter(k => k !== key);
      diff = -1;
    } else {
      updated = [...subs, key];
      diff = 1;
    }
    setLocal(STORAGE_SUBSCRIPTIONS_KEY, updated);

    return { isSubscribed: !exists, newSubscriberCount: Math.max(0, diff > 0 ? 1 : 0) };
  },

  // COMMENTS
  async getComments(videoId: string): Promise<Comment[]> {
    if (isSupabaseConfigured && isSchemaReady()) {
      try {
        const { data, error } = await supabase
          .from('comments')
          .select('*, user:profiles(*)')
          .eq('video_id', videoId)
          .eq('is_hidden', false)
          .order('created_at', { ascending: false });

        if (error) {
          handleSupabaseError(error, 'getComments');
        } else if (data) {
          return data as Comment[];
        }
      } catch (err) {
        handleSupabaseError(err, 'getComments catch');
      }
    }

    const comments = getLocal<Comment[]>(STORAGE_COMMENTS_KEY, []);
    return comments
      .filter(c => c.video_id === videoId && !c.is_hidden)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async addComment(videoId: string, user: Profile, content: string, parentId?: string): Promise<Comment> {
    const now = new Date().toISOString();

    if (isSupabaseConfigured && isSchemaReady()) {
      try {
        const { data, error } = await supabase
          .from('comments')
          .insert([{
            video_id: videoId,
            user_id: user.id,
            content,
            parent_id: parentId || null,
          }])
          .select('*, user:profiles(*)')
          .single();

        if (error) {
          handleSupabaseError(error, 'addComment');
        } else if (data) {
          // Increment comments count on video
          try {
            const video = await videoService.getVideoById(videoId);
            if (video) {
              await supabase.from('videos').update({ comments_count: (video.comments_count || 0) + 1 }).eq('id', videoId);
            }
          } catch {}
          return data as Comment;
        }
      } catch (err) {
        handleSupabaseError(err, 'addComment catch');
      }
    }

    const comments = getLocal<Comment[]>(STORAGE_COMMENTS_KEY, []);
    const newComment: Comment = {
      id: 'com_' + Math.random().toString(36).substring(2, 9),
      video_id: videoId,
      user_id: user.id,
      user,
      content,
      parent_id: parentId || null,
      likes_count: 0,
      is_hidden: false,
      created_at: now,
    };

    comments.unshift(newComment);
    setLocal(STORAGE_COMMENTS_KEY, comments);

    const video = await videoService.getVideoById(videoId);
    if (video) {
      await videoService.updateVideo(videoId, { comments_count: (video.comments_count || 0) + 1 });
    }

    return newComment;
  },

  // REPORTS (Community Moderation Submission)
  async submitReport(data: {
    reporterId: string;
    videoId: string;
    reason: ReportReason;
    description: string;
  }): Promise<Report> {
    const now = new Date().toISOString();

    if (isSupabaseConfigured && isSchemaReady()) {
      try {
        const { data: rep, error } = await supabase
          .from('reports')
          .insert([{
            reporter_id: data.reporterId,
            video_id: data.videoId,
            reason: data.reason,
            description: data.description,
            status: 'pending',
          }])
          .select('*, video:videos(*), reporter:profiles!reporter_id(*)')
          .single();

        if (error) {
          handleSupabaseError(error, 'submitReport');
        } else if (rep) {
          return rep as Report;
        }
      } catch (err) {
        handleSupabaseError(err, 'submitReport catch');
      }
    }

    const reports = getLocal<Report[]>(STORAGE_REPORTS_KEY, []);
    const video = await videoService.getVideoById(data.videoId);

    const newReport: Report = {
      id: 'rep_' + Math.random().toString(36).substring(2, 9),
      reporter_id: data.reporterId,
      video_id: data.videoId,
      video: video || undefined,
      reason: data.reason,
      description: data.description,
      status: 'pending',
      created_at: now,
    };

    reports.unshift(newReport);
    setLocal(STORAGE_REPORTS_KEY, reports);

    fetch('/api/admin/audit-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminId: 'system',
        action: 'report_created',
        targetType: 'video',
        targetId: data.videoId,
        details: { reason: data.reason },
      }),
    }).catch(() => {});

    return newReport;
  },

  async getFavorites(userId: string) {
    return this.getUserFavorites(userId);
  },

  async removeWatchHistoryItem(userId: string, videoId: string) {
    return this.removeHistoryItem(userId, videoId);
  },
};

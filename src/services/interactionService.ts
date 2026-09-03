import { Comment, Report, ReportReason, WatchHistoryItem, FavoriteItem, Profile } from '../types';
import { INITIAL_COMMENTS, INITIAL_REPORTS, INITIAL_PROFILES } from '../lib/mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { videoService } from './videoService';

const STORAGE_LIKES_KEY = 'streamsphere_likes';
const STORAGE_FAVORITES_KEY = 'streamsphere_favorites';
const STORAGE_HISTORY_KEY = 'streamsphere_history';
const STORAGE_COMMENTS_KEY = 'streamsphere_comments';
const STORAGE_REPORTS_KEY = 'streamsphere_reports';
const STORAGE_SUBSCRIPTIONS_KEY = 'streamsphere_subs';

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
    const likes = getLocal<string[]>(STORAGE_LIKES_KEY, []);
    return likes.includes(`${userId}_${videoId}`);
  },

  async toggleLike(userId: string, videoId: string): Promise<{ isLiked: boolean; newCount: number }> {
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

    // Update video like count
    const video = await videoService.getVideoById(videoId);
    const newCount = Math.max(0, (video?.likes_count || 0) + diff);
    if (video) {
      await videoService.updateVideo(videoId, { likes_count: newCount });
    }

    return { isLiked: !isCurrentlyLiked, newCount };
  },

  // FAVORITES
  async isVideoFavorited(userId: string, videoId: string): Promise<boolean> {
    const favs = getLocal<FavoriteItem[]>(STORAGE_FAVORITES_KEY, []);
    return favs.some(f => f.user_id === userId && f.video_id === videoId);
  },

  async toggleFavorite(userId: string, videoId: string): Promise<boolean> {
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
    const favs = getLocal<FavoriteItem[]>(STORAGE_FAVORITES_KEY, []);
    const userFavs = favs.filter(f => f.user_id === userId);
    
    // Populate video objects
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
    const history = getLocal<WatchHistoryItem[]>(STORAGE_HISTORY_KEY, []);
    const index = history.findIndex(h => h.user_id === userId && h.video_id === videoId);
    
    const isCompleted = duration > 0 && progress >= duration * 0.9;
    const record: WatchHistoryItem = {
      id: index !== -1 ? history[index].id : 'hist_' + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      video_id: videoId,
      progress_seconds: Math.floor(progress),
      duration_seconds: Math.floor(duration),
      completed: isCompleted,
      watched_at: new Date().toISOString(),
    };

    let updatedHistory: WatchHistoryItem[];
    if (index !== -1) {
      history.splice(index, 1);
    }
    updatedHistory = [record, ...history].slice(0, 100);
    setLocal(STORAGE_HISTORY_KEY, updatedHistory);
  },

  async getWatchHistory(userId: string): Promise<WatchHistoryItem[]> {
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
    const history = getLocal<WatchHistoryItem[]>(STORAGE_HISTORY_KEY, []);
    const filtered = history.filter(h => !(h.user_id === userId && h.video_id === videoId));
    setLocal(STORAGE_HISTORY_KEY, filtered);
  },

  async clearWatchHistory(userId: string): Promise<void> {
    const history = getLocal<WatchHistoryItem[]>(STORAGE_HISTORY_KEY, []);
    const filtered = history.filter(h => h.user_id !== userId);
    setLocal(STORAGE_HISTORY_KEY, filtered);
  },

  // SUBSCRIPTIONS
  async isSubscribed(subscriberId: string, creatorId: string): Promise<boolean> {
    const subs = getLocal<string[]>(STORAGE_SUBSCRIPTIONS_KEY, []);
    return subs.includes(`${subscriberId}_${creatorId}`);
  },

  async toggleSubscription(subscriberId: string, creatorId: string): Promise<{ isSubscribed: boolean; newSubscriberCount: number }> {
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

    // Update creator in profiles
    const creators = getLocal<Profile[]>('streamsphere_profiles', INITIAL_PROFILES);
    const creator = creators.find(p => p.id === creatorId);
    let count = creator?.subscriber_count || 100;
    if (creator) {
      creator.subscriber_count = Math.max(0, creator.subscriber_count + diff);
      count = creator.subscriber_count;
      setLocal('streamsphere_profiles', creators);
    }

    return { isSubscribed: !exists, newSubscriberCount: count };
  },

  // COMMENTS
  async getComments(videoId: string): Promise<Comment[]> {
    const comments = getLocal<Comment[]>(STORAGE_COMMENTS_KEY, INITIAL_COMMENTS);
    return comments
      .filter(c => c.video_id === videoId && !c.is_hidden)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async addComment(videoId: string, user: Profile, content: string, parentId?: string): Promise<Comment> {
    const comments = getLocal<Comment[]>(STORAGE_COMMENTS_KEY, INITIAL_COMMENTS);
    const newComment: Comment = {
      id: 'com_' + Math.random().toString(36).substring(2, 9),
      video_id: videoId,
      user_id: user.id,
      user,
      content,
      parent_id: parentId || null,
      likes_count: 0,
      is_hidden: false,
      created_at: new Date().toISOString(),
    };

    comments.unshift(newComment);
    setLocal(STORAGE_COMMENTS_KEY, comments);

    // Increment video comments count
    const video = await videoService.getVideoById(videoId);
    if (video) {
      await videoService.updateVideo(videoId, { comments_count: (video.comments_count || 0) + 1 });
    }

    return newComment;
  },

  // REPORTS (Content Moderation Submission)
  async submitReport(data: {
    reporterId: string;
    videoId: string;
    reason: ReportReason;
    description: string;
  }): Promise<Report> {
    const reports = getLocal<Report[]>(STORAGE_REPORTS_KEY, INITIAL_REPORTS);
    const reporter = INITIAL_PROFILES.find(p => p.id === data.reporterId) || INITIAL_PROFILES[0];
    const video = await videoService.getVideoById(data.videoId);

    const newReport: Report = {
      id: 'rep_' + Math.random().toString(36).substring(2, 9),
      reporter_id: data.reporterId,
      reporter,
      video_id: data.videoId,
      video: video || undefined,
      reason: data.reason,
      description: data.description,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    reports.unshift(newReport);
    setLocal(STORAGE_REPORTS_KEY, reports);

    // Record server-side audit event if possible
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

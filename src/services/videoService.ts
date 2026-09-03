import { Video, Category, Tag, ModerationStatus, VideoVisibility } from '../types';
import { INITIAL_VIDEOS, INITIAL_CATEGORIES, INITIAL_PROFILES, INITIAL_TAGS } from '../lib/mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// In-browser persistent storage key for preview mode
const STORAGE_VIDEOS_KEY = 'streamsphere_videos';

function getStoredVideos(): Video[] {
  try {
    const data = localStorage.getItem(STORAGE_VIDEOS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading stored videos:', e);
  }
  // Initialize with seed data
  const initial = INITIAL_VIDEOS.map(v => ({
    ...v,
    category: INITIAL_CATEGORIES.find(c => c.id === v.category_id),
    creator: INITIAL_PROFILES.find(p => p.id === v.creator_id),
    tags: INITIAL_TAGS.slice(0, 3),
  }));
  saveStoredVideos(initial);
  return initial;
}

function saveStoredVideos(videos: Video[]) {
  try {
    localStorage.setItem(STORAGE_VIDEOS_KEY, JSON.stringify(videos));
  } catch (e) {
    console.error('Error saving stored videos:', e);
  }
}

export interface VideoFilterOptions {
  categoryId?: string;
  creatorId?: string;
  searchQuery?: string;
  tag?: string;
  sortBy?: 'latest' | 'trending' | 'views' | 'likes';
  status?: ModerationStatus;
  visibility?: VideoVisibility;
  page?: number;
  pageSize?: number;
  includeAllStatusForUser?: string; // allow creator/admin to see drafts/pending
  includeUnpublished?: boolean;
}

export const videoService = {
  async getVideos(options: VideoFilterOptions = {}): Promise<{ videos: Video[]; total: number }> {
    const {
      categoryId,
      creatorId,
      searchQuery,
      tag,
      sortBy = 'latest',
      status = 'published',
      visibility = 'public',
      page = 1,
      pageSize = 12,
      includeAllStatusForUser,
      includeUnpublished,
    } = options;

    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('videos').select('*, category:categories(*), creator:profiles(*)', { count: 'exact' });

        if (includeUnpublished || includeAllStatusForUser) {
          if (includeAllStatusForUser) {
            query = query.or(`moderation_status.eq.published,creator_id.eq.${includeAllStatusForUser}`);
          }
        } else {
          if (status) query = query.eq('moderation_status', status);
          if (visibility) query = query.eq('visibility', visibility);
        }

        if (categoryId) query = query.eq('category_id', categoryId);
        if (creatorId) query = query.eq('creator_id', creatorId);
        if (searchQuery) {
          query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
        }

        if (sortBy === 'trending') query = query.order('views', { ascending: false }).order('created_at', { ascending: false });
        else if (sortBy === 'views') query = query.order('views', { ascending: false });
        else if (sortBy === 'likes') query = query.order('likes_count', { ascending: false });
        else query = query.order('created_at', { ascending: false });

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data, count, error } = await query;
        if (!error && data) {
          return { videos: data as Video[], total: count || 0 };
        }
      } catch (err) {
        console.warn('Supabase query failed, falling back to local database:', err);
      }
    }

    // Local storage state query
    let list = getStoredVideos();

    // Filter by moderation & visibility
    if (includeUnpublished) {
      // Return all videos without filtering by status
    } else if (!includeAllStatusForUser) {
      list = list.filter(v => v.moderation_status === status && (visibility ? v.visibility === visibility : true));
    } else {
      list = list.filter(v => v.moderation_status === 'published' || v.creator_id === includeAllStatusForUser);
    }

    if (categoryId) {
      list = list.filter(v => v.category_id === categoryId);
    }

    if (creatorId) {
      list = list.filter(v => v.creator_id === creatorId);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(v => 
        v.title.toLowerCase().includes(q) || 
        v.description.toLowerCase().includes(q) ||
        v.creator?.display_name.toLowerCase().includes(q)
      );
    }

    if (tag) {
      list = list.filter(v => v.tags?.some(t => t.slug === tag || t.name.toLowerCase() === tag.toLowerCase()));
    }

    // Sorting
    if (sortBy === 'trending') {
      list.sort((a, b) => (b.views * 0.7 + b.likes_count * 0.3) - (a.views * 0.7 + a.likes_count * 0.3));
    } else if (sortBy === 'views') {
      list.sort((a, b) => b.views - a.views);
    } else if (sortBy === 'likes') {
      list.sort((a, b) => b.likes_count - a.likes_count);
    } else {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    const total = list.length;
    const startIndex = (page - 1) * pageSize;
    const paginated = list.slice(startIndex, startIndex + pageSize);

    return { videos: paginated, total };
  },

  async getVideoById(id: string): Promise<Video | null> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('videos')
          .select('*, category:categories(*), creator:profiles(*)')
          .eq('id', id)
          .single();
        if (!error && data) return data as Video;
      } catch (err) {
        console.warn('Supabase fetch failed, checking local storage:', err);
      }
    }

    const list = getStoredVideos();
    const item = list.find(v => v.id === id || v.slug === id);
    return item || null;
  },

  async getRelatedVideos(currentVideoId: string, categoryId?: string, limit = 6): Promise<Video[]> {
    const { videos } = await this.getVideos({
      categoryId,
      pageSize: limit + 1,
      sortBy: 'trending',
    });
    return videos.filter(v => v.id !== currentVideoId).slice(0, limit);
  },

  async createVideo(videoData: Partial<Video>): Promise<Video> {
    const slug = (videoData.title || 'untitled')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).substring(2, 7);

    const newVideo: Video = {
      id: 'vid_' + Math.random().toString(36).substring(2, 9),
      bunny_video_id: videoData.bunny_video_id || `bny_${Date.now()}`,
      title: videoData.title || 'Untitled Video',
      slug: slug,
      description: videoData.description || '',
      thumbnail_url: videoData.thumbnail_url || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80',
      duration: videoData.duration || 180,
      category_id: videoData.category_id || 'cat-tech',
      creator_id: videoData.creator_id || 'user-admin',
      visibility: videoData.visibility || 'public',
      moderation_status: videoData.moderation_status || 'published',
      is_age_restricted: Boolean(videoData.is_age_restricted),
      allow_comments: videoData.allow_comments ?? true,
      views: 0,
      likes_count: 0,
      comments_count: 0,
      video_url: videoData.video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Attach creator & category
    const cat = INITIAL_CATEGORIES.find(c => c.id === newVideo.category_id);
    const creator = INITIAL_PROFILES.find(p => p.id === newVideo.creator_id) || INITIAL_PROFILES[0];
    newVideo.category = cat;
    newVideo.creator = creator;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('videos').insert([newVideo]).select().single();
        if (!error && data) return data as Video;
      } catch (err) {
        console.warn('Supabase insert failed, saving locally:', err);
      }
    }

    const list = getStoredVideos();
    list.unshift(newVideo);
    saveStoredVideos(list);
    return newVideo;
  },

  async updateVideo(id: string, updates: Partial<Video>): Promise<Video> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('videos')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (!error && data) return data as Video;
      } catch (e) {
        console.warn('Supabase update failed:', e);
      }
    }

    const list = getStoredVideos();
    const index = list.findIndex(v => v.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...updates, updated_at: new Date().toISOString() };
      saveStoredVideos(list);
      return list[index];
    }
    throw new Error('Video not found');
  },

  async deleteVideo(id: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('videos').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase delete failed:', e);
      }
    }

    const list = getStoredVideos().filter(v => v.id !== id);
    saveStoredVideos(list);
    return true;
  },

  /**
   * Safe server-backed view increment with client cooldown
   */
  async recordView(videoId: string): Promise<void> {
    try {
      const res = await fetch(`/api/videos/${videoId}/view`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.incremented) {
        // Increment in local state as well
        const list = getStoredVideos();
        const v = list.find(item => item.id === videoId);
        if (v) {
          v.views += 1;
          saveStoredVideos(list);
        }
      }
    } catch (e) {
      console.warn('View record failed:', e);
    }
  },

  async getCategories(): Promise<Category[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('categories').select('*');
        if (!error && data && data.length > 0) return data as Category[];
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_CATEGORIES;
  },

  async getTags(): Promise<Tag[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('tags').select('*');
        if (!error && data && data.length > 0) return data as Tag[];
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_TAGS;
  },
};

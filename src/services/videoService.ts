import { Video, Category, Tag, ModerationStatus, VideoVisibility } from '../types';
import { supabase, isSupabaseConfigured, isSchemaReady, handleSupabaseError } from '../lib/supabase';

// Persistent storage fallback when running without cloud credentials
const STORAGE_VIDEOS_KEY = 'streamsphere_production_videos_v2';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-tech', name: 'Technology & Engineering', slug: 'technology', description: 'Coding, hardware, AI systems, and tech tutorials', icon: 'Cpu', video_count: 0 },
  { id: 'cat-cinema', name: 'Cinema & Documentary', slug: 'cinema', description: 'Cinematography, short films, color grading, and lens tests', icon: 'Film', video_count: 0 },
  { id: 'cat-creative', name: 'Creative Arts & Design', slug: 'creative-arts', description: 'Visual effects, 3D modeling, illustration, and design philosophy', icon: 'Palette', video_count: 0 },
  { id: 'cat-science', name: 'Science & Education', slug: 'science', description: 'Physics, mathematics, space exploration, and academic lectures', icon: 'FlaskConical', video_count: 0 },
  { id: 'cat-music', name: 'Music & Soundscapes', slug: 'music', description: 'Original electronic compositions, modular synth jams, and live sets', icon: 'Music', video_count: 0 },
  { id: 'cat-gaming', name: 'Gaming & Esports', slug: 'gaming', description: 'Speedruns, competitive matches, and interactive gameplay', icon: 'Gamepad2', video_count: 0 },
];

export const DEFAULT_TAGS: Tag[] = [
  { id: 'tag-tutorial', name: 'Tutorial', slug: 'tutorial' },
  { id: 'tag-4k', name: '4K Ultra HD', slug: '4k' },
  { id: 'tag-hls', name: 'HLS Stream', slug: 'hls' },
  { id: 'tag-hdr', name: 'HDR10', slug: 'hdr' },
  { id: 'tag-oss', name: 'Open Source', slug: 'open-source' },
  { id: 'tag-cine', name: 'Cinematography', slug: 'cinematography' },
];

export const DEFAULT_STARTER_VIDEOS: Video[] = [];

function getStoredVideos(): Video[] {
  try {
    const data = localStorage.getItem(STORAGE_VIDEOS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading stored videos:', e);
  }
  // Initialize with curated starter videos
  try {
    localStorage.setItem(STORAGE_VIDEOS_KEY, JSON.stringify(DEFAULT_STARTER_VIDEOS));
  } catch (e) {}
  return DEFAULT_STARTER_VIDEOS;
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
  includeAllStatusForUser?: string; // allow creator to see their drafts/pending
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

    if (isSupabaseConfigured && isSchemaReady()) {
      try {
        let query = supabase
          .from('videos')
          .select('*, category:categories(*), creator:profiles(*)', { count: 'exact' });

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
        if (error) {
          handleSupabaseError(error, 'getVideos');
        } else if (data) {
          return { videos: data as Video[], total: count || 0 };
        }
      } catch (err) {
        handleSupabaseError(err, 'getVideos catch');
      }
    }

    // Local fallback
    let list = getStoredVideos();

    if (includeUnpublished) {
      // Return all without status filter
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
    if (isSupabaseConfigured && isSchemaReady()) {
      try {
        const { data, error } = await supabase
          .from('videos')
          .select('*, category:categories(*), creator:profiles(*)')
          .or(`id.eq.${id},slug.eq.${id}`)
          .single();
        if (error) {
          handleSupabaseError(error, 'getVideoById');
        } else if (data) {
          return data as Video;
        }
      } catch (err) {
        handleSupabaseError(err, 'getVideoById catch');
      }
    }

    const list = getStoredVideos();
    return list.find(v => v.id === id || v.slug === id) || null;
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

    const now = new Date().toISOString();
    const fallbackCategory = DEFAULT_CATEGORIES.find(c => c.id === (videoData.category_id || 'cat-tech')) || DEFAULT_CATEGORIES[0];
    const newVideo: Video = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'vid_' + Math.random().toString(36).substring(2, 9),
      bunny_video_id: videoData.bunny_video_id,
      title: videoData.title || 'Untitled Video',
      slug,
      description: videoData.description || '',
      thumbnail_url: videoData.thumbnail_url || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80',
      duration: videoData.duration || 0,
      category_id: videoData.category_id || 'cat-tech',
      category: videoData.category || fallbackCategory,
      creator_id: videoData.creator_id || '',
      creator: videoData.creator,
      visibility: videoData.visibility || 'public',
      moderation_status: videoData.moderation_status || 'pending_review',
      is_age_restricted: Boolean(videoData.is_age_restricted),
      allow_comments: videoData.allow_comments ?? true,
      views: 0,
      likes_count: 0,
      comments_count: 0,
      video_url: videoData.video_url || '',
      created_at: now,
      updated_at: now,
    };

    if (isSupabaseConfigured && isSchemaReady()) {
      try {
        const { data, error } = await supabase
          .from('videos')
          .insert([{
            id: newVideo.id,
            bunny_video_id: newVideo.bunny_video_id,
            title: newVideo.title,
            slug: newVideo.slug,
            description: newVideo.description,
            thumbnail_url: newVideo.thumbnail_url,
            duration: newVideo.duration,
            category_id: newVideo.category_id,
            creator_id: newVideo.creator_id,
            visibility: newVideo.visibility,
            moderation_status: newVideo.moderation_status,
            is_age_restricted: newVideo.is_age_restricted,
            allow_comments: newVideo.allow_comments,
            views: 0,
            likes_count: 0,
            comments_count: 0,
            video_url: newVideo.video_url,
          }])
          .select('*, category:categories(*), creator:profiles(*)')
          .single();

        if (error) {
          handleSupabaseError(error, 'insert video');
        } else if (data) {
          return data as Video;
        }
      } catch (err) {
        handleSupabaseError(err, 'insert video catch');
      }
    }

    const list = getStoredVideos();
    list.unshift(newVideo);
    saveStoredVideos(list);
    return newVideo;
  },

  async updateVideo(id: string, updates: Partial<Video>): Promise<Video> {
    const updatedAt = new Date().toISOString();

    if (isSupabaseConfigured && isSchemaReady()) {
      try {
        const { data, error } = await supabase
          .from('videos')
          .update({ ...updates, updated_at: updatedAt })
          .eq('id', id)
          .select('*, category:categories(*), creator:profiles(*)')
          .single();
        if (error) {
          handleSupabaseError(error, 'updateVideo');
        } else if (data) {
          return data as Video;
        }
      } catch (e) {
        handleSupabaseError(e, 'updateVideo catch');
      }
    }

    const list = getStoredVideos();
    const index = list.findIndex(v => v.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...updates, updated_at: updatedAt };
      saveStoredVideos(list);
      return list[index];
    }
    throw new Error('Video not found');
  },

  async deleteVideo(id: string): Promise<boolean> {
    if (isSupabaseConfigured && isSchemaReady()) {
      try {
        const { error } = await supabase.from('videos').delete().eq('id', id);
        if (error) handleSupabaseError(error, 'deleteVideo');
      } catch (e) {
        handleSupabaseError(e, 'deleteVideo catch');
      }
    }

    const list = getStoredVideos().filter(v => v.id !== id);
    saveStoredVideos(list);
    return true;
  },

  /**
   * Safe server-backed view increment with cooldown deduplication
   */
  async recordView(videoId: string): Promise<void> {
    try {
      const res = await fetch(`/api/videos/${videoId}/view`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.incremented) {
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
    const list = getStoredVideos();
    const categoriesWithCount = DEFAULT_CATEGORIES.map(c => ({
      ...c,
      video_count: list.filter(v => v.category_id === c.id).length
    }));

    if (isSupabaseConfigured && isSchemaReady()) {
      try {
        let cats: Category[] = [];
        const { data, error } = await supabase.from('categories').select('*').order('name');
        
        if (error) {
          handleSupabaseError(error, 'getCategories');
        } else if (data && data.length > 0) {
          cats = data as Category[];
        } else if (data && data.length === 0) {
          // Seed the categories table if empty
          const seedData = DEFAULT_CATEGORIES.map(({ id, video_count, ...rest }) => rest);
          const { data: inserted, error: insertErr } = await supabase.from('categories').insert(seedData).select('*');
          if (insertErr) {
            handleSupabaseError(insertErr, 'seedCategories');
          } else if (inserted) {
            cats = inserted as Category[];
          }
        }

        if (cats.length > 0) {
          // Fetch video counts for accurate display
          const { data: videoData } = await supabase.from('videos').select('category_id');
          if (videoData) {
            const countMap = videoData.reduce((acc, v) => {
              if (v.category_id) {
                acc[v.category_id] = (acc[v.category_id] || 0) + 1;
              }
              return acc;
            }, {} as Record<string, number>);
            return cats.map(c => ({
              ...c,
              video_count: countMap[c.id] || 0
            }));
          }
          return cats;
        }

      } catch (e) {
        handleSupabaseError(e, 'getCategories catch');
      }
    }
    return categoriesWithCount;
  },

  async getTags(): Promise<Tag[]> {
    if (isSupabaseConfigured && isSchemaReady()) {
      try {
        const { data, error } = await supabase.from('tags').select('*').order('name');
        
        if (error) {
          handleSupabaseError(error, 'getTags');
        } else if (data && data.length > 0) {
          return data as Tag[];
        } else if (data && data.length === 0) {
          // Seed tags if empty
          const seedData = DEFAULT_TAGS.map(({ id, ...rest }) => rest);
          const { data: inserted, error: insertErr } = await supabase.from('tags').insert(seedData).select('*');
          if (insertErr) {
            handleSupabaseError(insertErr, 'seedTags');
          } else if (inserted) {
            return inserted as Tag[];
          }
        }
      } catch (e) {
        handleSupabaseError(e, 'getTags catch');
      }
    }
    return DEFAULT_TAGS;
  },
};

import { Video, Category, Tag, ModerationStatus, VideoVisibility } from '../types';
import { supabase } from '../lib/supabase';

export const DEFAULT_CATEGORIES: Category[] = [
  { id:'cat-tech', name:'Technology & Engineering', slug:'technology', description:'Coding, hardware, AI systems, and tech tutorials', icon:'Cpu', video_count:0 },
  { id:'cat-cinema', name:'Cinema & Documentary', slug:'cinema', description:'Cinematography, short films, color grading, and lens tests', icon:'Film', video_count:0 },
  { id:'cat-creative', name:'Creative Arts & Design', slug:'creative-arts', description:'Visual effects, 3D modeling, illustration, and design philosophy', icon:'Palette', video_count:0 },
  { id:'cat-science', name:'Science & Education', slug:'science', description:'Physics, mathematics, space exploration, and academic lectures', icon:'FlaskConical', video_count:0 },
  { id:'cat-music', name:'Music & Soundscapes', slug:'music', description:'Original electronic compositions, modular synth jams, and live sets', icon:'Music', video_count:0 },
  { id:'cat-gaming', name:'Gaming & Esports', slug:'gaming', description:'Speedruns, competitive matches, and interactive gameplay', icon:'Gamepad2', video_count:0 },
];
export const DEFAULT_TAGS: Tag[] = [
  { id:'tag-tutorial', name:'Tutorial', slug:'tutorial' }, { id:'tag-4k', name:'4K Ultra HD', slug:'4k' }, { id:'tag-hls', name:'HLS Stream', slug:'hls' }, { id:'tag-hdr', name:'HDR10', slug:'hdr' }, { id:'tag-oss', name:'Open Source', slug:'open-source' }, { id:'tag-cine', name:'Cinematography', slug:'cinematography' },
];
export const DEFAULT_STARTER_VIDEOS: Video[] = [];

async function authHeaders(): Promise<Record<string,string>> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ? { Authorization:`Bearer ${data.session.access_token}` } : {};
}
async function api<T>(url:string, options:RequestInit = {}):Promise<T> {
  const tokenHeaders = await authHeaders();
  const headers = { ...tokenHeaders, ...(options.headers || {}), ...(options.body ? {'Content-Type':'application/json'} : {}) } as Record<string,string>;
  const res = await fetch(url, { ...options, headers });
  const text = await res.text(); let data:any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error:text }; }
  if (!res.ok) throw new Error(data.error || `API request failed (${res.status})`);
  return data as T;
}

export interface VideoFilterOptions {
  categoryId?: string; creatorId?: string; searchQuery?: string; tag?: string; sortBy?: 'latest'|'trending'|'views'|'likes'; status?: ModerationStatus; visibility?: VideoVisibility; page?: number; pageSize?: number; includeAllStatusForUser?: string; includeUnpublished?: boolean;
}

export const videoService = {
  async getVideos(options:VideoFilterOptions = {}):Promise<{videos:Video[];total:number}> {
    const p = new URLSearchParams();
    const status = options.includeUnpublished || options.includeAllStatusForUser ? undefined : (options.status || 'published');
    const visibility = options.includeUnpublished || options.includeAllStatusForUser ? undefined : (options.visibility || 'public');
    if(options.categoryId)p.set('categoryId',options.categoryId); if(options.creatorId)p.set('creatorId',options.creatorId); if(options.searchQuery)p.set('searchQuery',options.searchQuery); if(options.sortBy)p.set('sortBy',options.sortBy); if(status)p.set('status',status); if(visibility)p.set('visibility',visibility); if(options.page)p.set('page',String(options.page)); p.set('pageSize',String(options.pageSize || 12));
    return api(`/api/videos?${p.toString()}`);
  },
  async getVideoById(id:string):Promise<Video|null> { try { const r=await api<{video:Video}>(`/api/videos/${encodeURIComponent(id)}`); return r.video || null; } catch(e:any) { if(String(e.message).includes('404'))return null; throw e; } },
  async getRelatedVideos(currentVideoId:string, categoryId?:string, limit=6):Promise<Video[]> { const r=await this.getVideos({categoryId,pageSize:limit+1,sortBy:'trending'}); return r.videos.filter(v=>v.id!==currentVideoId).slice(0,limit); },
  async createVideo(videoData:Partial<Video>):Promise<Video> { const row:any={...videoData}; delete row.category; delete row.creator; const r=await api<{video:Video}>('/api/videos',{method:'POST',body:JSON.stringify(row)}); return r.video; },
  async updateVideo(id:string,updates:Partial<Video>):Promise<Video> { const row:any={...updates}; delete row.category; delete row.creator; const r=await api<{video:Video}>(`/api/videos/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(row)}); return r.video; },
  async deleteVideo(id:string):Promise<boolean> { await api(`/api/videos/${encodeURIComponent(id)}`,{method:'DELETE'}); return true; },
  async recordView(videoId:string):Promise<void> { try { const res=await fetch(`/api/videos/${encodeURIComponent(videoId)}/view`,{method:'POST'}); if(!res.ok)throw new Error(`View API returned ${res.status}`); } catch(e){ console.warn('View record failed:',e); } },
  async getCategories():Promise<Category[]> { const r=await api<{categories:Category[]}>('/api/categories'); return r.categories || []; },
  async getTags():Promise<Tag[]> { const r=await api<{tags:Tag[]}>('/api/tags'); return r.tags || []; },
};

import { Video, ModerationStatus, VideoVisibility } from '../types';
import { supabase } from '../lib/supabase';

const API_ORIGIN = String((import.meta as any).env?.VITE_API_ORIGIN || 'https://cornmm-production.up.railway.app').replace(/\/$/, '');

async function authHeaders(): Promise<Record<string,string>> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
  } catch {
    return {};
  }
}

async function api<T>(url:string, options:RequestInit = {}):Promise<T> {
  const tokenHeaders = await authHeaders();
  const requestUrl = /^https?:\/\//i.test(url) ? url : `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
  const headers = { ...tokenHeaders, ...(options.headers || {}), ...(options.body ? {'Content-Type':'application/json'} : {}) } as Record<string,string>;
  const res = await fetch(requestUrl, { ...options, headers });
  const responseText = await res.text();
  let data:any = {};
  try { data = responseText ? JSON.parse(responseText) : {}; }
  catch { throw new Error(`API returned non-JSON response (${res.status})`); }
  if (!res.ok) throw new Error(data?.error || `API request failed (${res.status})`);
  return data as T;
}

export interface VideoFilterOptions { categoryId?: string; creatorId?: string; searchQuery?: string; tag?: string; sortBy?: 'latest'|'trending'|'views'|'likes'; status?: ModerationStatus; visibility?: VideoVisibility; page?: number; pageSize?: number; includeAllStatusForUser?: string; includeUnpublished?: boolean; }

export const videoService = {
  async getVideos(options:VideoFilterOptions = {}):Promise<{videos:Video[];total:number}> {
    const p = new URLSearchParams();
    const status = options.includeUnpublished || options.includeAllStatusForUser ? undefined : (options.status || 'published');
    const visibility = options.includeUnpublished || options.includeAllStatusForUser ? undefined : (options.visibility || 'public');
    if(options.categoryId)p.set('categoryId',options.categoryId);
    if(options.creatorId)p.set('creatorId',options.creatorId);
    if(options.searchQuery)p.set('searchQuery',options.searchQuery);
    if(options.sortBy)p.set('sortBy',options.sortBy);
    if(status)p.set('status',status);
    if(visibility)p.set('visibility',visibility);
    if(options.page)p.set('page',String(options.page));
    p.set('pageSize',String(options.pageSize || 12));
    const data = await api<any>(`/api/videos?${p.toString()}`);
    return {
      videos: Array.isArray(data?.videos) ? data.videos : [],
      total: Number.isFinite(Number(data?.total)) ? Number(data.total) : 0,
    };
  },
  async getVideoById(id:string):Promise<Video|null> { try { const r=await api<{video:Video}>(`/api/videos/${encodeURIComponent(id)}`); return r.video || null; } catch(e:any) { if(String(e.message).includes('404'))return null; throw e; } },
  async getRelatedVideos(currentVideoId:string, categoryId?:string, limit=6):Promise<Video[]> { const r=await this.getVideos({categoryId,pageSize:limit+1,sortBy:'trending'}); return r.videos.filter(v=>v.id!==currentVideoId).slice(0,limit); },
  async createVideo(videoData:Partial<Video>):Promise<Video> { const row:any={...videoData}; delete row.category; delete row.creator; if (row.is_published === true) { row.moderation_status='published'; row.visibility='public'; delete row.is_published; } const r=await api<{video:Video}>('/api/videos',{method:'POST',body:JSON.stringify(row)}); return r.video; },
  async updateVideo(id:string,updates:Partial<Video>):Promise<Video> { const row:any={...updates}; delete row.category; delete row.creator; const r=await api<{video:Video}>(`/api/videos/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(row)}); return r.video; },
  async deleteVideo(id:string):Promise<boolean> { await api(`/api/videos/${encodeURIComponent(id)}`,{method:'DELETE'}); return true; },
  async recordView(videoId:string):Promise<void> { try { const res=await fetch(`${API_ORIGIN}/api/videos/${encodeURIComponent(videoId)}/view`,{method:'POST'}); if(!res.ok)throw new Error(`View API returned ${res.status}`); } catch(e){ console.warn('View record failed:',e); } },
  async getCategories():Promise<import('../types').Category[]> { const r=await api<{categories:import('../types').Category[]}>('/api/categories'); return r.categories || []; },
  async getTags():Promise<import('../types').Tag[]> { const r=await api<{tags:import('../types').Tag[]}>('/api/tags'); return r.tags || []; },
  async syncFileMoon():Promise<{imported:number;updated:number;total:number}> { return api('/api/filemoon/sync',{method:'POST'}); },
};

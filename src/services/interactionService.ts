import { Comment, Report, ReportReason, WatchHistoryItem, FavoriteItem, Profile } from '../types';
import { supabase } from '../lib/supabase';

async function token():Promise<string>{ const {data}=await supabase.auth.getSession(); if(!data.session?.access_token) throw new Error('Authentication required'); return data.session.access_token; }
async function api<T>(url:string, options:RequestInit={}):Promise<T>{ const t=await token(); const res=await fetch(url,{...options,headers:{Authorization:`Bearer ${t}`,...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}}); const text=await res.text(); let data:any={}; try{data=text?JSON.parse(text):{}}catch{data={error:text}} if(!res.ok)throw new Error(data.error||`API request failed (${res.status})`); return data as T; }

export const interactionService = {
  async isVideoLiked(_userId:string,videoId:string):Promise<boolean>{ const r=await api<{isLiked:boolean}>(`/api/interactions/likes/${encodeURIComponent(videoId)}`); return !!r.isLiked; },
  async toggleLike(_userId:string,videoId:string):Promise<{isLiked:boolean;newCount:number}>{ return api(`/api/interactions/likes/${encodeURIComponent(videoId)}/toggle`,{method:'POST'}); },
  async isVideoFavorited(_userId:string,videoId:string):Promise<boolean>{ const r=await api<{isFavorited:boolean}>(`/api/interactions/favorites/${encodeURIComponent(videoId)}`); return !!r.isFavorited; },
  async toggleFavorite(_userId:string,videoId:string):Promise<boolean>{ const r=await api<{isFavorited:boolean}>(`/api/interactions/favorites/${encodeURIComponent(videoId)}/toggle`,{method:'POST'}); return !!r.isFavorited; },
  async getUserFavorites(_userId:string):Promise<FavoriteItem[]>{ const r=await api<{favorites:FavoriteItem[]}>('/api/interactions/favorites'); return r.favorites||[]; },
  async getFavorites(userId:string){ return this.getUserFavorites(userId); },
  async recordWatchProgress(_userId:string,videoId:string,progress:number,duration:number):Promise<void>{ await api('/api/interactions/history',{method:'POST',body:JSON.stringify({videoId,progress,duration})}); },
  async getWatchHistory(_userId:string):Promise<WatchHistoryItem[]>{ const r=await api<{history:WatchHistoryItem[]}>('/api/interactions/history'); return r.history||[]; },
  async removeHistoryItem(_userId:string,videoId:string):Promise<void>{ await api(`/api/interactions/history/${encodeURIComponent(videoId)}`,{method:'DELETE'}); },
  async removeWatchHistoryItem(userId:string,videoId:string){ return this.removeHistoryItem(userId,videoId); },
  async clearWatchHistory(_userId:string):Promise<void>{ await api('/api/interactions/history',{method:'DELETE'}); },
  async isSubscribed(_subscriberId:string,creatorId:string):Promise<boolean>{ const r=await api<{isSubscribed:boolean}>(`/api/interactions/subscriptions/${encodeURIComponent(creatorId)}`); return !!r.isSubscribed; },
  async toggleSubscription(_subscriberId:string,creatorId:string):Promise<{isSubscribed:boolean;newSubscriberCount:number}>{ return api(`/api/interactions/subscriptions/${encodeURIComponent(creatorId)}/toggle`,{method:'POST'}); },
  async getComments(videoId:string):Promise<Comment[]>{ const res=await fetch(`/api/interactions/comments/${encodeURIComponent(videoId)}`); const r=await res.json(); if(!res.ok)throw new Error(r.error||'Failed to load comments'); return r.comments||[]; },
  async addComment(videoId:string,user:Profile,content:string,parentId?:string):Promise<Comment>{ const r=await api<{comment:Comment}>(`/api/interactions/comments/${encodeURIComponent(videoId)}`,{method:'POST',body:JSON.stringify({content,parentId})}); return r.comment; },
  async submitReport(data:{reporterId:string;videoId:string;reason:ReportReason;description:string}):Promise<Report>{ const r=await api<{report:Report}>('/api/interactions/reports',{method:'POST',body:JSON.stringify({videoId:data.videoId,reason:data.reason,description:data.description})}); return r.report; },
};

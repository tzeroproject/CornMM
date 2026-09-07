import { Report, AdminAction, AdminStats, Video, Profile, ReportStatus } from '../types';
import { supabase } from '../lib/supabase';
import { videoService } from './videoService';

async function api<T>(url:string, options:RequestInit={}):Promise<T>{ const {data}=await supabase.auth.getSession(); const token=data.session?.access_token; if(!token)throw new Error('Authentication required'); const res=await fetch(url,{...options,headers:{Authorization:`Bearer ${token}`,...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}}); const text=await res.text(); let body:any={}; try{body=text?JSON.parse(text):{}}catch{body={error:text}} if(!res.ok)throw new Error(body.error||`API request failed (${res.status})`); return body as T; }

export const adminService = {
  async syncBunnyVideos(_adminProfileOrId:Profile|string):Promise<{syncedCount:number;totalBunnyVideos:number}>{ return api('/api/admin/sync-bunny',{method:'POST'}); },
  async getStats():Promise<AdminStats>{ return api('/api/admin/stats'); },
  async getDashboardStats():Promise<AdminStats>{ return this.getStats(); },
  async getReports(filterStatus?:ReportStatus):Promise<Report[]>{ const q=filterStatus?`?status=${encodeURIComponent(filterStatus)}`:''; const r=await api<{reports:Report[]}>(`/api/admin/reports${q}`); return r.reports||[]; },
  async updateReport(reportId:string,status:ReportStatus,adminProfile:Profile|string,actionTaken?:string):Promise<Report>{ const r=await api<{report:Report}>(`/api/admin/reports/${encodeURIComponent(reportId)}`,{method:'PATCH',body:JSON.stringify({status,actionTaken})}); return r.report; },
  async resolveReport(reportId:string,action:'dismiss'|'take_down'|'suspend_user',adminProfileOrId:Profile|string):Promise<Report>{ if(action==='take_down'){ const reports=await this.getReports(); const report=reports.find(r=>r.id===reportId); if(report)await this.removeVideo(report.video_id,`Takedown via community report #${reportId}`,adminProfileOrId); } return this.updateReport(reportId,action==='dismiss'?'dismissed':'resolved',adminProfileOrId,action); },
  async getPendingVideos():Promise<Video[]>{ const r=await videoService.getVideos({status:'pending_review',pageSize:50,includeUnpublished:true}); return r.videos; },
  async approveVideo(videoId:string,adminProfileOrId:Profile|string):Promise<Video>{ return this.updateVideoStatus(videoId,{moderation_status:'published'},adminProfileOrId,'video_approve'); },
  async rejectVideo(videoId:string,reason:string,adminProfileOrId:Profile|string):Promise<Video>{ return this.updateVideoStatus(videoId,{moderation_status:'rejected',rejection_reason:reason},adminProfileOrId,'video_reject',{reason}); },
  async removeVideo(videoId:string,reason:string,adminProfileOrId:Profile|string):Promise<Video>{ return this.updateVideoStatus(videoId,{moderation_status:'removed',rejection_reason:reason},adminProfileOrId,'video_remove',{reason}); },
  async updateVideoStatus(videoId:string,updates:Partial<Video>,adminProfileOrId:Profile|string,action:string,details?:Record<string,any>):Promise<Video>{ const r=await api<{video:Video}>(`/api/admin/videos/${encodeURIComponent(videoId)}`,{method:'PATCH',body:JSON.stringify(updates)}); const adminId=typeof adminProfileOrId==='string'?adminProfileOrId:adminProfileOrId.id; await this.logAdminAction({adminId,admin:typeof adminProfileOrId==='object'?adminProfileOrId:undefined,action,targetType:'video',targetId:videoId,targetName:r.video.title,details}); return r.video; },
  async toggleUserSuspension(userId:string,adminProfile:Profile):Promise<Profile>{ const r=await api<{profile:Profile}>(`/api/admin/users/${encodeURIComponent(userId)}/suspension`,{method:'POST'}); await this.logAdminAction({adminId:adminProfile.id,admin:adminProfile,action:r.profile.is_suspended?'user_suspend':'user_unsuspend',targetType:'user',targetId:userId,targetName:r.profile.display_name}); return r.profile; },
  async getAuditLogs():Promise<AdminAction[]>{ const r=await api<{logs:AdminAction[]}>('/api/admin/audit-logs'); return r.logs||[]; },
  async logAdminAction(data:{adminId:string;admin?:Profile;action:string;targetType:'video'|'user'|'report'|'category'|'tag';targetId:string;targetName?:string;details?:Record<string,any>}):Promise<AdminAction>{ const r=await api<{log:AdminAction}>('/api/admin/audit-log',{method:'POST',body:JSON.stringify(data)}); return r.log; },
};

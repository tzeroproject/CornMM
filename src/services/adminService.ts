import { Report, AdminAction, AdminStats, Video, Profile, ReportStatus } from '../types';
import { supabase, isSupabaseConfigured, isSchemaReady, handleSupabaseError } from '../lib/supabase';
import { videoService } from './videoService';

const STORAGE_REPORTS_KEY = 'streamsphere_production_reports_v2';
const STORAGE_AUDIT_LOGS_KEY = 'streamsphere_production_audit_logs_v2';

function getLocalReports(): Report[] {
  try {
    const raw = localStorage.getItem(STORAGE_REPORTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

function saveLocalReports(reports: Report[]) {
  try {
    localStorage.setItem(STORAGE_REPORTS_KEY, JSON.stringify(reports));
  } catch (e) {}
}

function getLocalAuditLogs(): AdminAction[] {
  try {
    const raw = localStorage.getItem(STORAGE_AUDIT_LOGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

function saveLocalAuditLogs(logs: AdminAction[]) {
  try {
    localStorage.setItem(STORAGE_AUDIT_LOGS_KEY, JSON.stringify(logs));
  } catch (e) {}
}

export const adminService = {
  
  async syncBunnyVideos(adminProfileOrId: Profile | string): Promise<{ syncedCount: number, totalBunnyVideos: number }> {
    try {
      const res = await fetch('/api/admin/sync-bunny', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync from Bunny');
      
      const adminId = typeof adminProfileOrId === 'string' ? adminProfileOrId : adminProfileOrId.id;
      await this.logAdminAction({
        adminId,
        action: 'bunny_sync',
        targetType: 'system',
        targetId: 'bunny_sync',
        targetName: 'Bunny CDN Sync',
        details: { syncedCount: data.syncedCount, totalBunnyVideos: data.totalBunnyVideos },
      });
      
      return data;
    } catch (err: any) {
      console.error('Error syncing bunny videos:', err);
      throw err;
    }
  },

  async getStats(): Promise<AdminStats> {
    let totalUsers = 0;
    let totalVideos = 0;
    let pendingVideos = 0;
    let publishedVideos = 0;
    let pendingReports = 0;
    let totalViews = 0;

    if (isSupabaseConfigured && isSchemaReady()) {
      try {
        // Query users count
        const { count: usersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        totalUsers = usersCount || 0;

        // Query pending videos
        const { count: pendingVidCount } = await supabase
          .from('videos')
          .select('*', { count: 'exact', head: true })
          .eq('moderation_status', 'pending_review');
        pendingVideos = pendingVidCount || 0;

        // Query published videos
        const { data: publishedVids, count: pubCount } = await supabase
          .from('videos')
          .select('views', { count: 'exact' })
          .eq('moderation_status', 'published');
        publishedVideos = pubCount || 0;

        if (publishedVids) {
          totalViews = publishedVids.reduce((acc, v) => acc + (v.views || 0), 0);
        }

        // Total videos count
        const { count: totalVidCount } = await supabase
          .from('videos')
          .select('*', { count: 'exact', head: true });
        totalVideos = totalVidCount || 0;

        // Query reports count
        const { count: repCount } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        pendingReports = repCount || 0;
      } catch (err) {
        handleSupabaseError(err, 'admin getStats');
      }
    }

    if (totalVideos === 0) {
      const { videos, total } = await videoService.getVideos({ pageSize: 1000, includeUnpublished: true });
      totalVideos = total;
      pendingVideos = videos.filter(v => v.moderation_status === 'pending_review').length;
      publishedVideos = videos.filter(v => v.moderation_status === 'published').length;
      totalViews = videos.reduce((acc, v) => acc + (v.views || 0), 0);
      const reports = getLocalReports();
      pendingReports = reports.filter(r => r.status === 'pending').length;
      totalUsers = Math.max(1, new Set(videos.map(v => v.creator_id)).size);
    }

    return {
      totalUsers,
      activeUsers: Math.ceil(totalUsers * 0.6),
      totalVideos,
      pendingVideos,
      publishedVideos,
      reportedVideos: pendingReports,
      totalViews,
      uploadActivity: [
        { date: 'Mon', uploads: Math.round(totalVideos * 0.1), views: Math.round(totalViews * 0.12) },
        { date: 'Tue', uploads: Math.round(totalVideos * 0.12), views: Math.round(totalViews * 0.14) },
        { date: 'Wed', uploads: Math.round(totalVideos * 0.15), views: Math.round(totalViews * 0.16) },
        { date: 'Thu', uploads: Math.round(totalVideos * 0.14), views: Math.round(totalViews * 0.15) },
        { date: 'Fri', uploads: Math.round(totalVideos * 0.18), views: Math.round(totalViews * 0.18) },
        { date: 'Sat', uploads: Math.round(totalVideos * 0.16), views: Math.round(totalViews * 0.13) },
        { date: 'Sun', uploads: Math.round(totalVideos * 0.15), views: Math.round(totalViews * 0.12) },
      ],
    };
  },

  async getDashboardStats(): Promise<AdminStats> {
    return this.getStats();
  },

  async getReports(filterStatus?: ReportStatus): Promise<Report[]> {
    if (isSupabaseConfigured && isSchemaReady()) {
      try {
        let query = supabase
          .from('reports')
          .select('*, video:videos(*), reporter:profiles!reporter_id(*)')
          .order('created_at', { ascending: false });

        if (filterStatus) {
          query = query.eq('status', filterStatus);
        }

        const { data, error } = await query;
        if (error) {
          handleSupabaseError(error, 'getReports');
        } else if (data) {
          return data as Report[];
        }
      } catch (err) {
        handleSupabaseError(err, 'getReports catch');
      }
    }

    const list = getLocalReports();
    if (filterStatus) {
      return list.filter(r => r.status === filterStatus);
    }
    return list;
  },

  async updateReport(
    reportId: string,
    status: ReportStatus,
    adminProfile: Profile | string,
    actionTaken?: string
  ): Promise<Report> {
    const adminId = typeof adminProfile === 'string' ? adminProfile : adminProfile.id;
    const reviewedAt = new Date().toISOString();

    if (isSupabaseConfigured && isSchemaReady()) {
      try {
        const { data, error } = await supabase
          .from('reports')
          .update({
            status,
            reviewer_id: adminId,
            action_taken: actionTaken || null,
            reviewed_at: reviewedAt,
          })
          .eq('id', reportId)
          .select('*, video:videos(*), reporter:profiles!reporter_id(*)')
          .single();

        if (error) {
          handleSupabaseError(error, 'updateReport');
        } else if (data) {
          await this.logAdminAction({
            adminId,
            admin: typeof adminProfile === 'object' ? adminProfile : undefined,
            action: `report_${status}`,
            targetType: 'report',
            targetId: reportId,
            targetName: `Report #${reportId.slice(0, 8)}`,
            details: { actionTaken },
          });
          return data as Report;
        }
      } catch (err) {
        handleSupabaseError(err, 'updateReport catch');
      }
    }

    const reports = getLocalReports();
    const idx = reports.findIndex(r => r.id === reportId);
    if (idx === -1) throw new Error('Report not found');

    const report = reports[idx];
    report.status = status;
    report.reviewer_id = adminId;
    if (typeof adminProfile === 'object') {
      report.reviewer = adminProfile;
    }
    report.reviewed_at = reviewedAt;
    report.action_taken = actionTaken;
    saveLocalReports(reports);

    await this.logAdminAction({
      adminId,
      admin: typeof adminProfile === 'object' ? adminProfile : undefined,
      action: `report_${status}`,
      targetType: 'report',
      targetId: reportId,
      targetName: `Report #${reportId.slice(0, 8)}`,
      details: { actionTaken },
    });

    return report;
  },

  async resolveReport(
    reportId: string,
    action: 'dismiss' | 'take_down' | 'suspend_user',
    adminProfileOrId: Profile | string
  ): Promise<Report> {
    const reports = await this.getReports();
    const report = reports.find(r => r.id === reportId);
    if (report && action === 'take_down') {
      await this.removeVideo(report.video_id, `Takedown via community report #${reportId}`, adminProfileOrId);
    }
    const status: ReportStatus = action === 'dismiss' ? 'dismissed' : 'resolved';
    return this.updateReport(reportId, status, adminProfileOrId, action);
  },

  async getPendingVideos(): Promise<Video[]> {
    const { videos } = await videoService.getVideos({
      status: 'pending_review',
      pageSize: 50,
      includeUnpublished: true,
    });
    return videos;
  },

  async approveVideo(videoId: string, adminProfileOrId: Profile | string): Promise<Video> {
    const updated = await videoService.updateVideo(videoId, {
      moderation_status: 'published',
    });

    const adminId = typeof adminProfileOrId === 'string' ? adminProfileOrId : adminProfileOrId.id;
    const admin = typeof adminProfileOrId === 'object' ? adminProfileOrId : undefined;

    await this.logAdminAction({
      adminId,
      admin,
      action: 'video_approve',
      targetType: 'video',
      targetId: videoId,
      targetName: updated.title,
      details: { status: 'published' },
    });

    return updated;
  },

  async rejectVideo(videoId: string, reason: string, adminProfileOrId: Profile | string): Promise<Video> {
    const updated = await videoService.updateVideo(videoId, {
      moderation_status: 'rejected',
      rejection_reason: reason,
    });

    const adminId = typeof adminProfileOrId === 'string' ? adminProfileOrId : adminProfileOrId.id;
    const admin = typeof adminProfileOrId === 'object' ? adminProfileOrId : undefined;

    await this.logAdminAction({
      adminId,
      admin,
      action: 'video_reject',
      targetType: 'video',
      targetId: videoId,
      targetName: updated.title,
      details: { reason },
    });

    return updated;
  },

  async removeVideo(videoId: string, reason: string, adminProfileOrId: Profile | string): Promise<Video> {
    const updated = await videoService.updateVideo(videoId, {
      moderation_status: 'removed',
      rejection_reason: reason,
    });

    const adminId = typeof adminProfileOrId === 'string' ? adminProfileOrId : adminProfileOrId.id;
    const admin = typeof adminProfileOrId === 'object' ? adminProfileOrId : undefined;

    await this.logAdminAction({
      adminId,
      admin,
      action: 'video_remove',
      targetType: 'video',
      targetId: videoId,
      targetName: updated.title,
      details: { reason },
    });

    return updated;
  },

  async toggleUserSuspension(userId: string, adminProfile: Profile): Promise<Profile> {
    if (isSupabaseConfigured && isSchemaReady()) {
      try {
        const { data: current } = await supabase.from('profiles').select('is_suspended, display_name').eq('id', userId).single();
        if (current) {
          const nextSuspended = !current.is_suspended;
          const { data: updated } = await supabase
            .from('profiles')
            .update({ is_suspended: nextSuspended })
            .eq('id', userId)
            .select()
            .single();

          if (updated) {
            await this.logAdminAction({
              adminId: adminProfile.id,
              admin: adminProfile,
              action: nextSuspended ? 'user_suspend' : 'user_unsuspend',
              targetType: 'user',
              targetId: userId,
              targetName: current.display_name,
            });
            return updated as Profile;
          }
        }
      } catch (err) {
        handleSupabaseError(err, 'toggleUserSuspension');
      }
    }

    throw new Error('User not found or operation not permitted');
  },

  async getAuditLogs(): Promise<AdminAction[]> {
    try {
      const res = await fetch('/api/admin/audit-logs');
      if (res.ok) {
        const data = await res.json();
        if (data.logs && Array.isArray(data.logs) && data.logs.length > 0) {
          return data.logs;
        }
      }
    } catch {}

    if (isSupabaseConfigured && isSchemaReady()) {
      try {
        const { data, error } = await supabase
          .from('admin_actions')
          .select('*, admin:profiles!admin_id(*)')
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) {
          handleSupabaseError(error, 'getAuditLogs');
        } else if (data) {
          return data as AdminAction[];
        }
      } catch (e) {
        handleSupabaseError(e, 'getAuditLogs catch');
      }
    }

    return getLocalAuditLogs();
  },

  async logAdminAction(data: {
    adminId: string;
    admin?: Profile;
    action: string;
    targetType: 'video' | 'user' | 'report' | 'category' | 'tag';
    targetId: string;
    targetName?: string;
    details?: Record<string, any>;
  }): Promise<AdminAction> {
    const logs = getLocalAuditLogs();
    const newLog: AdminAction = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'log_' + Math.random().toString(36).substring(2, 9),
      admin_id: data.adminId,
      admin: data.admin,
      action: data.action,
      target_type: data.targetType,
      target_id: data.targetId,
      target_name: data.targetName,
      details: data.details,
      ip_address: '127.0.0.1',
      created_at: new Date().toISOString(),
    };

    logs.unshift(newLog);
    saveLocalAuditLogs(logs);

    try {
      await fetch('/api/admin/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch {}

    return newLog;
  },
};

import { Report, AdminAction, AdminStats, Video, Profile, ReportStatus } from '../types';
import { INITIAL_REPORTS, INITIAL_AUDIT_LOGS, INITIAL_PROFILES, INITIAL_VIDEOS } from '../lib/mockData';
import { videoService } from './videoService';

const STORAGE_REPORTS_KEY = 'streamsphere_reports';
const STORAGE_AUDIT_LOGS_KEY = 'streamsphere_audit_logs';

function getReportsList(): Report[] {
  try {
    const raw = localStorage.getItem(STORAGE_REPORTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  localStorage.setItem(STORAGE_REPORTS_KEY, JSON.stringify(INITIAL_REPORTS));
  return INITIAL_REPORTS;
}

function saveReportsList(reports: Report[]) {
  localStorage.setItem(STORAGE_REPORTS_KEY, JSON.stringify(reports));
}

function getAuditLogsList(): AdminAction[] {
  try {
    const raw = localStorage.getItem(STORAGE_AUDIT_LOGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  localStorage.setItem(STORAGE_AUDIT_LOGS_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
  return INITIAL_AUDIT_LOGS;
}

function saveAuditLogsList(logs: AdminAction[]) {
  localStorage.setItem(STORAGE_AUDIT_LOGS_KEY, JSON.stringify(logs));
}

export const adminService = {
  async getStats(): Promise<AdminStats> {
    const { videos, total } = await videoService.getVideos({ pageSize: 1000 });
    const reports = getReportsList();
    const pendingReports = reports.filter(r => r.status === 'pending').length;
    const pendingVideos = videos.filter(v => v.moderation_status === 'pending_review').length;
    const publishedVideos = videos.filter(v => v.moderation_status === 'published').length;
    const totalViews = videos.reduce((acc, v) => acc + (v.views || 0), 0);

    return {
      totalUsers: 14280,
      activeUsers: 3410,
      totalVideos: total,
      pendingVideos,
      publishedVideos,
      reportedVideos: pendingReports,
      totalViews,
      uploadActivity: [
        { date: 'Mon', uploads: 24, views: 18400 },
        { date: 'Tue', uploads: 38, views: 24500 },
        { date: 'Wed', uploads: 42, views: 29800 },
        { date: 'Thu', uploads: 55, views: 34100 },
        { date: 'Fri', uploads: 72, views: 48900 },
        { date: 'Sat', uploads: 94, views: 61200 },
        { date: 'Sun', uploads: 86, views: 58400 },
      ],
    };
  },

  async getDashboardStats(): Promise<AdminStats> {
    return this.getStats();
  },

  async getReports(filterStatus?: ReportStatus): Promise<Report[]> {
    const list = getReportsList();
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
    const reports = getReportsList();
    const idx = reports.findIndex(r => r.id === reportId);
    if (idx === -1) throw new Error('Report not found');

    const adminId = typeof adminProfile === 'string' ? adminProfile : adminProfile.id;
    const profile = typeof adminProfile === 'object' ? adminProfile : INITIAL_PROFILES[0];

    const report = reports[idx];
    report.status = status;
    report.reviewer_id = adminId;
    report.reviewer = profile;
    report.reviewed_at = new Date().toISOString();
    report.action_taken = actionTaken;
    saveReportsList(reports);

    // Record audit action
    await this.logAdminAction({
      adminId,
      admin: profile,
      action: `report_${status}`,
      targetType: 'report',
      targetId: reportId,
      targetName: `Report #${reportId.slice(0, 6)} (${report.reason})`,
      details: { actionTaken },
    });

    return report;
  },

  async resolveReport(
    reportId: string,
    action: 'dismiss' | 'take_down' | 'suspend_user',
    adminProfileOrId: Profile | string
  ): Promise<Report> {
    const reports = getReportsList();
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
    });
    return videos;
  },

  async approveVideo(videoId: string, adminProfileOrId: Profile | string): Promise<Video> {
    const updated = await videoService.updateVideo(videoId, {
      moderation_status: 'published',
    });

    const adminId = typeof adminProfileOrId === 'string' ? adminProfileOrId : adminProfileOrId.id;
    const profile = typeof adminProfileOrId === 'object' ? adminProfileOrId : INITIAL_PROFILES[0];

    await this.logAdminAction({
      adminId,
      admin: profile,
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
    const profile = typeof adminProfileOrId === 'object' ? adminProfileOrId : INITIAL_PROFILES[0];

    await this.logAdminAction({
      adminId,
      admin: profile,
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
    const profile = typeof adminProfileOrId === 'object' ? adminProfileOrId : INITIAL_PROFILES[0];

    await this.logAdminAction({
      adminId,
      admin: profile,
      action: 'video_remove',
      targetType: 'video',
      targetId: videoId,
      targetName: updated.title,
      details: { reason },
    });

    return updated;
  },

  async toggleUserSuspension(userId: string, adminProfile: Profile): Promise<Profile> {
    const profiles = INITIAL_PROFILES;
    const p = profiles.find(item => item.id === userId);
    if (!p) throw new Error('User not found');
    p.is_suspended = !p.is_suspended;

    await this.logAdminAction({
      adminId: adminProfile.id,
      admin: adminProfile,
      action: p.is_suspended ? 'user_suspend' : 'user_unsuspend',
      targetType: 'user',
      targetId: userId,
      targetName: p.display_name,
    });

    return p;
  },

  async getAuditLogs(): Promise<AdminAction[]> {
    return getAuditLogsList();
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
    const logs = getAuditLogsList();
    const newLog: AdminAction = {
      id: 'log_' + Math.random().toString(36).substring(2, 9),
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
    saveAuditLogsList(logs);

    // Call server audit endpoint
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

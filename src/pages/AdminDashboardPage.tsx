import React, { useEffect, useState } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Trash2, 
  FileText, 
  Users, 
  Video as VideoIcon,
  Search,
  ExternalLink,
  Ban,
  Filter
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { Video, Report, AuditLog } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Link } from 'react-router-dom';

export const AdminDashboardPage: React.FC = () => {
  const { user, isAdmin, switchDemoProfile } = useAuth();
  const { showToast } = useNotification();

  const [activeTab, setActiveTab] = useState<'moderation' | 'reports' | 'audit'>('moderation');
  const [stats, setStats] = useState({
    totalVideos: 0,
    pendingVideos: 0,
    reportedVideos: 0,
    totalViews: 0,
    totalUsers: 0,
  });
  const [pendingVideos, setPendingVideos] = useState<Video[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAdminData() {
      setIsLoading(true);
      try {
        const [st, pv, rep, logs] = await Promise.all([
          adminService.getDashboardStats(),
          adminService.getPendingVideos(),
          adminService.getReports(),
          adminService.getAuditLogs(),
        ]);
        setStats(st);
        setPendingVideos(pv);
        setReports(rep);
        setAuditLogs(logs);
      } catch (err) {
        console.error('Failed to load admin data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAdminData();
  }, [isAdmin]);

  const handleApproveVideo = async (videoId: string, title: string) => {
    try {
      await adminService.approveVideo(videoId, user?.id || 'admin-marcus');
      setPendingVideos(pendingVideos.filter((v) => v.id !== videoId));
      setStats((s) => ({ ...s, pendingVideos: Math.max(0, s.pendingVideos - 1) }));
      showToast({ type: 'success', title: 'Video Approved', message: `"${title}" is now published.` });
      // Refresh audit logs
      const updatedLogs = await adminService.getAuditLogs();
      setAuditLogs(updatedLogs);
    } catch (e: any) {
      showToast({ type: 'error', title: 'Action Failed', message: e.message });
    }
  };

  const handleRejectVideo = async (videoId: string, title: string) => {
    const reason = window.prompt(`Provide reason for rejecting "${title}":`, 'Violates community guidelines / copyright clearance');
    if (!reason) return;

    try {
      await adminService.rejectVideo(videoId, reason, user?.id || 'admin-marcus');
      setPendingVideos(pendingVideos.filter((v) => v.id !== videoId));
      setStats((s) => ({ ...s, pendingVideos: Math.max(0, s.pendingVideos - 1) }));
      showToast({ type: 'warning', title: 'Video Rejected', message: reason });
      const updatedLogs = await adminService.getAuditLogs();
      setAuditLogs(updatedLogs);
    } catch (e: any) {
      showToast({ type: 'error', title: 'Action Failed', message: e.message });
    }
  };

  const handleResolveReport = async (reportId: string, action: 'dismiss' | 'take_down' | 'suspend_user') => {
    try {
      await adminService.resolveReport(reportId, action, user?.id || 'admin-marcus');
      setReports(reports.filter((r) => r.id !== reportId));
      setStats((s) => ({ ...s, reportedVideos: Math.max(0, s.reportedVideos - 1) }));
      showToast({
        type: 'success',
        title: 'Report Handled',
        message: `Action: ${action.replace('_', ' ').toUpperCase()}`,
      });
      const updatedLogs = await adminService.getAuditLogs();
      setAuditLogs(updatedLogs);
    } catch (e: any) {
      showToast({ type: 'error', title: 'Action Failed', message: e.message });
    }
  };

  // If user is not admin, show instant switch banner
  if (!isAdmin) {
    return (
      <div className="py-20 max-w-lg mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white font-editorial italic">Administrator Credentials Required</h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          The StreamSphere Admin Suite and Moderation Queue is strictly restricted to system administrators with verified RBAC clearance.
        </p>
        <button
          onClick={() => switchDemoProfile('admin')}
          className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
        >
          Switch to Administrator Session (Marcus Vance)
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-400" />
            Trust & Safety Admin Suite
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Enforce DMCA, review uploaded streams, audit moderation logs, and protect creator rights.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Active Moderator: {user?.display_name}
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-lg">
          <div className="text-[10px] uppercase font-semibold text-zinc-400 mb-1">Total Streams</div>
          <div className="text-2xl font-bold text-white font-mono">{stats.totalVideos}</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-lg">
          <div className="text-[10px] uppercase font-semibold text-amber-400 mb-1">Pending Review</div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{stats.pendingVideos}</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-lg">
          <div className="text-[10px] uppercase font-semibold text-rose-400 mb-1">Pending Reports</div>
          <div className="text-2xl font-bold text-rose-400 font-mono">{stats.reportedVideos}</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-lg">
          <div className="text-[10px] uppercase font-semibold text-amber-400/80 mb-1">Registered Users</div>
          <div className="text-2xl font-bold text-white font-mono">{stats.totalUsers}</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-lg col-span-2 lg:col-span-1">
          <div className="text-[10px] uppercase font-semibold text-zinc-400 mb-1">Total CDN Views</div>
          <div className="text-2xl font-bold text-white font-mono">{(stats.totalViews).toLocaleString()}</div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-white/10 text-xs font-semibold gap-2">
        <button
          onClick={() => setActiveTab('moderation')}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'moderation'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <VideoIcon className="w-4 h-4" />
          Review Queue ({pendingVideos.length})
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'reports'
              ? 'border-rose-400 text-rose-400'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Flagged Reports ({reports.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'audit'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Moderation Queue */}
      {activeTab === 'moderation' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              Videos Awaiting Publishing Verification
            </h3>
            <span className="text-xs text-zinc-500">Bunny transcoding complete</span>
          </div>

          {pendingVideos.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-white/10 bg-[#0a0a0a]">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <h4 className="font-semibold text-white">Review Queue is Clear</h4>
              <p className="text-xs text-zinc-500 mt-1">All newly uploaded streams have been processed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingVideos.map((v) => (
                <div
                  key={v.id}
                  className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <img
                      src={v.thumbnail_url}
                      alt={v.title}
                      className="aspect-video w-36 rounded-xl object-cover bg-black border border-white/10 shrink-0"
                    />
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {v.visibility.toUpperCase()}
                        </span>
                        {v.is_age_restricted && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400">
                            18+
                          </span>
                        )}
                        <span className="text-xs text-zinc-500">{new Date(v.created_at).toLocaleString()}</span>
                      </div>
                      <h4 className="font-bold text-sm text-white truncate">{v.title}</h4>
                      <p className="text-xs text-zinc-400 line-clamp-1">{v.description || 'No description provided.'}</p>
                      <p className="text-[11px] text-zinc-500 font-mono">
                        Creator: {v.creator?.display_name || v.creator_id} • Bunny ID: {v.bunny_video_id || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                    <Link
                      to={`/watch/${v.slug || v.id}`}
                      className="p-2 rounded-xl bg-[#161616] hover:bg-[#202020] border border-white/10 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                      title="Preview Stream"
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </Link>
                    <button
                      onClick={() => handleApproveVideo(v.id, v.title)}
                      className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectVideo(v.id, v.title)}
                      className="p-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: User Reports Queue */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white">
            Community Reports & Copyright Inquiries
          </h3>

          {reports.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-white/10 bg-[#0a0a0a]">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <h4 className="font-semibold text-white">Zero Open Reports</h4>
              <p className="text-xs text-zinc-500 mt-1">No community reports or takedown requests currently pending.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 space-y-3 shadow-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 uppercase">
                        Reason: {r.reason.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-zinc-400">
                        Target: <strong className="text-white font-semibold">{r.video?.title || r.video_id}</strong>
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500">
                      Reported on {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#050505] border border-white/5 text-xs text-zinc-300">
                    <span className="font-semibold text-zinc-400">Reporter's Statement: </span>
                    {r.description}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Link
                      to={`/watch/${r.video?.slug || r.video_id}`}
                      className="px-3 py-1.5 rounded-lg bg-[#161616] hover:bg-[#202020] border border-white/10 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Inspect Stream
                    </Link>
                    <button
                      onClick={() => handleResolveReport(r.id, 'dismiss')}
                      className="px-3 py-1.5 rounded-lg bg-[#161616] hover:bg-[#202020] border border-white/10 text-zinc-300 text-xs font-semibold transition-colors"
                    >
                      Dismiss (No Violation)
                    </button>
                    <button
                      onClick={() => handleResolveReport(r.id, 'take_down')}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove Content
                    </button>
                    <button
                      onClick={() => handleResolveReport(r.id, 'suspend_user')}
                      className="px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800/60 hover:bg-rose-950 text-rose-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Ban className="w-3.5 h-3.5" /> Suspend Creator
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white">
            Immutable Administrative Audit Trail
          </h3>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-xl">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-[#050505] text-zinc-400 uppercase text-[10px] font-semibold border-b border-white/10">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Target Type</th>
                  <th className="p-3.5">Target ID</th>
                  <th className="p-3.5">Admin User</th>
                  <th className="p-3.5">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] font-mono text-[11px] transition-colors">
                    <td className="p-3.5 text-zinc-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 text-zinc-400 capitalize">{log.target_type}</td>
                    <td className="p-3.5 text-zinc-400 truncate max-w-[120px]">{log.target_id}</td>
                    <td className="p-3.5 text-zinc-200">{log.admin_user?.display_name || log.admin_id}</td>
                    <td className="p-3.5 text-zinc-400 font-sans">{log.details?.reason || 'Verified administrative action'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

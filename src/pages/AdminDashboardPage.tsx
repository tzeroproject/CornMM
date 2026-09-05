import React, { useEffect, useState } from 'react';
import { RefreshCw, 
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
import { Video, Report, AdminAction } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export const AdminDashboardPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useNotification();

  const [activeTab, setActiveTab] = useState<'reports' | 'uqload' | 'audit'>('reports');
  const [bunnyVideos, setBunnyVideos] = useState<any[]>([]);
  const [transferringId, setTransferringId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalVideos: 0,
    
    reportedVideos: 0,
    totalViews: 0,
    totalUsers: 0,
  });
    const [pendingVideos, setPendingVideos] = useState<Video[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const handleSyncBunny = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const res = await adminService.syncBunnyVideos(user);
      showToast({ type: 'success', title: 'Sync Complete', message: `Successfully synced ${res.syncedCount} new videos from Bunny (${res.totalBunnyVideos} total).` });
      // Reload stats
      const [st, pv, rep, al] = await Promise.all([
        adminService.getStats(),
        adminService.getPendingVideos(),
        adminService.getReports(),
        adminService.getAuditLogs(),
      ]);
      setStats(st);
      setPendingVideos(pv);
      setReports(rep);
      setAuditLogs(al);
    } catch (err: any) {
      showToast({ type: 'error', title: 'Sync Failed', message: err.message });
    } finally {
      setIsSyncing(false);
    }
  };


  useEffect(() => {
    async function loadAdminData() {
      if (!isAdmin) {
        setIsLoading(false);
        return;
      }
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
        await loadBunnyVideos();
      } catch (err) {
        console.error('Failed to load admin data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAdminData();
  }, [isAdmin]);

  



  const loadBunnyVideos = async () => {
    if (!isAdmin) return;
    let { data, error } = await supabase
      .from('videos')
      .select('id,title,slug,thumbnail_url,bunny_video_id,processing_status,uqload_filecode,uqload_embed_url,uqload_status,uqload_error,uqload_transferred_at')
      .not('bunny_video_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    // Gracefully handle missing uqload columns if migration hasn't run yet
    if (error && error.code === '42703') {
      const fallback = await supabase
        .from('videos')
        .select('id,title,slug,thumbnail_url,bunny_video_id,processing_status')
        .not('bunny_video_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;
    setBunnyVideos(data || []);
  };

  const handleBunnyToUqload = async (videoId: string) => {
    setTransferringId(videoId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Your admin session is missing. Please sign in again.');
      }

      const response = await fetch(`/api/admin/uqload/transfer/${videoId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || result.details || 'Transfer failed');

      showToast({
        type: 'success',
        title: result.alreadyTransferred ? 'Already Transferred' : 'UQLOAD Transfer Queued',
        message: result.fileCode ? `UQLOAD file code: ${result.fileCode}` : 'Remote upload has been queued.',
      });

      await loadBunnyVideos();
      const logs = await adminService.getAuditLogs();
      setAuditLogs(logs);
    } catch (err: any) {
      showToast({ type: 'error', title: 'UQLOAD Transfer Failed', message: err.message });
      await loadBunnyVideos().catch(() => undefined);
    } finally {
      setTransferringId(null);
    }
  };

  const handleResolveReport = async (reportId: string, action: 'dismiss' | 'take_down' | 'suspend_user') => {
    if (!user) return;
    try {
      await adminService.resolveReport(reportId, action, user);
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

  if (!isAdmin) {
    return <Navigate to="/corn-admin-login" replace />;
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

        <div className="flex flex-col items-end gap-2">
          <button
            onClick={handleSyncBunny}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-semibold hover:bg-amber-500/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Bunny Videos'}
          </button>

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
          onClick={() => { setActiveTab('uqload'); loadBunnyVideos().catch((e) => showToast({ type: 'error', title: 'Load Failed', message: e.message })); }}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'uqload'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <ExternalLink className="w-4 h-4" />
          Bunny → UQLOAD ({bunnyVideos.length})
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


      {/* Bunny -> UQLOAD Transfer */}
      {activeTab === 'uqload' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white">Bunny → UQLOAD Remote Transfer</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Admin-only. UQLOAD fetches the Bunny MP4 directly; the app server does not download the video bytes.
              </p>
            </div>
            <button
              onClick={() => loadBunnyVideos().catch((e) => showToast({ type: 'error', title: 'Refresh Failed', message: e.message }))}
              className="px-3 py-1.5 rounded-lg bg-[#161616] border border-white/10 text-zinc-300 text-xs font-semibold hover:bg-[#202020]"
            >
              Refresh
            </button>
          </div>

          {bunnyVideos.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-white/10 bg-[#0a0a0a]">
              <VideoIcon className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
              <h4 className="font-semibold text-white">No Bunny Videos Found</h4>
              <p className="text-xs text-zinc-500 mt-1">Sync Bunny videos first, then return here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bunnyVideos.map((v) => (
                <div key={v.id} className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 flex flex-col md:flex-row gap-4 md:items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={v.thumbnail_url || ''} alt="" className="w-32 aspect-video rounded-lg object-cover bg-black border border-white/10 shrink-0" />
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate">{v.title}</h4>
                      <p className="text-[10px] text-zinc-500 font-mono mt-1">Bunny: {v.bunny_video_id}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-zinc-400">
                          Bunny: {v.processing_status || 'unknown'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-zinc-400">
                          UQLOAD: {v.uqload_status || 'not_started'}
                        </span>
                        {v.uqload_filecode && (
                          <a href={v.uqload_embed_url || `https://uqload.vc/e/${v.uqload_filecode}`} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-400 hover:underline">
                            {v.uqload_filecode}
                          </a>
                        )}
                      </div>
                      {v.uqload_error && <p className="text-[10px] text-rose-400 mt-1">{v.uqload_error}</p>}
                    </div>
                  </div>

                  <button
                    onClick={() => handleBunnyToUqload(v.id)}
                    disabled={transferringId === v.id || Boolean(v.uqload_filecode)}
                    className="shrink-0 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {transferringId === v.id ? 'Sending...' : v.uqload_filecode ? 'Transferred' : 'Transfer to UQLOAD'}
                  </button>
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

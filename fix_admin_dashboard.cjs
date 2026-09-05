const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboardPage.tsx', 'utf8');

content = content.replace("pendingVideos: 0,", "");
content = content.replace(/const \[pendingVideos.*?\] =.*?;/g, "");
content = content.replace(/adminService\.getPendingVideos\(\),/g, "");
content = content.replace(/setPendingVideos\(pv\);/g, "");

const pendingStatCard = `<div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-5">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                <VideoIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-[10px] uppercase font-semibold text-amber-400 mb-1">Pending Review</div>
            <div className="text-2xl font-bold text-amber-400 font-mono">{stats.pendingVideos}</div>
          </div>`;

content = content.replace(pendingStatCard, "");

const reviewQueueTab = `<button
          onClick={() => setActiveTab('moderation')}
          className={\`pb-3 px-4 border-b-2 flex items-center gap-2 transition-colors \${
            activeTab === 'moderation'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-white'
          }\`}
        >
          <VideoIcon className="w-4 h-4" />
          Review Queue ({pendingVideos.length})
        </button>`;

content = content.replace(reviewQueueTab, "");

const reviewQueueContent = `{/* Tab 1: Moderation Queue */}
      {activeTab === 'moderation' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              Videos Awaiting Publishing Verification
            </h3>
            <div className="text-xs text-zinc-500 font-mono">
              {pendingVideos.length} pending
            </div>
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
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                            18+
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(v.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-[300px]">
                        {v.title}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-2">
                        <img src={v.creator?.avatar_url} alt="" className="w-4 h-4 rounded-full" />
                        <span className="text-[11px] text-zinc-400">
                          {v.creator?.display_name}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                    <Link
                      to={\`/watch/\${v.slug || v.id}\`}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      target="_blank"
                    >
                      <Play className="w-4 h-4" />
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
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}`;

content = content.replace(reviewQueueContent, "");

content = content.replace(/const handleApproveVideo = [\s\S]*?message: e.message \}\);\n    \}\n  \};/g, "");

content = content.replace(/const pendingRes = .*?\n/g, "");

fs.writeFileSync('src/pages/AdminDashboardPage.tsx', content);
console.log("AdminDashboard fully cleaned");

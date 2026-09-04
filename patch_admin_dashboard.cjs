const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboardPage.tsx', 'utf8');

const importAdd = `import { RefreshCw } from 'lucide-react';\n`;
if (!code.includes('RefreshCw')) {
  code = code.replace("import { ", "import { RefreshCw, ");
}

const stateAdd = `
  const [isSyncing, setIsSyncing] = useState(false);
  
  const handleSyncBunny = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const res = await adminService.syncBunnyVideos(user);
      showToast({ type: 'success', title: 'Sync Complete', message: \`Successfully synced \${res.syncedCount} new videos from Bunny (\${res.totalBunnyVideos} total).\` });
      // Reload stats
      const [st, pv, rep, al] = await Promise.all([
        adminService.getStats(),
        adminService.getPendingVideos(),
        adminService.getReportedContent(),
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
`;

code = code.replace(
  'const [isLoading, setIsLoading] = useState(true);',
  'const [isLoading, setIsLoading] = useState(true);' + stateAdd
);

const buttonHTML = `
          <button
            onClick={handleSyncBunny}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-semibold hover:bg-amber-500/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={\`w-3 h-3 \${isSyncing ? 'animate-spin' : ''}\`} />
            {isSyncing ? 'Syncing...' : 'Sync Bunny Videos'}
          </button>
`;

code = code.replace(
  '<div className="flex items-center gap-2">',
  '<div className="flex flex-col items-end gap-2">' + buttonHTML
);

fs.writeFileSync('src/pages/AdminDashboardPage.tsx', code);
console.log("Patched AdminDashboardPage.tsx");

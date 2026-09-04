const fs = require('fs');
let code = fs.readFileSync('src/services/adminService.ts', 'utf8');

const syncMethod = `
  async syncBunnyVideos(adminProfileOrId: Profile | string): Promise<{ syncedCount: number, totalBunnyVideos: number }> {
    try {
      const res = await fetch('/api/admin/sync-bunny', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync from Bunny');
      
      const adminId = typeof adminProfileOrId === 'string' ? adminProfileOrId : adminProfileOrId.id;
      await this.logAction({
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
`;

code = code.replace(
  'async getStats(): Promise<AdminStats> {',
  syncMethod + '\n  async getStats(): Promise<AdminStats> {'
);

fs.writeFileSync('src/services/adminService.ts', code);
console.log("Patched adminService.ts with syncBunnyVideos");

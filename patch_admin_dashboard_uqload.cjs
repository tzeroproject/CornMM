const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboardPage.tsx', 'utf8');

const targetStr = `
  const loadBunnyVideos = async () => {
    if (!isAdmin) return;
    const { data, error } = await supabase
      .from('videos')
      .select('id,title,slug,thumbnail_url,bunny_video_id,processing_status,uqload_filecode,uqload_embed_url,uqload_status,uqload_error,uqload_transferred_at')
      .not('bunny_video_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    setBunnyVideos(data || []);
  };
`;

const repStr = `
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
`;

content = content.replace(targetStr, repStr);
fs.writeFileSync('src/pages/AdminDashboardPage.tsx', content);
console.log("Patched AdminDashboardPage.tsx");

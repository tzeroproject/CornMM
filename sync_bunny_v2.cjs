const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function sync() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bunnyApiKey = process.env.BUNNY_API_KEY;
  const bunnyLibraryId = process.env.BUNNY_LIBRARY_ID;
  const bunnyHostname = process.env.BUNNY_CDN_HOSTNAME || "vz-cdn.bunnycdn.net";

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch any valid profile ID
  const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
  let creatorId = profiles && profiles.length > 0 ? profiles[0].id : null;

  if (!creatorId) {
    console.log("No profiles found. Creating a system creator profile...");
    creatorId = 'system-creator-id';
    await supabase.from('profiles').insert({
      id: creatorId,
      email: 'system@cornmm.tv',
      display_name: 'CornMM Admin',
      role: 'admin',
      is_verified: true
    });
  }

  const res = await fetch(`https://video.bunnycdn.com/library/${bunnyLibraryId}/videos`, {
    headers: { 'AccessKey': bunnyApiKey, 'Accept': 'application/json' }
  });

  const resJson = await res.json();
  const videos = resJson.items || resJson;
  const videoList = Array.isArray(videos) ? videos : (videos.items || []);

  for (const v of videoList) {
    const videoGuid = v.guid;
    const { data: existing } = await supabase.from('videos').select('id').eq('bunny_video_id', videoGuid).maybeSingle();
    
    if (!existing) {
      const { error } = await supabase.from('videos').insert({
        bunny_video_id: videoGuid,
        title: v.title,
        slug: `${videoGuid}-${Date.now()}`,
        visibility: "public",
        moderation_status: "published",
        processing_status: "ready",
        video_url: `https://${bunnyHostname}/${videoGuid}/playlist.m3u8`,
        playback_url: `https://${bunnyHostname}/${videoGuid}/playlist.m3u8`,
        thumbnail_url: `https://${bunnyHostname}/${videoGuid}/thumbnail.jpg`,
        duration: v.length || 0,
        creator_id: creatorId
      });
      if (error) console.error("Error inserting:", error);
      else console.log(`Inserted: ${v.title}`);
    }
  }
}

sync();

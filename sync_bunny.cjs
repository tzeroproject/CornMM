const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function sync() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bunnyApiKey = process.env.BUNNY_API_KEY;
  const bunnyLibraryId = process.env.BUNNY_LIBRARY_ID;
  const bunnyHostname = process.env.BUNNY_CDN_HOSTNAME || "vz-cdn.bunnycdn.net";

  if (!supabaseUrl || !supabaseKey || !bunnyApiKey || !bunnyLibraryId) {
    console.error("Missing credentials");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("Fetching from Bunny...");
  const res = await fetch(`https://video.bunnycdn.com/library/${bunnyLibraryId}/videos`, {
    headers: { 'AccessKey': bunnyApiKey, 'Accept': 'application/json' }
  });

  if (!res.ok) {
    console.error("Failed to fetch from bunny", await res.text());
    return;
  }

  const resJson = await res.json();
  const videos = resJson.items || resJson; // Depending on pagination, usually it's items
  
  const videoList = Array.isArray(videos) ? videos : (videos.items || []);
  console.log(`Found ${videoList.length} videos in Bunny.`);

  for (const v of videoList) {
    const videoGuid = v.guid;
    const title = v.title;
    const duration = v.length || 0;
    
    // Check if it exists in DB
    const { data: existing } = await supabase.from('videos').select('id').eq('bunny_video_id', videoGuid).maybeSingle();
    
    if (!existing) {
      console.log(`Inserting video: ${title} (${videoGuid})`);
      const { error } = await supabase.from('videos').insert({
        bunny_video_id: videoGuid,
        title: title,
        slug: `${videoGuid}-${Date.now()}`,
        visibility: "public",
        moderation_status: "published",
        processing_status: "ready",
        video_url: `https://${bunnyHostname}/${videoGuid}/playlist.m3u8`,
        playback_url: `https://${bunnyHostname}/${videoGuid}/playlist.m3u8`,
        thumbnail_url: `https://${bunnyHostname}/${videoGuid}/thumbnail.jpg`,
        duration: duration,
        creator_id: "00000000-0000-0000-0000-000000000001"
      });
      if (error) console.error("Error inserting:", error);
    } else {
      console.log(`Video already exists: ${title} (${videoGuid})`);
    }
  }
  console.log("Sync complete!");
}

sync();

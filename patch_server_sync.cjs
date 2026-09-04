const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const newRoute = `
// =====================================================
// SYNC BUNNY VIDEOS
// =====================================================
app.post("/api/admin/sync-bunny", async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase admin not configured" });
    }
    const bunny = bunnyConfig();
    if (!bunny.apiKey || !bunny.libraryId) {
      return res.status(500).json({ error: "Bunny configuration missing" });
    }

    const response = await fetch(\`https://video.bunnycdn.com/library/\${bunny.libraryId}/videos\`, {
      headers: {
        AccessKey: bunny.apiKey,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch from Bunny", details: await response.text() });
    }

    const data = await response.json();
    const videos = Array.isArray(data) ? data : (data.items || []);
    let syncedCount = 0;

    const { data: profiles } = await supabaseAdmin.from("profiles").select("id").limit(1);
    const creatorId = profiles && profiles.length > 0 ? profiles[0].id : null;

    if (!creatorId) {
      return res.status(500).json({ error: "No user profiles found in database to assign as creator." });
    }

    for (const v of videos) {
      const videoGuid = v.guid;
      const { data: existing } = await supabaseAdmin.from("videos").select("id").eq("bunny_video_id", videoGuid).maybeSingle();
      
      if (!existing) {
        await supabaseAdmin.from("videos").insert({
          bunny_video_id: videoGuid,
          title: v.title || "Untitled",
          slug: \`\${videoGuid}-\${Date.now()}\`,
          visibility: "public",
          moderation_status: "published",
          processing_status: "ready",
          video_url: \`https://\${bunny.hostname || "vz-cdn.bunnycdn.net"}/\${videoGuid}/playlist.m3u8\`,
          playback_url: \`https://\${bunny.hostname || "vz-cdn.bunnycdn.net"}/\${videoGuid}/playlist.m3u8\`,
          thumbnail_url: \`https://\${bunny.hostname || "vz-cdn.bunnycdn.net"}/\${videoGuid}/thumbnail.jpg\`,
          duration: v.length || 0,
          creator_id: creatorId
        });
        syncedCount++;
      }
    }

    res.json({ success: true, syncedCount, totalBunnyVideos: videos.length });
  } catch (error: any) {
    console.error("Sync error:", error);
    res.status(500).json({ error: error.message });
  }
});
`;

code = code.replace(
  '// =====================================================\n// VIEW COUNTER',
  newRoute + '\n// =====================================================\n// VIEW COUNTER'
);

fs.writeFileSync('server.ts', code);
console.log("Patched server.ts with /api/admin/sync-bunny");

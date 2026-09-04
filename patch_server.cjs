const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldBlock = `   if(status === 4){

    await supabaseAdmin
    .from("videos")
    .update({

      processing_status:
        "ready",

      moderation_status:
        "published",

      video_url:
      \`https://\${bunny.hostname}/\${videoGuid}/playlist.m3u8\`,

      playback_url:
      \`https://\${bunny.hostname}/\${videoGuid}/playlist.m3u8\`,

      thumbnail_url:
      \`https://\${bunny.hostname}/\${videoGuid}/thumbnail.jpg\`,

      duration:
        payload.Length || 0,

      updated_at:
        new Date()
        .toISOString()

    })
    .eq(
      "bunny_video_id",
      videoGuid
    );

   }`;

const newBlock = `   if(status === 4){
    let title = "Untitled Video";
    let duration = payload.Length || 0;
    try {
      const vidRes = await fetch(\`https://video.bunnycdn.com/library/\${bunny.libraryId}/videos/\${videoGuid}\`, {
        headers: { AccessKey: bunny.apiKey, Accept: 'application/json' }
      });
      if (vidRes.ok) {
        const vData = await vidRes.json();
        if (vData.title) title = vData.title;
        if (vData.length) duration = vData.length;
      }
    } catch(e) {}

    const { data: existing } = await supabaseAdmin.from("videos").select("id").eq("bunny_video_id", videoGuid).maybeSingle();

    if (existing) {
      await supabaseAdmin.from("videos").update({
        processing_status: "ready",
        moderation_status: "published",
        video_url: \`https://\${bunny.hostname}/\${videoGuid}/playlist.m3u8\`,
        playback_url: \`https://\${bunny.hostname}/\${videoGuid}/playlist.m3u8\`,
        thumbnail_url: \`https://\${bunny.hostname}/\${videoGuid}/thumbnail.jpg\`,
        duration: duration,
        updated_at: new Date().toISOString()
      }).eq("bunny_video_id", videoGuid);
    } else {
      await supabaseAdmin.from("videos").insert({
        bunny_video_id: videoGuid,
        title: title,
        slug: \`\${videoGuid}-\${Date.now()}\`,
        visibility: "public",
        moderation_status: "published",
        processing_status: "ready",
        video_url: \`https://\${bunny.hostname}/\${videoGuid}/playlist.m3u8\`,
        playback_url: \`https://\${bunny.hostname}/\${videoGuid}/playlist.m3u8\`,
        thumbnail_url: \`https://\${bunny.hostname}/\${videoGuid}/thumbnail.jpg\`,
        duration: duration,
        creator_id: "00000000-0000-0000-0000-000000000001"
      });
    }
   }`;

code = code.replace(oldBlock, newBlock);

code = code.replace(
  'moderation_status:\n        "pending_review"',
  'moderation_status:\n        "published"'
);

fs.writeFileSync('server.ts', code);
console.log("Patched server.ts");

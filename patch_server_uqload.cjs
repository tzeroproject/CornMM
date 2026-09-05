const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetStr = `    const { data: video, error: videoError } = await supabaseAdmin
      .from("videos")
      .select("id,title,bunny_video_id,uqload_filecode,uqload_status")
      .eq("id", videoId)
      .single();`;

const repStr = `    let { data: video, error: videoError } = await supabaseAdmin
      .from("videos")
      .select("id,title,bunny_video_id,uqload_filecode,uqload_status")
      .eq("id", videoId)
      .single();
      
    if (videoError && videoError.code === '42703') {
      return res.status(500).json({ error: "Missing UQLOAD columns in database. Please run the SQL migration in Supabase Dashboard." });
    }`;

content = content.replace(targetStr, repStr);
fs.writeFileSync('server.ts', content);
console.log("Patched server.ts");

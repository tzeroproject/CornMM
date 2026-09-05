import express from "express";
import multer from "multer";
import FormData from "form-data";
import fs from "fs";
const upload = multer({ dest: '/tmp/uploads/' });

import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT || 3000);

app.use(
  express.json({
    limit: "10mb",
  })
);



// =====================================================
// LULU STREAM INTEGRATION
// Secondary / backup video host, used automatically when Bunny Stream
// is unavailable. The raw file is streamed in from the browser (same
// pattern as the Bunny upload proxy below) and repackaged server-side
// as multipart/form-data for LuluStream's API, so LULU_API_KEY never
// reaches the browser.
// =====================================================

app.put(
  "/api/lulu/upload",
  express.raw({ type: "*/*", limit: "2gb" }),
  async (req, res) => {
    try {
      const key = (process.env.LULU_API_KEY || "").trim();
      if (!key) {
        return res.status(500).json({ error: "LuluStream backup is not configured (LULU_API_KEY missing)." });
      }

      const title = String(req.query.title || "Untitled Video");

      // 1. Ask LuluStream which upload server to use for this key.
      const serverResponse = await fetch(`https://lulustream.com/api/upload/server?key=${encodeURIComponent(key)}`);
      if (!serverResponse.ok) {
        return res.status(502).json({ error: `LuluStream server lookup failed (${serverResponse.status})` });
      }
      const serverData: any = await serverResponse.json();
      if (serverData.status !== 200 || !serverData.result) {
        return res.status(502).json({ error: serverData.msg || "LuluStream did not return an upload server" });
      }
      const uploadServerUrl = serverData.result as string;

      // 2. req.body is the raw file buffer (thanks to express.raw above).
      // Repackage it as multipart/form-data — LuluStream requires a real
      // multipart body, it will not accept a raw binary PUT.
      const fileBuffer: Buffer = req.body;
      const contentType = req.headers["content-type"] || "video/mp4";

      const form = new FormData();
      form.append("key", key);
      form.append("file_title", title);
      form.append("html_redirect", "0");
      form.append("file", new Blob([fileBuffer], { type: contentType as string }), "upload.mp4");

      const uploadResponse = await fetch(uploadServerUrl, { method: "POST", body: form as any });
      if (!uploadResponse.ok) {
        const details = await uploadResponse.text();
        return res.status(502).json({ error: `LuluStream upload failed (${uploadResponse.status})`, details });
      }

      const uploadData: any = await uploadResponse.json();
      const fileEntry = uploadData?.files?.[0];
      if (!fileEntry || fileEntry.status !== "OK" || !fileEntry.filecode) {
        return res.status(502).json({
          error: "LuluStream returned an unexpected upload response",
          details: JSON.stringify(uploadData),
        });
      }

      res.json({
        success: true,
        fileCode: fileEntry.filecode,
        embedUrl: `https://lulustream.com/e/${fileEntry.filecode}`,
      });
    } catch (error: any) {
      console.error("Lulu backup upload error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);


// =====================================================
// UQLOAD STREAM INTEGRATION
// =====================================================






app.post("/api/uqload/proxy-upload", upload.single('file'), async (req, res) => {
  try {
    const key = process.env.UQLOAD_API_KEY;
    if (!key) {
      return res.status(500).json({ error: "UQLOAD_API_KEY environment variable is missing" });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    const serverRes = await fetch(`https://uqload.vc/api/upload/server?key=${encodeURIComponent(key.trim())}`);
    const serverData = await serverRes.json();
    if (serverData.status !== 200 || !serverData.result) {
      throw new Error("Failed to get Uqload upload server");
    }
    const uploadUrl = serverData.result;
    
    const form = new FormData();
    form.append('key', key.trim());
    form.append('file_title', req.body.file_title || 'Video');
    form.append('html_redirect', '0');
    form.append('file', fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      body: form
    });
    
    const uploadResult = await uploadRes.json();
    
    // Clean up temp file
    try {
      fs.unlinkSync(req.file.path);
    } catch(e) {}
    
    res.json(uploadResult);
    
  } catch (error: any) {
    console.error("Uqload proxy upload error:", error);
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/uqload/upload-server", async (req, res) => {
  try {
    const key = process.env.UQLOAD_API_KEY;
    if (!key) {
      return res.status(500).json({ error: "UQLOAD_API_KEY environment variable is missing" });
    }
    const response = await fetch(`https://uqload.vc/api/upload/server?key=${encodeURIComponent(key.trim())}`);
    if (!response.ok) {
       throw new Error(`Uqload API returned ${response.status}`);
    }
    const data = await response.json();
    if (data.status !== 200) {
       throw new Error(data.msg || "Failed to get Uqload upload server");
    }
    res.json({ uploadUrl: data.result, apiKey: key });
  } catch (error: any) {
    console.error("Uqload get upload server error:", error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// SUPABASE SERVER CLIENT
// SERVICE ROLE ONLY
// =====================================================

const supabaseUrl =
  process.env.VITE_SUPABASE_URL || "";

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";


const hasValidSupabase =
  Boolean(
    supabaseUrl &&
    supabaseServiceKey
  );


const supabaseAdmin =
  hasValidSupabase
    ? createClient(
        supabaseUrl,
        supabaseServiceKey,
        {
          auth:{
            autoRefreshToken:false,
            persistSession:false
          }
        }
      )
    : null;



// =====================================================
// BUNNY CONFIG
// =====================================================

function bunnyConfig(){

  return {

    apiKey:
      (process.env.BUNNY_API_KEY || "")
      .trim()
      .replace(/^["']|["']$/g,""),

    libraryId:
      (process.env.BUNNY_LIBRARY_ID || "")
      .trim()
      .replace(/^["']|["']$/g,""),

    hostname:
      (process.env.BUNNY_CDN_HOSTNAME || "")
      .trim()
      .replace(/^["']|["']$/g,"")

  };

}



// =====================================================
// ADMIN AUTHORIZATION
// =====================================================
async function requireAdmin(req: any, res: any): Promise<string | null> {
  const auth = String(req.headers.authorization || '');
  const match = auth.match(/^Bearer\\s+(.+)$/i);
  if (!match || !supabaseAdmin) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(match[1]);
  if (error || !user) {
    res.status(401).json({ error: 'Invalid authentication token' });
    return null;
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }

  return user.id;
}

// =====================================================
// HEALTH CHECK
// =====================================================

app.get(
"/api/health",
(req,res)=>{

 const bunny=bunnyConfig();

 res.json({

   status:"ok",

   supabase:
     hasValidSupabase,

   bunny:
     Boolean(
       bunny.apiKey &&
       bunny.libraryId &&
       bunny.hostname
     ),

   lulu:
     Boolean((process.env.LULU_API_KEY || "").trim()),

   time:
     new Date().toISOString()

 });

});




// =====================================================
// CREATE BUNNY VIDEO
// =====================================================


app.post(
"/api/bunny/create-video",
async(req,res)=>{

 try{


  const {
    title,
    collectionId
  } = req.body;


  const bunny=bunnyConfig();



  if(
    !bunny.apiKey ||
    !bunny.libraryId
  ){

    return res.status(500)
    .json({

      error:
      "Missing Bunny configuration",

      required:[
        "BUNNY_API_KEY",
        "BUNNY_LIBRARY_ID"
      ]

    });

  }



  const response =
    await fetch(

    `https://video.bunnycdn.com/library/${bunny.libraryId}/videos`,

    {

      method:"POST",

      headers:{

        AccessKey:
          bunny.apiKey,

        "Content-Type":
          "application/json"

      },


      body:
      JSON.stringify({

        title:
          title || "Untitled Video",

        collectionId:
          collectionId || undefined

      })

    });


  if(!response.ok){

    const error =
      await response.text();


    return res.status(
      response.status
    )
    .json({

      error:
      "Bunny create video failed",

      details:error

    });

  }



  const data =
    await response.json();



  const videoId =
    data.guid;



  // Save initial video record

  if(supabaseAdmin){

    await supabaseAdmin
    .from("videos")
    .insert({

      bunny_video_id:
        videoId,

      title:
        title || "Untitled Video",

      slug:
        `${videoId}-${Date.now()}`,

      creator_id: (await supabaseAdmin.from("profiles").select("id").limit(1).then(r => r.data?.[0]?.id || null)), visibility:
        "public",

      moderation_status:
        "published",

      processing_status:
        "processing"

    });

  }



  res.json({

    success:true,

    videoId,

    libraryId:
      bunny.libraryId,


    uploadUrl:
    `https://video.bunnycdn.com/library/${bunny.libraryId}/videos/${videoId}`,

    proxyUploadUrl:
    `/api/bunny/upload/${videoId}`,

    cdnHostname:
      bunny.hostname || "vz-cdn.bunnycdn.net"

  });



 }
 catch(error:any){


  console.error(
    "create-video error",
    error
  );


  res.status(500)
  .json({

    error:
    error.message

  });


 }

});




// =====================================================
// BUNNY UPLOAD PROXY
// =====================================================


app.put(
"/api/bunny/upload/:videoId",
async(req,res)=>{


 try{


  const {
    videoId
  } = req.params;


  const bunny =
    bunnyConfig();



  if(
    !bunny.apiKey ||
    !bunny.libraryId
  ){

    return res.status(500)
    .json({

      error:
      "Bunny configuration missing"

    });

  }



  const uploadResponse =
    await fetch(

    `https://video.bunnycdn.com/library/${bunny.libraryId}/videos/${videoId}`,

    {

      method:"PUT",

      headers:{

        AccessKey:
          bunny.apiKey,


        "Content-Type":
          req.headers["content-type"]
          ||
          "application/octet-stream"

      },


      // @ts-ignore
      body:req,

      // @ts-ignore
      duplex:"half"

    });



  if(!uploadResponse.ok){


    const details =
      await uploadResponse.text();



    return res.status(
      uploadResponse.status
    )
    .json({

      error:
      "Bunny upload failed",

      details

    });


  }



  res.json({

    success:true,

    videoId

  });



 }
 catch(error:any){


  console.error(
    "upload error",
    error
  );


  res.status(500)
  .json({

    error:
    error.message

  });


 }

});
// =====================================================
// BUNNY VIDEO STATUS
// =====================================================

app.get(
"/api/bunny/status/:videoId",
async(req,res)=>{

 try{


  const {
    videoId
  } = req.params;


  const bunny =
    bunnyConfig();



  const response =
    await fetch(

    `https://video.bunnycdn.com/library/${bunny.libraryId}/videos/${videoId}`,

    {

      headers:{

        AccessKey:
          bunny.apiKey,

        Accept:
          "application/json"

      }

    });



  if(!response.ok){

    return res.status(
      response.status
    )
    .json({

      error:
      "Unable to get Bunny status"

    });

  }



  const data =
    await response.json();



  const statusMap:any={

    0:"created",

    1:"uploaded",

    2:"processing",

    3:"transcoding",

    4:"finished",

    5:"error",

    6:"failed"

  };



  res.json({

    videoId,

    status:
      data.status,

    statusText:
      statusMap[data.status]
      ||
      "unknown",

    progress:
      data.encodeProgress
      ||
      0,


    duration:
      data.length
      ||
      0


  });



 }
 catch(error:any){

  res.status(500)
  .json({

    error:
    error.message

  });

 }

});





// =====================================================
// BUNNY WEBHOOK
// FINISHED VIDEO AUTO PUBLISH
// =====================================================


app.post(
"/api/webhooks/bunny",
async(req,res)=>{


 try{


 const payload =
   req.body;


 const videoGuid =
   payload.VideoGuid ||
   payload.videoId ||
   payload.id;


 const status =
   payload.Status;



 if(!videoGuid){

   return res.status(400)
   .json({

    error:
    "Missing Bunny video id"

   });

 }



 const bunny =
   bunnyConfig();



 if(supabaseAdmin){



   // Finished

   if(status === 4){


    await supabaseAdmin
    .from("videos")
    .update({

      processing_status:
        "ready",


      moderation_status:
        "published",


      video_url:
      `https://${bunny.hostname}/${videoGuid}/playlist.m3u8`,


      playback_url:
      `https://${bunny.hostname}/${videoGuid}/playlist.m3u8`,


      thumbnail_url:
      `https://${bunny.hostname}/${videoGuid}/thumbnail.jpg`,


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



   }




   // Failed

   if(
     status === 5 ||
     status === 6
   ){


    await supabaseAdmin
    .from("videos")
    .update({

      moderation_status:
        "rejected",

      rejection_reason:
        "Bunny transcoding failed",

      updated_at:
        new Date()
        .toISOString()

    })

    .eq(
      "bunny_video_id",
      videoGuid
    );


   }


 }



 res.json({

  success:true,

  videoGuid,

  status

 });



 }
 catch(error:any){


 res.status(500)
 .json({

  error:
  error.message

 });


 }

});







// =====================================================
// SYNC BUNNY VIDEOS
// =====================================================
// =====================================================
// ADMIN: BUNNY -> UQLOAD REMOTE TRANSFER
// UQLOAD fetches the Bunny MP4 directly; the app server never
// downloads/re-uploads the video bytes.
// =====================================================
app.post("/api/admin/uqload/transfer/:videoId", async (req, res) => {
  try {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;

    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase admin client is not configured" });
    }

    const bunny = bunnyConfig();
    const uqKey = (process.env.UQLOAD_API_KEY || "").trim();

    if (!bunny.apiKey || !bunny.libraryId || !bunny.hostname) {
      return res.status(500).json({ error: "Bunny configuration is incomplete" });
    }
    if (!uqKey) {
      return res.status(500).json({ error: "UQLOAD_API_KEY environment variable is missing" });
    }

    const { videoId } = req.params;
    let { data: video, error: videoError } = await supabaseAdmin
      .from("videos")
      .select("id,title,bunny_video_id,uqload_filecode,uqload_status")
      .eq("id", videoId)
      .single();
      
    if (videoError && videoError.code === '42703') {
      return res.status(500).json({ error: "Missing UQLOAD columns in database. Please run the SQL migration in Supabase Dashboard." });
    }

    if (videoError || !video) {
      return res.status(404).json({ error: "Video not found" });
    }
    if (!video.bunny_video_id) {
      return res.status(400).json({ error: "This video is not linked to a Bunny video" });
    }
    if (video.uqload_filecode) {
      return res.json({
        success: true,
        alreadyTransferred: true,
        fileCode: video.uqload_filecode,
        embedUrl: `https://uqload.vc/e/${video.uqload_filecode}`
      });
    }

    // Bunny MP4 fallback must be enabled for the library/video.
    const mp4Url = `https://${bunny.hostname}/${video.bunny_video_id}/play_720p.mp4`;

    await supabaseAdmin.from("videos").update({
      uqload_status: "uploading",
      uqload_error: null
    }).eq("id", video.id);

    const uqResponse = await fetch(
      `https://uqload.vc/api/upload/url?key=${encodeURIComponent(uqKey)}&url=${encodeURIComponent(mp4Url)}&file_public=1&file_adult=1`
    );

    const raw = await uqResponse.text();
    let data: any;
    try { data = JSON.parse(raw); } catch {
      data = { status: uqResponse.status, msg: raw };
    }

    if (!uqResponse.ok || data.status !== 200 || !data.result?.filecode) {
      await supabaseAdmin.from("videos").update({
        uqload_status: "failed",
        uqload_error: data.msg || `UQLOAD API returned ${uqResponse.status}`
      }).eq("id", video.id);

      return res.status(502).json({
        error: "UQLOAD remote upload request failed",
        details: data.msg || raw
      });
    }

    const fileCode = String(data.result.filecode);
    const embedUrl = `https://uqload.vc/e/${fileCode}`;

    await supabaseAdmin.from("videos").update({
      uqload_filecode: fileCode,
      uqload_embed_url: embedUrl,
      uqload_status: "queued",
      uqload_error: null,
      uqload_transferred_at: new Date().toISOString()
    }).eq("id", video.id);

    await supabaseAdmin.from("admin_actions").insert({
      admin_id: adminId,
      action: "bunny_to_uqload_transfer",
      target_type: "video",
      target_id: video.id,
      details: {
        title: video.title,
        bunny_video_id: video.bunny_video_id,
        uqload_filecode: fileCode
      }
    });

    return res.json({
      success: true,
      fileCode,
      embedUrl,
      sourceUrl: mp4Url,
      status: "queued"
    });
  } catch (error: any) {
    console.error("Bunny -> UQLOAD transfer error:", error);
    return res.status(500).json({ error: error.message || "Transfer failed" });
  }
});

app.post("/api/admin/sync-bunny", async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase admin not configured" });
    }
    const bunny = bunnyConfig();
    if (!bunny.apiKey || !bunny.libraryId) {
      return res.status(500).json({ error: "Bunny configuration missing" });
    }

    const response = await fetch(`https://video.bunnycdn.com/library/${bunny.libraryId}/videos`, {
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
          slug: `${videoGuid}-${Date.now()}`,
          visibility: "public",
          moderation_status: "published",
          processing_status: "ready",
          video_url: `https://${bunny.hostname || "vz-cdn.bunnycdn.net"}/${videoGuid}/playlist.m3u8`,
          playback_url: `https://${bunny.hostname || "vz-cdn.bunnycdn.net"}/${videoGuid}/playlist.m3u8`,
          thumbnail_url: `https://${bunny.hostname || "vz-cdn.bunnycdn.net"}/${videoGuid}/thumbnail.jpg`,
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

// =====================================================
// VIEW COUNTER
// =====================================================


const viewCache =
new Map<string,number>();


app.post(
"/api/videos/:id/view",
async(req,res)=>{


 try{


 const videoId =
   req.params.id;


 const ip =
 req.headers["x-forwarded-for"]
 ||
 req.socket.remoteAddress
 ||
 "unknown";


 const key =
 `${videoId}-${ip}`;



 const now =
 Date.now();



 const old =
 viewCache.get(key);



 if(
   old &&
   now-old < 300000
 ){

   return res.json({

    success:false,

    message:
    "Already counted"

   });

 }



 viewCache.set(
   key,
   now
 );



 if(supabaseAdmin){

   await supabaseAdmin
   .rpc(
    "increment_video_view",
    {
      p_video_id:
      videoId
    }
   );

 }



 res.json({

  success:true

 });


 }
 catch(error:any){


 res.status(500)
 .json({

  error:
  error.message

 });


 }

});






// =====================================================
// ADMIN AUDIT LOG
// =====================================================


app.post(
"/api/admin/audit-log",
async(req,res)=>{


 try{


 const {

  adminId,

  action,

  targetType,

  targetId,

  details

 } = req.body;



 if(supabaseAdmin){


 await supabaseAdmin
 .from("admin_actions")
 .insert({

  admin_id:
    adminId,

  action,

  target_type:
    targetType,

  target_id:
    targetId,

  details:
    details || {}

 });


 }



 res.json({

  success:true

 });



 }
 catch(error:any){


 res.status(500)
 .json({

 error:
 error.message

 });


 }

});






// =====================================================
// VITE SERVER
// =====================================================


async function startServer(){


 if(
 process.env.NODE_ENV !==
 "production"
 ){


 const vite =
 await createViteServer({

  server:{
   middlewareMode:true
  },

  appType:"spa"

 });



 app.use(
   vite.middlewares
 );



 }
 else{


 const dist =
 path.join(
  process.cwd(),
  "dist"
 );


 app.use(
  express.static(dist)
 );


 app.get("*",
 (req,res)=>{

 res.sendFile(
  path.join(
   dist,
   "index.html"
  )
 );

 });



 }



 app.listen(
 PORT,
 "0.0.0.0",
 ()=>{


 console.log(
 `CornMM server running on ${PORT}`
 );


 });



}



startServer();
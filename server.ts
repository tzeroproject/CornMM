import express from "express";
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

      visibility:
        "public",

      moderation_status:
        "pending_review",

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

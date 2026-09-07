import express from "express";
import multer from "multer";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
const app = express();
const PORT = Number(process.env.PORT || 3000);
const upload = multer({ dest: "/tmp/uploads/" });
app.use(express.json({ limit: "10mb" }));

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const hasValidSupabase = Boolean(supabaseUrl && supabaseServiceKey);
const supabaseAdmin = hasValidSupabase ? createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) : null;

function bunnyConfig() { return { apiKey: String(process.env.BUNNY_API_KEY || "").trim().replace(/^["']|["']$/g, ""), libraryId: String(process.env.BUNNY_LIBRARY_ID || "").trim().replace(/^["']|["']$/g, ""), hostname: String(process.env.BUNNY_CDN_HOSTNAME || "").trim().replace(/^["']|["']$/g, "") }; }
function bearerToken(req: any): string | null { const auth = String(req.headers.authorization || ""); const match = auth.match(/^Bearer\s+(.+)$/i); return match ? match[1].trim() : null; }
async function requireUser(req: any, res: any): Promise<any | null> { const token = bearerToken(req); if (!token || !supabaseAdmin) { res.status(401).json({ error: "Authentication required" }); return null; } const { data, error } = await supabaseAdmin.auth.getUser(token); if (error || !data.user) { res.status(401).json({ error: "Invalid authentication token" }); return null; } return data.user; }
async function requireAdmin(req: any, res: any): Promise<string | null> { const user = await requireUser(req, res); if (!user) return null; const { data: profile, error } = await supabaseAdmin!.from("profiles").select("role").eq("id", user.id).single(); if (error || !profile || profile.role !== "admin") { res.status(403).json({ error: "Admin access required" }); return null; } return user.id; }

app.get("/api/health", (_req, res) => { const bunny = bunnyConfig(); res.json({ status: "ok", supabase: hasValidSupabase, bunny: Boolean(bunny.apiKey && bunny.libraryId && bunny.hostname), lulu: Boolean(String(process.env.LULU_API_KEY || "").trim()), time: new Date().toISOString() }); });

const VIDEO_SELECT = "*, category:categories(*), creator:profiles(*)";
function videoQuery(req: any) {
  let q: any = supabaseAdmin!.from("videos").select(VIDEO_SELECT, { count: "exact" });
  const p = req.query;
  if (p.categoryId) q = q.eq("category_id", String(p.categoryId));
  if (p.creatorId) q = q.eq("creator_id", String(p.creatorId));
  if (p.status) q = q.eq("moderation_status", String(p.status));
  if (p.visibility) q = q.eq("visibility", String(p.visibility));
  if (p.searchQuery) { const s = String(p.searchQuery).replace(/[%(),]/g, " "); q = q.or(`title.ilike.%${s}%,description.ilike.%${s}%`); }
  if (String(p.sortBy) === "views" || String(p.sortBy) === "trending") q = q.order("views", { ascending: false }).order("created_at", { ascending: false });
  else if (String(p.sortBy) === "likes") q = q.order("likes_count", { ascending: false });
  else q = q.order("created_at", { ascending: false });
  const page = Math.max(1, Number(p.page || 1)); const size = Math.min(100, Math.max(1, Number(p.pageSize || 12)));
  return q.range((page - 1) * size, page * size - 1);
}
app.get("/api/videos", async (req, res) => { if (!supabaseAdmin) return res.status(500).json({ error: "Supabase server configuration missing" }); try { const { data, count, error } = await videoQuery(req); if (error) return res.status(400).json({ error: error.message, code: error.code }); res.json({ videos: data || [], total: count || 0 }); } catch (e: any) { res.status(500).json({ error: e?.message || "Failed to load videos" }); } });
app.get("/api/videos/:id", async (req, res, next) => { if (req.params.id === "view") return next(); if (!supabaseAdmin) return res.status(500).json({ error: "Supabase server configuration missing" }); try { const id = String(req.params.id); const q = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? supabaseAdmin.from("videos").select(VIDEO_SELECT).or(`id.eq.${id},slug.eq.${id}`).maybeSingle() : supabaseAdmin.from("videos").select(VIDEO_SELECT).eq("slug", id).maybeSingle(); const { data, error } = await q; if (error) return res.status(400).json({ error: error.message, code: error.code }); if (!data) return res.status(404).json({ error: "Video not found" }); res.json({ video: data }); } catch (e: any) { res.status(500).json({ error: e?.message || "Failed to load video" }); } });
app.post("/api/videos", async (req, res) => { const user = await requireUser(req, res); if (!user || !supabaseAdmin) return; try { const v = req.body || {}; const slug = String(v.slug || `${String(v.title || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Math.random().toString(36).slice(2, 7)}`); const row = { ...v, slug, creator_id: v.creator_id || user.id, id: v.id || undefined }; delete row.category; delete row.creator; const { data, error } = await supabaseAdmin.from("videos").insert(row).select(VIDEO_SELECT).single(); if (error) return res.status(400).json({ error: error.message, code: error.code }); res.status(201).json({ video: data }); } catch (e: any) { res.status(500).json({ error: e?.message || "Failed to create video" }); } });
app.patch("/api/videos/:id", async (req, res, next) => { if (req.params.id === "view") return next(); const user = await requireUser(req, res); if (!user || !supabaseAdmin) return; try { const updates = { ...(req.body || {}), updated_at: new Date().toISOString() }; delete (updates as any).id; delete (updates as any).category; delete (updates as any).creator; const { data, error } = await supabaseAdmin.from("videos").update(updates).eq("id", req.params.id).select(VIDEO_SELECT).single(); if (error) return res.status(400).json({ error: error.message, code: error.code }); res.json({ video: data }); } catch (e: any) { res.status(500).json({ error: e?.message || "Failed to update video" }); } });
app.delete("/api/videos/:id", async (req, res, next) => { if (req.params.id === "view") return next(); const user = await requireUser(req, res); if (!user || !supabaseAdmin) return; try { const { error } = await supabaseAdmin.from("videos").delete().eq("id", req.params.id); if (error) return res.status(400).json({ error: error.message, code: error.code }); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e?.message || "Failed to delete video" }); } });
app.get("/api/categories", async (_req, res) => { if (!supabaseAdmin) return res.status(500).json({ error: "Supabase server configuration missing" }); try { const { data, error } = await supabaseAdmin.from("categories").select("*").order("name"); if (error) return res.status(400).json({ error: error.message }); res.json({ categories: data || [] }); } catch (e: any) { res.status(500).json({ error: e?.message || "Failed to load categories" }); } });
app.get("/api/tags", async (_req, res) => { if (!supabaseAdmin) return res.status(500).json({ error: "Supabase server configuration missing" }); try { const { data, error } = await supabaseAdmin.from("tags").select("*").order("name"); if (error) return res.status(400).json({ error: error.message }); res.json({ tags: data || [] }); } catch (e: any) { res.status(500).json({ error: e?.message || "Failed to load tags" }); } });

async function interactionUser(req: any, res: any) { return requireUser(req, res); }
app.get("/api/interactions/likes/:videoId", async (req, res) => { const u = await interactionUser(req, res); if (!u || !supabaseAdmin) return; const { data } = await supabaseAdmin.from("likes").select("id").eq("user_id", u.id).eq("video_id", req.params.videoId).maybeSingle(); res.json({ isLiked: Boolean(data) }); });
app.post("/api/interactions/likes/:videoId/toggle", async (req, res) => { const u = await interactionUser(req, res); if (!u || !supabaseAdmin) return; try { const { data: existing } = await supabaseAdmin.from("likes").select("id").eq("user_id", u.id).eq("video_id", req.params.videoId).maybeSingle(); const { data: video } = await supabaseAdmin.from("videos").select("likes_count").eq("id", req.params.videoId).single(); const current = Number(video?.likes_count || 0); if (existing) { await supabaseAdmin.from("likes").delete().eq("id", existing.id); const newCount = Math.max(0, current - 1); await supabaseAdmin.from("videos").update({ likes_count: newCount }).eq("id", req.params.videoId); return res.json({ isLiked: false, newCount }); } const { error } = await supabaseAdmin.from("likes").insert({ user_id: u.id, video_id: req.params.videoId }); if (error) return res.status(400).json({ error: error.message }); const newCount = current + 1; await supabaseAdmin.from("videos").update({ likes_count: newCount }).eq("id", req.params.videoId); res.json({ isLiked: true, newCount }); } catch (e: any) { res.status(500).json({ error: e?.message || "Like failed" }); } });
app.get("/api/interactions/favorites", async (req, res) => { const u = await interactionUser(req, res); if (!u || !supabaseAdmin) return; const { data, error } = await supabaseAdmin.from("favorites").select("*, video:videos(*, category:categories(*), creator:profiles(*))").eq("user_id", u.id).order("created_at", { ascending: false }); if (error) return res.status(400).json({ error: error.message }); res.json({ favorites: data || [] }); });
app.post("/api/interactions/favorites/:videoId/toggle", async (req, res) => { const u = await interactionUser(req, res); if (!u || !supabaseAdmin) return; const { data: existing } = await supabaseAdmin.from("favorites").select("id").eq("user_id", u.id).eq("video_id", req.params.videoId).maybeSingle(); if (existing) { await supabaseAdmin.from("favorites").delete().eq("id", existing.id); return res.json({ isFavorited: false }); } const { error } = await supabaseAdmin.from("favorites").insert({ user_id: u.id, video_id: req.params.videoId }); if (error) return res.status(400).json({ error: error.message }); res.json({ isFavorited: true }); });
app.get("/api/interactions/favorites/:videoId", async (req, res) => { const u = await interactionUser(req, res); if (!u || !supabaseAdmin) return; const { data } = await supabaseAdmin.from("favorites").select("id").eq("user_id", u.id).eq("video_id", req.params.videoId).maybeSingle(); res.json({ isFavorited: Boolean(data) }); });
app.get("/api/interactions/history", async (req, res) => { const u = await interactionUser(req, res); if (!u || !supabaseAdmin) return; const { data, error } = await supabaseAdmin.from("watch_history").select("*, video:videos(*, category:categories(*), creator:profiles(*))").eq("user_id", u.id).order("watched_at", { ascending: false }).limit(50); if (error) return res.status(400).json({ error: error.message }); res.json({ history: data || [] }); });
app.post("/api/interactions/history", async (req, res) => { const u = await interactionUser(req, res); if (!u || !supabaseAdmin) return; const { videoId, progress, duration } = req.body || {}; const isCompleted = Number(duration) > 0 && Number(progress) >= Number(duration) * .9; const { error } = await supabaseAdmin.from("watch_history").upsert({ user_id: u.id, video_id: videoId, progress_seconds: Math.floor(Number(progress) || 0), duration_seconds: Math.floor(Number(duration) || 0), completed: isCompleted, watched_at: new Date().toISOString() }, { onConflict: "user_id,video_id" }); if (error) return res.status(400).json({ error: error.message }); res.json({ success: true }); });
app.delete("/api/interactions/history/:videoId", async (req, res) => { const u = await interactionUser(req, res); if (!u || !supabaseAdmin) return; await supabaseAdmin.from("watch_history").delete().eq("user_id", u.id).eq("video_id", req.params.videoId); res.json({ success: true }); });
app.delete("/api/interactions/history", async (req, res) => { const u = await interactionUser(req, res); if (!u || !supabaseAdmin) return; await supabaseAdmin.from("watch_history").delete().eq("user_id", u.id); res.json({ success: true }); });
app.get("/api/interactions/subscriptions/:creatorId", async (req, res) => { const u = await interactionUser(req, res); if (!u || !supabaseAdmin) return; const { data } = await supabaseAdmin.from("subscriptions").select("id").eq("subscriber_id", u.id).eq("creator_id", req.params.creatorId).maybeSingle(); res.json({ isSubscribed: Boolean(data) }); });
app.post("/api/interactions/subscriptions/:creatorId/toggle", async (req, res) => { const u = await interactionUser(req, res); if (!u || !supabaseAdmin) return; const { data: existing } = await supabaseAdmin.from("subscriptions").select("id").eq("subscriber_id", u.id).eq("creator_id", req.params.creatorId).maybeSingle(); const { data: profile } = await supabaseAdmin.from("profiles").select("subscriber_count").eq("id", req.params.creatorId).single(); const current = Number(profile?.subscriber_count || 0); if (existing) { await supabaseAdmin.from("subscriptions").delete().eq("id", existing.id); const n = Math.max(0, current - 1); await supabaseAdmin.from("profiles").update({ subscriber_count: n }).eq("id", req.params.creatorId); return res.json({ isSubscribed: false, newSubscriberCount: n }); } const { error } = await supabaseAdmin.from("subscriptions").insert({ subscriber_id: u.id, creator_id: req.params.creatorId }); if (error) return res.status(400).json({ error: error.message }); const n = current + 1; await supabaseAdmin.from("profiles").update({ subscriber_count: n }).eq("id", req.params.creatorId); res.json({ isSubscribed: true, newSubscriberCount: n }); });
app.get("/api/interactions/comments/:videoId", async (req, res) => { if (!supabaseAdmin) return res.status(500).json({ error: "Supabase server configuration missing" }); const { data, error } = await supabaseAdmin.from("comments").select("*, user:profiles(*)").eq("video_id", req.params.videoId).eq("is_hidden", false).order("created_at", { ascending: false }); if (error) return res.status(400).json({ error: error.message }); res.json({ comments: data || [] }); });
app.post("/api/interactions/comments/:videoId", async (req, res) => { const u = await interactionUser(req, res); if (!u || !supabaseAdmin) return; const { content, parentId } = req.body || {}; const { data, error } = await supabaseAdmin.from("comments").insert({ video_id: req.params.videoId, user_id: u.id, content, parent_id: parentId || null }).select("*, user:profiles(*)").single(); if (error) return res.status(400).json({ error: error.message }); const { data: v } = await supabaseAdmin.from("videos").select("comments_count").eq("id", req.params.videoId).single(); await supabaseAdmin.from("videos").update({ comments_count: Number(v?.comments_count || 0) + 1 }).eq("id", req.params.videoId); res.status(201).json({ comment: data }); });
app.post("/api/interactions/reports", async (req, res) => { const u = await interactionUser(req, res); if (!u || !supabaseAdmin) return; const { videoId, reason, description } = req.body || {}; const { data, error } = await supabaseAdmin.from("reports").insert({ reporter_id: u.id, video_id: videoId, reason, description, status: "pending" }).select("*, video:videos(*), reporter:profiles!reporter_id(*)").single(); if (error) return res.status(400).json({ error: error.message }); res.status(201).json({ report: data }); });

app.post("/api/bunny/create-video", async (req, res) => { const user = await requireUser(req, res); if (!user) return; try { const bunny = bunnyConfig(); if (!bunny.apiKey || !bunny.libraryId) return res.status(500).json({ error: "Missing Bunny configuration" }); const title = String(req.body?.title || "Untitled Video").trim().slice(0, 300) || "Untitled Video"; const collectionId = req.body?.collectionId ? String(req.body.collectionId) : undefined; const response = await fetch(`https://video.bunnycdn.com/library/${bunny.libraryId}/videos`, { method: "POST", headers: { AccessKey: bunny.apiKey, "Content-Type": "application/json" }, body: JSON.stringify({ title, ...(collectionId ? { collectionId } : {}) }) }); const text = await response.text(); let data: any = {}; try { data = JSON.parse(text); } catch {} if (!response.ok || !data.guid) return res.status(response.status || 502).json({ error: "Bunny create video failed", details: text.slice(0, 5000) }); if (supabaseAdmin) await supabaseAdmin.from("videos").insert({ bunny_video_id: data.guid, title, slug: `${data.guid}-${Date.now()}`, creator_id: user.id, visibility: "public", moderation_status: "published", processing_status: "processing" }); res.json({ success: true, videoId: data.guid, libraryId: bunny.libraryId, uploadUrl: `https://video.bunnycdn.com/library/${bunny.libraryId}/videos/${data.guid}`, proxyUploadUrl: `/api/bunny/upload/${data.guid}`, cdnHostname: bunny.hostname }); } catch (e: any) { res.status(500).json({ error: e?.message || "Bunny create video failed" }); } });
app.put("/api/bunny/upload/:videoId", async (req, res) => { const user = await requireUser(req, res); if (!user) return; try { const bunny = bunnyConfig(); const id = String(req.params.videoId); const response = await fetch(`https://video.bunnycdn.com/library/${bunny.libraryId}/videos/${encodeURIComponent(id)}`, { method: "PUT", headers: { AccessKey: bunny.apiKey, "Content-Type": req.headers["content-type"] || "application/octet-stream" }, body: req as any, duplex: "half" as any }); if (!response.ok) return res.status(response.status).json({ error: "Bunny upload failed", details: (await response.text()).slice(0, 5000) }); res.json({ success: true, videoId: id }); } catch (e: any) { res.status(500).json({ error: e?.message || "Bunny upload failed" }); } });
app.get("/api/bunny/status/:videoId", async (req, res) => { const user = await requireUser(req, res); if (!user) return; try { const bunny = bunnyConfig(); const response = await fetch(`https://video.bunnycdn.com/library/${bunny.libraryId}/videos/${encodeURIComponent(req.params.videoId)}`, { headers: { AccessKey: bunny.apiKey, Accept: "application/json" } }); if (!response.ok) return res.status(response.status).json({ error: "Unable to get Bunny status" }); const data: any = await response.json(); const statusMap: Record<number, string> = { 0:"created",1:"uploaded",2:"processing",3:"transcoding",4:"finished",5:"error",6:"failed" }; res.json({ videoId:req.params.videoId,status:data.status,statusText:statusMap[data.status]||"unknown",progress:data.encodeProgress||0,duration:data.length||0 }); } catch(e:any) { res.status(500).json({error:e?.message||"Bunny status failed"}); } });

async function handleLuluUpload(req: any, res: any) { const adminId = await requireAdmin(req,res); if(!adminId)return; let tempPath=""; try { const key=String(process.env.LULU_API_KEY||"").trim(); if(!key)return res.status(500).json({error:"LuluStream is not configured"}); if(!req.file)return res.status(400).json({error:"No video file received"}); tempPath=req.file.path; const title=String(req.body?.file_title||req.body?.title||req.file.originalname||"Untitled Video").slice(0,300); const lookup=await fetch(`https://lulustream.com/api/upload/server?key=${encodeURIComponent(key)}`,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(30000)}); const lookupText=await lookup.text(); let lookupData:any; try{lookupData=JSON.parse(lookupText)}catch{return res.status(502).json({error:"Lulu upload-server returned invalid JSON"})} if(!lookup.ok||Number(lookupData.status)!==200||!lookupData.result)return res.status(502).json({error:"Lulu upload-server lookup failed",message:lookupData.msg}); const form=new FormData(); form.append("key",key);form.append("file_title",title);form.append("file_public","1");form.append("file_adult","1");form.append("html_redirect","0");form.append("file",fs.createReadStream(tempPath),{filename:req.file.originalname||"upload.mp4",contentType:req.file.mimetype||"application/octet-stream",knownLength:req.file.size}); const headers:any=form.getHeaders();headers.Accept="application/json";headers["Content-Length"]=String(await new Promise<number>((resolve,reject)=>form.getLength((err,len)=>err?reject(err):resolve(len)))); const uploadData:any=await new Promise((resolve,reject)=>{const target=new URL(String(lookupData.result));const client=target.protocol==="https:"?require("https"):require("http");const request=client.request(target,{method:"POST",headers,timeout:30*60*1000},(response:any)=>{let body="";response.setEncoding("utf8");response.on("data",(c:string)=>body+=c);response.on("end",()=>{try{const parsed=JSON.parse(body);if(response.statusCode<200||response.statusCode>=300)reject(new Error(`Lulu HTTP ${response.statusCode}: ${body.slice(0,1000)}`));else resolve(parsed)}catch{reject(new Error("Lulu returned invalid JSON"))}})});request.on("timeout",()=>request.destroy(new Error("Lulu upload timed out")));request.on("error",reject);form.pipe(request)});const entry=Array.isArray(uploadData?.files)?uploadData.files.find((x:any)=>x&&(x.filecode||x.fileCode||x.file_code)):null;const fileCode=entry?.filecode||entry?.fileCode||entry?.file_code;if(!fileCode)return res.status(502).json({error:"Lulu returned an unexpected upload response"});res.json({success:true,fileCode:String(fileCode),embedUrl:`https://lulustream.com/e/${fileCode}`});}catch(e:any){res.status(502).json({error:e?.message||"Lulu upload failed"})}finally{if(tempPath){try{fs.unlinkSync(tempPath)}catch{}}} }
app.post("/api/lulu/upload",upload.single("file"),handleLuluUpload);

async function handleUqloadUpload(req: any, res: any) {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  let tempPath = "";
  try {
    const key = String(process.env.UQLOAD_API_KEY || "").trim();
    if (!key) return res.status(500).json({ error: "UQLOAD is not configured" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    tempPath = req.file.path;

    const serverRes = await fetch(`https://uqload.vc/api/upload/server?key=${encodeURIComponent(key)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30000)
    });
    const serverText = await serverRes.text();
    let serverData: any;
    try { serverData = JSON.parse(serverText); } catch { serverData = null; }
    if (!serverRes.ok || Number(serverData?.status) !== 200 || !serverData?.result) {
      return res.status(502).json({ error: "Failed to get UQLOAD upload server", details: serverData?.msg || serverText.slice(0, 2000) });
    }

    const target = new URL(String(serverData.result));
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      return res.status(502).json({ error: "UQLOAD returned an invalid upload URL" });
    }

    const form = new FormData();
    form.append("key", key);
    form.append("file_title", String(req.body?.file_title || req.file.originalname || "Video").slice(0, 300));
    form.append("html_redirect", "0");
    form.append("file", fs.createReadStream(tempPath), {
      filename: req.file.originalname || "upload.mp4",
      contentType: req.file.mimetype || "application/octet-stream",
      knownLength: req.file.size
    });

    const headers: Record<string, string> = {
      ...form.getHeaders(),
      Accept: "application/json"
    };
    const contentLength = await new Promise<number>((resolve, reject) => {
      form.getLength((err, length) => err ? reject(err) : resolve(length));
    });
    headers["Content-Length"] = String(contentLength);

    const uploadResult: any = await new Promise((resolve, reject) => {
      const client = target.protocol === "https:" ? require("https") : require("http");
      const request = client.request(target, {
        method: "POST",
        headers,
        timeout: 30 * 60 * 1000
      }, (response: any) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => { body += chunk; });
        response.on("end", () => {
          let parsed: any = null;
          try { parsed = JSON.parse(body); } catch { parsed = null; }
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`UQLOAD HTTP ${response.statusCode}: ${(parsed?.msg || parsed?.error || body).slice(0, 2000)}`));
            return;
          }
          if (!parsed) {
            reject(new Error(`UQLOAD returned invalid JSON: ${body.slice(0, 2000)}`));
            return;
          }
          resolve(parsed);
        });
      });
      request.on("timeout", () => request.destroy(new Error("UQLOAD upload timed out")));
      request.on("error", reject);
      form.on("error", reject);
      form.pipe(request);
    });

    res.json(uploadResult);
  } catch (e: any) {
    console.error("[UQLOAD] proxy upload failed:", e);
    res.status(502).json({ error: "UQLOAD upload failed", details: e?.message || String(e) });
  } finally {
    if (tempPath) { try { fs.unlinkSync(tempPath); } catch {} }
  }
}

app.post("/api/uqload/proxy-upload", upload.single("file"), handleUqloadUpload);
app.get("/api/uqload/upload-server", async (req, res) => { const adminId = await requireAdmin(req, res); if (!adminId) return; try { const key = String(process.env.UQLOAD_API_KEY || "").trim(); if (!key) return res.status(500).json({ error: "UQLOAD is not configured" }); const response = await fetch(`https://uqload.vc/api/upload/server?key=${encodeURIComponent(key)}`); const data: any = await response.json(); if (!response.ok || data.status !== 200 || !data.result) return res.status(502).json({ error: data.msg || "Failed to get UQLOAD upload server" }); res.json({ uploadUrl: data.result }); } catch (e: any) { res.status(502).json({ error: e?.message || "UQLOAD upload-server lookup failed" }); } });

app.post("/api/webhooks/bunny", async (req, res) => { try { const secret = String(process.env.BUNNY_WEBHOOK_SECRET || "").trim(); if (secret && String(req.headers["x-bunny-webhook-secret"] || req.headers["x-webhook-secret"] || "") !== secret) return res.status(401).json({ error: "Invalid webhook secret" }); const p = req.body || {}; const id = p.VideoGuid || p.videoId || p.id; if (!id) return res.status(400).json({ error: "Missing Bunny video id" }); if (supabaseAdmin) { const status = Number(p.Status); const bunny = bunnyConfig(); await supabaseAdmin.from("videos").update({ processing_status: status === 4 ? "ready" : status === 5 || status === 6 ? "failed" : "processing", ...(status === 4 && bunny.hostname ? { video_url: `https://${bunny.hostname}/${id}/playlist.m3u8` } : {}) }).eq("bunny_video_id", id); } res.json({ ok: true }); } catch (e: any) { res.status(500).json({ error: e?.message || "Webhook failed" }); } });

const recentViews = new Map<string, number>();
app.post("/api/videos/:id/view", async (req, res) => { if (!supabaseAdmin) return res.status(500).json({ error: "Supabase server configuration missing" }); const id = String(req.params.id); const key = `${req.ip}:${id}`; const now = Date.now(); if (recentViews.has(key) && now - (recentViews.get(key) || 0) < 5 * 60 * 1000) return res.json({ incremented: false }); recentViews.set(key, now); try { const { error } = await supabaseAdmin.rpc("increment_video_view", { video_id: id }); if (error) return res.status(400).json({ error: error.message }); res.json({ incremented: true }); } catch (e: any) { res.status(500).json({ error: e?.message || "View recording failed" }); } });

app.get("/api/admin/stats", async (req, res) => { const admin = await requireAdmin(req, res); if (!admin || !supabaseAdmin) return; try { const [{ count: users }, { count: videos }, { count: pending }, { count: published }, { count: reports }] = await Promise.all([supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }), supabaseAdmin.from("videos").select("id", { count: "exact", head: true }), supabaseAdmin.from("videos").select("id", { count: "exact", head: true }).eq("moderation_status", "pending_review"), supabaseAdmin.from("videos").select("id", { count: "exact", head: true }).eq("moderation_status", "published"), supabaseAdmin.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending")]); const { data: views } = await supabaseAdmin.from("videos").select("views"); res.json({ totalUsers: users || 0, activeUsers: Math.ceil((users || 0) * .6), totalVideos: videos || 0, pendingVideos: pending || 0, publishedVideos: published || 0, reportedVideos: reports || 0, totalViews: (views || []).reduce((n: any, v: any) => n + Number(v.views || 0), 0), uploadActivity: [] }); } catch (e: any) { res.status(500).json({ error: e?.message || "Failed to load admin stats" }); } });
app.get("/api/admin/reports", async (req, res) => { const admin = await requireAdmin(req, res); if (!admin || !supabaseAdmin) return; let q: any = supabaseAdmin.from("reports").select("*, video:videos(*), reporter:profiles!reporter_id(*)").order("created_at", { ascending: false }); if (req.query.status) q = q.eq("status", String(req.query.status)); const { data, error } = await q; if (error) return res.status(400).json({ error: error.message }); res.json({ reports: data || [] }); });
app.patch("/api/admin/reports/:id", async (req, res) => { const admin = await requireAdmin(req, res); if (!admin || !supabaseAdmin) return; const { status, actionTaken } = req.body || {}; const { data, error } = await supabaseAdmin.from("reports").update({ status, reviewer_id: admin, action_taken: actionTaken || null, reviewed_at: new Date().toISOString() }).eq("id", req.params.id).select("*, video:videos(*), reporter:profiles!reporter_id(*)").single(); if (error) return res.status(400).json({ error: error.message }); res.json({ report: data }); });
app.patch("/api/admin/videos/:id", async (req, res) => { const admin = await requireAdmin(req, res); if (!admin || !supabaseAdmin) return; const updates = { ...(req.body || {}), updated_at: new Date().toISOString() }; delete (updates as any).id; const { data, error } = await supabaseAdmin.from("videos").update(updates).eq("id", req.params.id).select(VIDEO_SELECT).single(); if (error) return res.status(400).json({ error: error.message }); res.json({ video: data }); });
app.get("/api/admin/audit-logs", async (req, res) => { const admin = await requireAdmin(req, res); if (!admin || !supabaseAdmin) return; const { data, error } = await supabaseAdmin.from("admin_actions").select("*, admin:profiles!admin_id(*)").order("created_at", { ascending: false }).limit(100); if (error) return res.status(400).json({ error: error.message }); res.json({ logs: data || [] }); });
app.post("/api/admin/audit-log", async (req, res) => { const admin = await requireAdmin(req, res); if (!admin || !supabaseAdmin) return; const body = req.body || {}; const { data, error } = await supabaseAdmin.from("admin_actions").insert({ admin_id: admin, action: body.action, target_type: body.targetType, target_id: body.targetId, target_name: body.targetName || null, details: body.details || null }).select("*, admin:profiles!admin_id(*)").single(); if (error) return res.status(400).json({ error: error.message }); res.status(201).json({ log: data }); });
app.post("/api/admin/sync-bunny", async (req, res) => { const admin = await requireAdmin(req, res); if (!admin || !supabaseAdmin) return; const bunny = bunnyConfig(); if (!bunny.apiKey || !bunny.libraryId) return res.status(500).json({ error: "Missing Bunny configuration" }); try { const r = await fetch(`https://video.bunnycdn.com/library/${bunny.libraryId}/videos?page=1&itemsPerPage=1000`, { headers: { AccessKey: bunny.apiKey } }); const data: any = await r.json(); let synced = 0; for (const v of data.items || []) { const { error } = await supabaseAdmin.from("videos").upsert({ bunny_video_id: v.guid, title: v.title, slug: `${v.guid}-bunny`, creator_id: admin, processing_status: v.status === 4 ? "ready" : "processing", visibility: "public", moderation_status: "published" }, { onConflict: "bunny_video_id" }); if (!error) synced++; } res.json({ syncedCount: synced, totalBunnyVideos: (data.items || []).length }); } catch (e: any) { res.status(502).json({ error: e?.message || "Bunny sync failed" }); } });

const distPath = path.resolve(process.cwd(), "dist");
app.use(express.static(distPath));
app.get("*", async (_req, res, next) => { try { const indexPath = path.join(distPath, "index.html"); if (fs.existsSync(indexPath)) return res.sendFile(indexPath); next(); } catch { next(); } });

app.listen(PORT, () => console.log(`Server listening on ${PORT}`));

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

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const hasValidSupabase = Boolean(supabaseUrl && supabaseServiceKey);
const supabaseAdmin = hasValidSupabase
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

function bunnyConfig() {
  return {
    apiKey: String(process.env.BUNNY_API_KEY || "").trim().replace(/^["']|["']$/g, ""),
    libraryId: String(process.env.BUNNY_LIBRARY_ID || "").trim().replace(/^["']|["']$/g, ""),
    hostname: String(process.env.BUNNY_CDN_HOSTNAME || "").trim().replace(/^["']|["']$/g, ""),
  };
}

function bearerToken(req: any): string | null {
  const auth = String(req.headers.authorization || "");
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

async function requireUser(req: any, res: any): Promise<any | null> {
  const token = bearerToken(req);
  if (!token || !supabaseAdmin) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "Invalid authentication token" });
    return null;
  }
  return data.user;
}

async function requireAdmin(req: any, res: any): Promise<string | null> {
  const user = await requireUser(req, res);
  if (!user) return null;
  const { data: profile, error } = await supabaseAdmin!.from("profiles").select("role").eq("id", user.id).single();
  if (error || !profile || profile.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }
  return user.id;
}

app.get("/api/health", (_req, res) => {
  const bunny = bunnyConfig();
  res.json({
    status: "ok",
    supabase: hasValidSupabase,
    bunny: Boolean(bunny.apiKey && bunny.libraryId && bunny.hostname),
    lulu: Boolean(String(process.env.LULU_API_KEY || "").trim()),
    time: new Date().toISOString(),
  });
});

// Bunny management requires a signed-in user. Secrets never leave the server.
app.post("/api/bunny/create-video", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    const bunny = bunnyConfig();
    if (!bunny.apiKey || !bunny.libraryId) return res.status(500).json({ error: "Missing Bunny configuration" });
    const title = String(req.body?.title || "Untitled Video").trim().slice(0, 300) || "Untitled Video";
    const collectionId = req.body?.collectionId ? String(req.body.collectionId) : undefined;
    const response = await fetch(`https://video.bunnycdn.com/library/${bunny.libraryId}/videos`, {
      method: "POST",
      headers: { AccessKey: bunny.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ title, ...(collectionId ? { collectionId } : {}) }),
    });
    const text = await response.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch {}
    if (!response.ok || !data.guid) return res.status(response.status || 502).json({ error: "Bunny create video failed", details: text.slice(0, 5000) });

    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.from("videos").insert({
        bunny_video_id: data.guid,
        title,
        slug: `${data.guid}-${Date.now()}`,
        creator_id: user.id,
        visibility: "public",
        moderation_status: "published",
        processing_status: "processing",
      });
      if (error) console.error("Initial video record insert failed:", error.message);
    }

    res.json({
      success: true,
      videoId: data.guid,
      libraryId: bunny.libraryId,
      uploadUrl: `https://video.bunnycdn.com/library/${bunny.libraryId}/videos/${data.guid}`,
      proxyUploadUrl: `/api/bunny/upload/${data.guid}`,
      cdnHostname: bunny.hostname,
    });
  } catch (error: any) {
    console.error("create-video error", error);
    res.status(500).json({ error: error?.message || "Bunny create video failed" });
  }
});

app.put("/api/bunny/upload/:videoId", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    const bunny = bunnyConfig();
    const videoId = String(req.params.videoId || "");
    if (!bunny.apiKey || !bunny.libraryId) return res.status(500).json({ error: "Bunny configuration missing" });
    if (!videoId || !/^[a-zA-Z0-9_-]+$/.test(videoId)) return res.status(400).json({ error: "Invalid Bunny video id" });

    const response = await fetch(`https://video.bunnycdn.com/library/${bunny.libraryId}/videos/${videoId}`, {
      method: "PUT",
      headers: { AccessKey: bunny.apiKey, "Content-Type": req.headers["content-type"] || "application/octet-stream" },
      // @ts-ignore Node fetch streaming body
      body: req,
      // @ts-ignore Node fetch streaming body
      duplex: "half",
    });
    if (!response.ok) return res.status(response.status).json({ error: "Bunny upload failed", details: (await response.text()).slice(0, 5000) });
    res.json({ success: true, videoId });
  } catch (error: any) {
    console.error("Bunny upload error", error);
    res.status(500).json({ error: error?.message || "Bunny upload failed" });
  }
});

app.get("/api/bunny/status/:videoId", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    const bunny = bunnyConfig();
    if (!bunny.apiKey || !bunny.libraryId) return res.status(500).json({ error: "Bunny configuration missing" });
    const videoId = String(req.params.videoId || "");
    const response = await fetch(`https://video.bunnycdn.com/library/${bunny.libraryId}/videos/${encodeURIComponent(videoId)}`, {
      headers: { AccessKey: bunny.apiKey, Accept: "application/json" },
    });
    if (!response.ok) return res.status(response.status).json({ error: "Unable to get Bunny status" });
    const data: any = await response.json();
    const statusMap: Record<number, string> = { 0: "created", 1: "uploaded", 2: "processing", 3: "transcoding", 4: "finished", 5: "error", 6: "failed" };
    res.json({ videoId, status: data.status, statusText: statusMap[data.status] || "unknown", progress: data.encodeProgress || 0, duration: data.length || 0 });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Bunny status failed" });
  }
});

// Lulu and UQLOAD uploads are admin-only because their provider credentials are account-level secrets.
async function handleLuluUpload(req: any, res: any) {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  let tempPath = "";
  try {
    const key = String(process.env.LULU_API_KEY || "").trim();
    if (!key) return res.status(500).json({ error: "LuluStream is not configured" });
    if (!req.file) return res.status(400).json({ error: "No video file received" });
    tempPath = req.file.path;
    const title = String(req.body?.file_title || req.body?.title || req.file.originalname || "Untitled Video").slice(0, 300);
    const lookup = await fetch(`https://lulustream.com/api/upload/server?key=${encodeURIComponent(key)}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(30000) });
    const lookupText = await lookup.text();
    let lookupData: any;
    try { lookupData = JSON.parse(lookupText); } catch { return res.status(502).json({ error: "Lulu upload-server returned invalid JSON" }); }
    if (!lookup.ok || Number(lookupData.status) !== 200 || !lookupData.result) return res.status(502).json({ error: "Lulu upload-server lookup failed", message: lookupData.msg });
    const form = new FormData();
    form.append("key", key);
    form.append("file_title", title);
    form.append("file_public", "1");
    form.append("file_adult", "1");
    form.append("html_redirect", "0");
    form.append("file", fs.createReadStream(tempPath), { filename: req.file.originalname || "upload.mp4", contentType: req.file.mimetype || "application/octet-stream", knownLength: req.file.size });
    const headers: any = form.getHeaders();
    headers.Accept = "application/json";
    headers["Content-Length"] = String(await new Promise<number>((resolve, reject) => form.getLength((err, len) => err ? reject(err) : resolve(len))));
    const uploadData: any = await new Promise((resolve, reject) => {
      const target = new URL(String(lookupData.result));
      const client = target.protocol === "https:" ? require("https") : require("http");
      const request = client.request(target, { method: "POST", headers, timeout: 30 * 60 * 1000 }, (response: any) => {
        let body = ""; response.setEncoding("utf8"); response.on("data", (c: string) => body += c); response.on("end", () => { try { const parsed = JSON.parse(body); if (response.statusCode < 200 || response.statusCode >= 300) reject(new Error(`Lulu HTTP ${response.statusCode}`)); else resolve(parsed); } catch { reject(new Error("Lulu returned invalid JSON")); } });
      });
      request.on("timeout", () => request.destroy(new Error("Lulu upload timed out")));
      request.on("error", reject); form.pipe(request);
    });
    const entry = Array.isArray(uploadData?.files) ? uploadData.files.find((x: any) => x && (x.filecode || x.fileCode || x.file_code)) : null;
    const fileCode = entry?.filecode || entry?.fileCode || entry?.file_code;
    if (!fileCode) return res.status(502).json({ error: "Lulu returned an unexpected upload response" });
    res.json({ success: true, fileCode: String(fileCode), embedUrl: `https://lulustream.com/e/${fileCode}` });
  } catch (error: any) {
    console.error("Lulu upload error", error); res.status(502).json({ error: error?.message || "Lulu upload failed" });
  } finally { if (tempPath) { try { fs.unlinkSync(tempPath); } catch {} } }
}
app.post("/api/lulu/upload", upload.single("file"), handleLuluUpload);

app.post("/api/uqload/proxy-upload", upload.single("file"), async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  let tempPath = "";
  try {
    const key = String(process.env.UQLOAD_API_KEY || "").trim();
    if (!key) return res.status(500).json({ error: "UQLOAD is not configured" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    tempPath = req.file.path;
    const serverRes = await fetch(`https://uqload.vc/api/upload/server?key=${encodeURIComponent(key)}`);
    const serverData: any = await serverRes.json();
    if (!serverRes.ok || serverData.status !== 200 || !serverData.result) return res.status(502).json({ error: "Failed to get UQLOAD upload server" });
    const form = new FormData();
    form.append("key", key);
    form.append("file_title", String(req.body?.file_title || "Video").slice(0, 300));
    form.append("html_redirect", "0");
    form.append("file", fs.createReadStream(tempPath), { filename: req.file.originalname, contentType: req.file.mimetype });
    const uploadRes = await fetch(String(serverData.result), { method: "POST", body: form as any });
    const text = await uploadRes.text();
    let result: any; try { result = JSON.parse(text); } catch { result = { status: uploadRes.status, msg: text }; }
    if (!uploadRes.ok) return res.status(502).json({ error: "UQLOAD upload failed", details: result?.msg || text.slice(0, 2000) });
    res.json(result);
  } catch (error: any) { console.error("UQLOAD proxy error", error); res.status(502).json({ error: error?.message || "UQLOAD upload failed" }); }
  finally { if (tempPath) { try { fs.unlinkSync(tempPath); } catch {} } }
});

// Never return UQLOAD_API_KEY to the browser.
app.get("/api/uqload/upload-server", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  try {
    const key = String(process.env.UQLOAD_API_KEY || "").trim();
    if (!key) return res.status(500).json({ error: "UQLOAD is not configured" });
    const response = await fetch(`https://uqload.vc/api/upload/server?key=${encodeURIComponent(key)}`);
    const data: any = await response.json();
    if (!response.ok || data.status !== 200 || !data.result) return res.status(502).json({ error: data.msg || "Failed to get UQLOAD upload server" });
    res.json({ uploadUrl: data.result });
  } catch (error: any) { res.status(502).json({ error: error?.message || "UQLOAD upload-server lookup failed" }); }
});

app.post("/api/webhooks/bunny", async (req, res) => {
  try {
    const configuredSecret = String(process.env.BUNNY_WEBHOOK_SECRET || "").trim();
    if (configuredSecret) {
      const supplied = String(req.headers["x-bunny-webhook-secret"] || req.headers["x-webhook-secret"] || "");
      if (!supplied || supplied !== configuredSecret) return res.status(401).json({ error: "Invalid webhook secret" });
    }
    const payload = req.body || {};
    const videoGuid = payload.VideoGuid || payload.videoId || payload.id;
    const status = Number(payload.Status);
    if (!videoGuid) return res.status(400).json({ error: "Missing Bunny video id" });
    const bunny = bunnyConfig();
    if (supabaseAdmin && bunny.hostname) {
      if (status === 4) await supabaseAdmin.from("videos").update({ processing_status: "ready", moderation_status: "published", video_url: `https://${bunny.hostname}/${videoGuid}/playlist.m3u8`, playback_url: `https://${bunny.hostname}/${videoGuid}/playlist.m3u8`, thumbnail_url: `https://${bunny.hostname}/${videoGuid}/thumbnail.jpg`, duration: payload.Length || 0, updated_at: new Date().toISOString() }).eq("bunny_video_id", videoGuid);
      if (status === 5 || status === 6) await supabaseAdmin.from("videos").update({ moderation_status: "rejected", rejection_reason: "Bunny transcoding failed", updated_at: new Date().toISOString() }).eq("bunny_video_id", videoGuid);
    }
    res.json({ success: true, videoGuid, status });
  } catch (error: any) { res.status(500).json({ error: error?.message || "Webhook failed" }); }
});

app.post("/api/admin/uqload/transfer/:videoId", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  try {
    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase admin client is not configured" });
    const bunny = bunnyConfig(); const uqKey = String(process.env.UQLOAD_API_KEY || "").trim();
    if (!bunny.apiKey || !bunny.libraryId || !bunny.hostname || !uqKey) return res.status(500).json({ error: "Bunny/UQLOAD configuration is incomplete" });
    const videoId = String(req.params.videoId);
    const { data: video, error } = await supabaseAdmin.from("videos").select("id,title,bunny_video_id,uqload_filecode").eq("id", videoId).single();
    if (error || !video) return res.status(404).json({ error: "Video not found" });
    if (!video.bunny_video_id) return res.status(400).json({ error: "This video is not linked to Bunny" });
    if (video.uqload_filecode) return res.json({ success: true, alreadyTransferred: true, fileCode: video.uqload_filecode, embedUrl: `https://uqload.vc/e/${video.uqload_filecode}` });
    const mp4Url = `https://${bunny.hostname}/${video.bunny_video_id}/play_720p.mp4`;
    const response = await fetch(`https://uqload.vc/api/upload/url?key=${encodeURIComponent(uqKey)}&url=${encodeURIComponent(mp4Url)}&file_public=1&file_adult=1`);
    const raw = await response.text(); let data: any; try { data = JSON.parse(raw); } catch { data = { status: response.status, msg: raw }; }
    if (!response.ok || data.status !== 200 || !data.result?.filecode) return res.status(502).json({ error: "UQLOAD remote upload request failed", details: data.msg || raw.slice(0, 2000) });
    const fileCode = String(data.result.filecode); const embedUrl = `https://uqload.vc/e/${fileCode}`;
    await supabaseAdmin.from("videos").update({ uqload_filecode: fileCode, uqload_embed_url: embedUrl, uqload_status: "queued", uqload_error: null, uqload_transferred_at: new Date().toISOString() }).eq("id", video.id);
    await supabaseAdmin.from("admin_actions").insert({ admin_id: adminId, action: "bunny_to_uqload_transfer", target_type: "video", target_id: video.id, details: { title: video.title, bunny_video_id: video.bunny_video_id, uqload_filecode: fileCode } });
    res.json({ success: true, fileCode, embedUrl, sourceUrl: mp4Url, status: "queued" });
  } catch (error: any) { res.status(500).json({ error: error?.message || "Transfer failed" }); }
});

app.post("/api/admin/sync-bunny", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  try {
    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase admin not configured" });
    const bunny = bunnyConfig(); if (!bunny.apiKey || !bunny.libraryId || !bunny.hostname) return res.status(500).json({ error: "Bunny configuration missing" });
    const response = await fetch(`https://video.bunnycdn.com/library/${bunny.libraryId}/videos`, { headers: { AccessKey: bunny.apiKey, Accept: "application/json" } });
    if (!response.ok) return res.status(response.status).json({ error: "Failed to fetch from Bunny" });
    const payload: any = await response.json(); const videos = Array.isArray(payload) ? payload : (payload.items || []);
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id").limit(1); const creatorId = profiles?.[0]?.id;
    if (!creatorId) return res.status(500).json({ error: "No user profiles found" });
    let syncedCount = 0;
    for (const v of videos) {
      if (!v?.guid) continue;
      const { data: existing } = await supabaseAdmin.from("videos").select("id").eq("bunny_video_id", v.guid).maybeSingle();
      if (!existing) { await supabaseAdmin.from("videos").insert({ bunny_video_id: v.guid, title: v.title || "Untitled", slug: `${v.guid}-${Date.now()}`, visibility: "public", moderation_status: "published", processing_status: "ready", video_url: `https://${bunny.hostname}/${v.guid}/playlist.m3u8`, playback_url: `https://${bunny.hostname}/${v.guid}/playlist.m3u8`, thumbnail_url: `https://${bunny.hostname}/${v.guid}/thumbnail.jpg`, duration: v.length || 0, creator_id: creatorId }); syncedCount++; }
    }
    res.json({ success: true, syncedCount, totalBunnyVideos: videos.length });
  } catch (error: any) { res.status(500).json({ error: error?.message || "Sync failed" }); }
});

const viewCache = new Map<string, number>();
app.post("/api/videos/:id/view", async (req, res) => {
  try {
    const videoId = String(req.params.id); const forwarded = req.headers["x-forwarded-for"]; const ip = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || req.socket.remoteAddress || "unknown");
    const key = `${videoId}-${ip}`; const now = Date.now(); const old = viewCache.get(key);
    if (old && now - old < 300000) return res.json({ success: false, message: "Already counted" });
    viewCache.set(key, now);
    if (supabaseAdmin) { const { error } = await supabaseAdmin.rpc("increment_video_view", { p_video_id: videoId }); if (error) console.warn("view counter RPC:", error.message); }
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error?.message || "View counter failed" }); }
});

app.post("/api/admin/audit-log", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  try {
    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase admin not configured" });
    const { action, targetType, targetId, details } = req.body || {};
    if (!action || !targetType || !targetId) return res.status(400).json({ error: "action, targetType and targetId are required" });
    const { error } = await supabaseAdmin.from("admin_actions").insert({ admin_id: adminId, action, target_type: targetType, target_id: targetId, details: details || {} });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (error: any) { res.status(500).json({ error: error?.message || "Audit log failed" }); }
});

app.get("/api/admin/audit-logs", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  try {
    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase admin not configured" });
    const { data, error } = await supabaseAdmin.from("admin_actions").select("*, admin:profiles!admin_id(*)").order("created_at", { ascending: false }).limit(100);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ logs: data || [] });
  } catch (error: any) { res.status(500).json({ error: error?.message || "Audit logs failed" }); }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(process.cwd(), "dist");
    app.use(express.static(dist));
    app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
  }
  app.listen(PORT, "0.0.0.0", () => console.log(`CornMM server running on ${PORT}`));
}
startServer();
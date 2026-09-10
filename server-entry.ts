import express from "express";
import multer from "multer";
import FormData from "form-data";
import fs from "fs";
import https from "https";
import dotenv from "dotenv";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
const upload = multer({ dest: "/tmp/uploads/" });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAdmin = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
const SUPERADMIN_EMAIL = "tzerobaby@gmail.com";

function bearerToken(req: any): string | null { const auth = String(req.headers.authorization || ""); const match = auth.match(/^Bearer\s+(.+)$/i); return match ? match[1].trim() : null; }
async function requireAdmin(req: any, res: any): Promise<boolean> { if (!supabaseAdmin) { res.status(500).json({ error: "Supabase server configuration missing" }); return false; } const token = bearerToken(req); if (!token) { res.status(401).json({ error: "Authentication required" }); return false; } const { data, error } = await supabaseAdmin.auth.getUser(token); const user = data?.user; if (error || !user) { res.status(401).json({ error: "Invalid authentication token" }); return false; } if (String(user.email || "").toLowerCase() === SUPERADMIN_EMAIL) return true; const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single(); if (profile?.role !== "admin") { res.status(403).json({ error: "Admin access required" }); return false; } return true; }
async function getAuthenticatedUser(req: any): Promise<any | null> { if (!supabaseAdmin) return null; const token = bearerToken(req); if (!token) return null; const { data } = await supabaseAdmin.auth.getUser(token); return data?.user || null; }
function findValue(value: any, keys: string[]): any { if (!value || typeof value !== "object") return null; for (const key of keys) if (value[key] !== undefined && value[key] !== null && String(value[key]).trim()) return value[key]; for (const child of Array.isArray(value) ? value : Object.values(value)) { const found = findValue(child, keys); if (found !== null) return found; } return null; }
function makeSlug(title: string, providerId: string): string { const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "filemoon-video"; return `${base}-${providerId.toLowerCase()}`; }
const FILEMOON_ACCOUNTS = Array.from({ length: 10 }, (_, index) => String(index + 1));
function normalizeFileMoonAccount(account: string): string { const value = String(account || "1").trim(); return FILEMOON_ACCOUNTS.includes(value) ? value : "1"; }
function getFileMoonToken(account: string): string { const normalized = normalizeFileMoonAccount(account); return String(process.env[`FILEMOON_API_TOKEN_${normalized}`] || (normalized === "1" ? process.env.FILEMOON_API_TOKEN : "") || "").trim(); }

const originalListen = express.application.listen;
(express.application as any).listen = function(this: any, ...args: any[]) {
  this.post("/api/streamtape/proxy-upload", upload.single("file"), async (req: any, res: any) => {
    let tempPath = "";
    try {
      if (!(await requireAdmin(req, res))) return;
      const login = String(process.env.STREAMTAPE_API_LOGIN || "").trim(); const key = String(process.env.STREAMTAPE_API_KEY || "").trim();
      if (!login || !key) return res.status(500).json({ error: "Streamtape is not configured. Set STREAMTAPE_API_LOGIN and STREAMTAPE_API_KEY on Railway." });
      if (!req.file) return res.status(400).json({ error: "No video file uploaded" }); tempPath = req.file.path;
      const folder = String(process.env.STREAMTAPE_FOLDER || "").trim(); const initUrl = new URL("https://api.streamtape.com/file/ul"); initUrl.searchParams.set("login", login); initUrl.searchParams.set("key", key); if (folder) initUrl.searchParams.set("folder", folder);
      const initResponse = await fetch(initUrl, { signal: AbortSignal.timeout(30000) }); const initBody = await initResponse.text(); let initData: any = {}; try { initData = JSON.parse(initBody); } catch { initData = { raw: initBody }; }
      if (!initResponse.ok) return res.status(502).json({ error: "Streamtape upload initialization failed", upstreamStatus: initResponse.status, details: initData });
      const uploadUrl = String(findValue(initData, ["url", "upload_url", "uploadUrl"]) || "").trim(); if (!uploadUrl) return res.status(502).json({ error: "Streamtape did not return an upload URL", details: initData });
      const form = new FormData(); form.append("file1", fs.createReadStream(tempPath), { filename: req.file.originalname || "video.mp4", contentType: req.file.mimetype || "application/octet-stream", knownLength: Number(req.file.size || 0) || undefined });
      const length = await new Promise<number>((resolve, reject) => form.getLength((err, n) => err ? reject(err) : resolve(n)));
      const upstream = await new Promise<{statusCode:number, body:string}>((resolve, reject) => { form.submit(uploadUrl, { headers: { ...form.getHeaders(), "Content-Length": String(length) } }, (error: any, response: any) => { if (error) return reject(error); let body = ""; response.setEncoding("utf8"); response.on("data", (part: string) => { body += part; }); response.on("end", () => resolve({ statusCode: Number(response.statusCode || 0), body })); response.on("error", reject); }); });
      let data: any = {}; try { data = JSON.parse(upstream.body); } catch { data = { raw: upstream.body }; } console.log(`[Streamtape] upload HTTP ${upstream.statusCode}: ${upstream.body.slice(0, 3000)}`); if (upstream.statusCode < 200 || upstream.statusCode >= 300) return res.status(502).json({ error: "Streamtape upload failed", upstreamStatus: upstream.statusCode, details: data });
      const fileId = String(findValue(data, ["fileId", "file_id", "id", "fileid"]) || "").trim(); if (!fileId) return res.status(502).json({ error: "Streamtape did not return a file ID", details: data }); const embedUrl = `https://streamtape.com/e/${encodeURIComponent(fileId)}`; res.json({ success: true, provider: "streamtape", fileId, providerId: fileId, embedUrl, videoUrl: embedUrl, thumbnailUrl: "" });
    } catch (e: any) { console.error("[Streamtape] proxy upload failed:", e); res.status(502).json({ error: e?.message || "Streamtape upload failed", details: e?.cause?.message || String(e), cause: e?.cause?.code || null }); } finally { if (tempPath) { try { fs.unlinkSync(tempPath); } catch {} } }
  });

  this.post("/api/filemoon/proxy-upload", upload.single("file"), async (req: any, res: any) => {
    let tempPath = "";
    try {
      if (!(await requireAdmin(req, res))) return;
      const account = normalizeFileMoonAccount(req.body?.filemoon_account);
      const token = getFileMoonToken(account);
      if (!token) return res.status(500).json({ error: `FileMoon Account ${account} is not configured. Set FILEMOON_API_TOKEN_${account} on Railway.` });
      if (!req.file) return res.status(400).json({ error: "No video file uploaded" });
      tempPath = req.file.path;
      const fileName = req.file.originalname || "video.mp4";
      const mimeType = req.file.mimetype || "application/octet-stream";
      const fileSize = Number(req.file.size || 0);
      const CHUNK_SIZE = 90 * 1024 * 1024;
      const totalChunks = Math.max(1, Math.ceil(fileSize / CHUNK_SIZE));
      const uploadId = crypto.randomUUID();
      const sendRequest = async (chunkIndex: number): Promise<{ statusCode:number; body:string; retryAfter?:number; requestId?:string }> => {
        const start = chunkIndex * CHUNK_SIZE;
        const endExclusive = Math.min(fileSize, start + CHUNK_SIZE);
        const chunkLength = Math.max(0, endExclusive - start);
        const form = new FormData();
        form.append("file", fs.createReadStream(tempPath, { start, end: Math.max(start, endExclusive - 1) }), { filename: fileName, contentType: mimeType, knownLength: chunkLength });
        form.append("visibility", "1");
        if (totalChunks > 1) { form.append("dzuuid", uploadId); form.append("dzchunkindex", String(chunkIndex)); form.append("dztotalchunkcount", String(totalChunks)); form.append("dzchunksize", String(CHUNK_SIZE)); form.append("dztotalfilesize", String(fileSize)); form.append("dzchunkbyteoffset", String(start)); }
        const length = await new Promise<number>((resolve, reject) => form.getLength((err, n) => err ? reject(err) : resolve(n)));
        return new Promise((resolve, reject) => {
          const request = https.request({ protocol: "https:", hostname: "filemoon.org", path: "/api/v1/files/upload", method: "POST", headers: { ...form.getHeaders(), Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Length": String(length), "User-Agent": "CornMM-FileMoon/1.0" }, timeout: 30 * 60 * 1000 }, (response: any) => {
            let body = ""; response.setEncoding("utf8"); response.on("data", (part: string) => { body += part; }); response.on("end", () => { const retryHeader = response.headers?.["retry-after"]; const requestIdHeader = response.headers?.["x-request-id"]; resolve({ statusCode:Number(response.statusCode || 0), body, retryAfter:Number.isFinite(Number(retryHeader)) ? Number(retryHeader) : undefined, requestId:Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader }); }); response.on("error", reject);
          });
          request.on("timeout", () => request.destroy(new Error("FileMoon upload timed out"))); request.on("error", reject); form.pipe(request);
        });
      };
      let finalResponse: any = null;
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        let upstream = await sendRequest(chunkIndex);
        if (upstream.statusCode === 429) { const waitSeconds = Math.min(Math.max(upstream.retryAfter || 5, 1), 120); await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000)); upstream = await sendRequest(chunkIndex); }
        console.log(`[FileMoon Account ${account}] upload chunk ${chunkIndex + 1}/${totalChunks} HTTP ${upstream.statusCode} requestId=${upstream.requestId || "-"}: ${upstream.body.slice(0, 3000)}`);
        let data:any = {}; try { data = JSON.parse(upstream.body); } catch { data = { raw:upstream.body }; }
        if (upstream.statusCode < 200 || upstream.statusCode >= 300) { const upstreamMessage = String(data?.error?.message || data?.error || data?.message || "FileMoon upload failed"); return res.status(502).json({ error:`FileMoon Account ${account} upload failed: ${upstreamMessage}`, upstreamStatus:upstream.statusCode, chunk:chunkIndex, totalChunks, requestId:data?.request_id || upstream.requestId || null, details:data }); }
        finalResponse = { statusCode:upstream.statusCode, body:upstream.body };
      }
      if (!finalResponse) return res.status(502).json({ error:"FileMoon upload did not return a response" });
      let data:any = {}; try { data = JSON.parse(finalResponse.body); } catch { data = { raw:finalResponse.body }; }
      const file = data?.data || data?.file || data || {};
      const fileId = String(file?.id || file?.file_id || data?.id || data?.file_id || findValue(data,["id","file_id"]) || "").trim();
      if (!fileId) return res.status(502).json({ error:"FileMoon did not return a file ID", details:data });
      const embedUrl = String(file?.urls?.embed || data?.urls?.embed || `https://filemoon.org/${encodeURIComponent(fileId)}/embed`);
      const watchUrl = String(file?.urls?.watch || data?.urls?.watch || `https://filemoon.org/${encodeURIComponent(fileId)}/watch`);
      const thumbnailUrl = String(file?.thumbnail_url || file?.thumbnail || data?.thumbnail_url || data?.thumbnail || "");
      const user = await getAuthenticatedUser(req);
      if (!supabaseAdmin) return res.status(500).json({ error:"Supabase server configuration missing after FileMoon upload", fileId, providerId:fileId, embedUrl });
      const title = String(req.body?.title || fileName.replace(/\.[^.]+$/, "") || `FileMoon ${fileId}`).trim();
      const description = String(req.body?.description || "").trim();
      const categoryId = String(req.body?.category_id || "").trim() || null;
      const { data: existing } = await supabaseAdmin.from("videos").select("id").eq("provider","filemoon").eq("provider_id",fileId).maybeSingle();
      let videoId = existing?.id || null;
      if (videoId) {
        const { error: updateError } = await supabaseAdmin.from("videos").update({ title, description, category_id:categoryId, video_url:embedUrl || watchUrl, thumbnail_url:thumbnailUrl, visibility:"public", moderation_status:"published", is_published:true, updated_at:new Date().toISOString() }).eq("id",videoId);
        if (updateError) throw updateError;
      } else {
        const { data: createdVideo, error: insertError } = await supabaseAdmin.from("videos").insert({ title, slug:makeSlug(title,fileId), description, category_id:categoryId, creator_id:user?.id || null, visibility:"public", moderation_status:"published", video_url:embedUrl || watchUrl, thumbnail_url:thumbnailUrl, provider:"filemoon", provider_id:fileId, is_published:true }).select("id").single();
        if (insertError) throw insertError;
        videoId = createdVideo?.id || null;
      }
      return res.json({ success:true, provider:"filemoon", account, fileId, providerId:fileId, embedUrl, watchUrl, videoUrl:embedUrl || watchUrl, thumbnailUrl, videoId, savedToSupabase:true });
    } catch (e:any) { console.error("[FileMoon] proxy upload failed:", e); return res.status(502).json({ error:e?.message || "FileMoon upload failed", details:e?.cause?.message || String(e), cause:e?.cause?.code || null }); }
    finally { if (tempPath) { try { fs.unlinkSync(tempPath); } catch {} } }
  });

  this.post("/api/filemoon/sync", async (req: any, res: any) => {
    try {
      if (!(await requireAdmin(req, res))) return;
      const account = normalizeFileMoonAccount(req.body?.filemoon_account);
      const token = getFileMoonToken(account);
      if (!token) return res.status(500).json({ error: `FileMoon Account ${account} is not configured. Set FILEMOON_API_TOKEN_${account} on Railway.` });
      let page = 1; const perPage = 100; const allFiles: any[] = [];
      while (true) {
        const response = await fetch(`https://filemoon.org/api/v1/files?page=${page}&per_page=${perPage}`, { headers: { Authorization:`Bearer ${token}`, Accept:"application/json" }, signal: AbortSignal.timeout(30000) });
        const body = await response.text(); let payload:any = {}; try { payload = JSON.parse(body); } catch { payload = { raw:body }; }
        if (response.status === 429) { const wait = Math.min(Math.max(Number(response.headers.get("retry-after") || 5),1),120); await new Promise(r=>setTimeout(r,wait*1000)); continue; }
        if (!response.ok) return res.status(502).json({ error:String(payload?.error?.message || payload?.error || "FileMoon file list failed"), upstreamStatus:response.status, details:payload });
        const files = Array.isArray(payload?.data) ? payload.data : []; allFiles.push(...files); const lastPage = Number(payload?.meta?.last_page || page); if (page >= lastPage || files.length === 0) break; page++;
      }
      let imported = 0, updated = 0;
      for (const file of allFiles) {
        const providerId = String(file?.id || "").trim(); if (!providerId) continue;
        const title = String(file?.name || file?.filename || `FileMoon ${providerId}`).trim();
        const videoUrl = String(file?.urls?.embed || `https://filemoon.org/${encodeURIComponent(providerId)}/embed`); const thumbnailUrl = String(file?.thumbnail_url || file?.thumbnail || "");
        const { data: existing } = await supabaseAdmin!.from("videos").select("id").eq("provider","filemoon").eq("provider_id",providerId).maybeSingle();
        if (existing?.id) { const { error } = await supabaseAdmin!.from("videos").update({ title, video_url:videoUrl, thumbnail_url:thumbnailUrl, visibility:"public", moderation_status:"published", updated_at:new Date().toISOString() }).eq("id",existing.id); if (error) throw error; updated++; continue; }
        const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"") || "filemoon-video";
        const slug = `${baseSlug}-${providerId.toLowerCase()}`;
        const { error } = await supabaseAdmin!.from("videos").insert({ title, slug, description:"", category_id:null, creator_id:null, visibility:"public", moderation_status:"published", video_url:videoUrl, thumbnail_url:thumbnailUrl, provider:"filemoon", provider_id:providerId });
        if (error) throw error; imported++;
      }
      return res.json({ success:true, account, imported, updated, total:allFiles.length });
    } catch (e:any) { console.error("[FileMoon] sync failed:", e); return res.status(500).json({ error:e?.message || "FileMoon sync failed" }); }
  });

  return originalListen.apply(this, args as any);
};

import("./server");

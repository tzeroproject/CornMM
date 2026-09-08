import express from "express";
import multer from "multer";
import FormData from "form-data";
import fs from "fs";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
const upload = multer({ dest: "/tmp/uploads/" });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAdmin = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
const SUPERADMIN_EMAIL = "tzerobaby@gmail.com";

function bearerToken(req: any): string | null {
  const auth = String(req.headers.authorization || "");
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

async function requireAdmin(req: any, res: any): Promise<boolean> {
  if (!supabaseAdmin) { res.status(500).json({ error: "Supabase server configuration missing" }); return false; }
  const token = bearerToken(req);
  if (!token) { res.status(401).json({ error: "Authentication required" }); return false; }
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  const user = data?.user;
  if (error || !user) { res.status(401).json({ error: "Invalid authentication token" }); return false; }
  if (String(user.email || "").toLowerCase() === SUPERADMIN_EMAIL) return true;
  const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") { res.status(403).json({ error: "Admin access required" }); return false; }
  return true;
}

function findValue(value: any, keys: string[]): any {
  if (!value || typeof value !== "object") return null;
  for (const key of keys) if (value[key] !== undefined && value[key] !== null && String(value[key]).trim()) return value[key];
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    const found = findValue(child, keys);
    if (found !== null) return found;
  }
  return null;
}

function extractVideo(payload: any) {
  const vid = findValue(payload, ["vid", "video_id", "videoId", "id"]);
  const embed = findValue(payload, ["embed", "embed_url", "embedUrl", "embed_link", "player", "player_url", "playerUrl"]);
  const link = findValue(payload, ["link", "url", "play", "play_url", "playUrl", "video_url", "videoUrl", "direct", "direct_url"]);
  const thumbnail = findValue(payload, ["thumbnail", "thumbnail_url", "thumbnailUrl", "thumb", "poster", "poster_url", "image"]);
  return { vid: vid ? String(vid) : "", embed: embed ? String(embed) : "", link: link ? String(link) : "", thumbnail: thumbnail ? String(thumbnail) : "" };
}

function postUpload18(form: FormData, callback: (error: any, response?: any, body?: string) => void) {
  form.submit({
    protocol: "https:",
    host: "upload18.net",
    path: "/api/upload",
    headers: {
      Authorization: `Bearer ${String(process.env.UPLOAD18_API_KEY || "").trim()}`,
      Accept: "application/json",
    },
  }, (error: any, response: any) => {
    if (error) return callback(error);
    let body = "";
    response.setEncoding("utf8");
    response.on("data", (chunk: string) => { body += chunk; });
    response.on("end", () => callback(null, response, body));
    response.on("error", (err: any) => callback(err));
  });
}

const originalListen = express.application.listen;
(express.application as any).listen = function(this: any, ...args: any[]) {
  this.post("/api/upload18/proxy-upload", upload.single("file"), async (req: any, res: any) => {
    let tempPath = "";
    try {
      if (!(await requireAdmin(req, res))) return;
      const key = String(process.env.UPLOAD18_API_KEY || "").trim();
      if (!key) return res.status(500).json({ error: "Upload18 is not configured. Set UPLOAD18_API_KEY on Railway." });
      if (!req.file) return res.status(400).json({ error: "No video file uploaded" });
      tempPath = req.file.path;
      const cid = String(process.env.UPLOAD18_CID || "15").trim();
      const mycid = String(process.env.UPLOAD18_MYCID || "").trim();
      const fid = String(process.env.UPLOAD18_FID || "").trim();
      const form = new FormData();
      form.append("cid", cid);
      if (mycid) form.append("mycid", mycid);
      if (fid) form.append("fid", fid);
      form.append("video", fs.createReadStream(tempPath), { filename: req.file.originalname || "video.mp4", contentType: req.file.mimetype || "application/octet-stream" });

      const { response, body } = await new Promise<{ response: any; body: string }>((resolve, reject) => {
        postUpload18(form, (error, upstreamResponse, upstreamBody) => {
          if (error) return reject(error);
          resolve({ response: upstreamResponse, body: upstreamBody || "" });
        });
      });

      let data: any = {};
      try { data = JSON.parse(body); } catch { data = { raw: body }; }
      if (!response || response.statusCode < 200 || response.statusCode >= 300) {
        return res.status(response?.statusCode || 502).json({ error: "Upload18 upload failed", details: data });
      }

      let result = extractVideo(data);
      if (result.vid && (!result.embed || !result.thumbnail)) {
        try {
          const detailRes = await fetch(`https://upload18.net/api/getvideodetail/${encodeURIComponent(result.vid)}`, { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }, signal: AbortSignal.timeout(30000) });
          if (detailRes.ok) result = { ...result, ...Object.fromEntries(Object.entries(extractVideo(await detailRes.json())).filter(([, v]) => v)) };
        } catch {}
      }
      if (!result.vid) return res.status(502).json({ error: "Upload18 did not return a video ID", details: data });
      const playUrl = result.link || `https://upload18.net/play/${encodeURIComponent(result.vid)}`;
      const embedUrl = result.embed || playUrl;
      res.json({ success: true, provider: "upload18", vid: result.vid, videoId: result.vid, embedUrl, videoUrl: playUrl, thumbnailUrl: result.thumbnail || "", status: data?.status ?? data?.data?.status ?? null, raw: data });
    } catch (e: any) {
      console.error("[Upload18] proxy upload failed:", e);
      res.status(502).json({ error: "Upload18 upload failed", details: e?.message || String(e), cause: e?.cause?.code || e?.cause?.message || null });
    } finally {
      if (tempPath) { try { fs.unlinkSync(tempPath); } catch {} }
    }
  });
  return originalListen.apply(this, args as any);
};

import("./server");

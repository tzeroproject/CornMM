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

const originalListen = express.application.listen;
(express.application as any).listen = function(this: any, ...args: any[]) {
  this.post("/api/streamtape/proxy-upload", upload.single("file"), async (req: any, res: any) => {
    let tempPath = "";
    try {
      if (!(await requireAdmin(req, res))) return;
      const login = String(process.env.STREAMTAPE_API_LOGIN || "").trim();
      const key = String(process.env.STREAMTAPE_API_KEY || "").trim();
      if (!login || !key) return res.status(500).json({ error: "Streamtape is not configured. Set STREAMTAPE_API_LOGIN and STREAMTAPE_API_KEY on Railway." });
      if (!req.file) return res.status(400).json({ error: "No video file uploaded" });
      tempPath = req.file.path;
      const folder = String(process.env.STREAMTAPE_FOLDER || "").trim();
      const initUrl = new URL("https://api.streamtape.com/file/ul");
      initUrl.searchParams.set("login", login);
      initUrl.searchParams.set("key", key);
      if (folder) initUrl.searchParams.set("folder", folder);
      const initResponse = await fetch(initUrl, { signal: AbortSignal.timeout(30000) });
      const initBody = await initResponse.text();
      let initData: any = {};
      try { initData = JSON.parse(initBody); } catch { initData = { raw: initBody }; }
      if (!initResponse.ok) return res.status(502).json({ error: "Streamtape upload initialization failed", upstreamStatus: initResponse.status, details: initData });
      const uploadUrl = String(findValue(initData, ["url", "upload_url", "uploadUrl"]) || "").trim();
      if (!uploadUrl) return res.status(502).json({ error: "Streamtape did not return an upload URL", details: initData });

      const form = new FormData();
      form.append("file1", fs.createReadStream(tempPath), { filename: req.file.originalname || "video.mp4", contentType: req.file.mimetype || "application/octet-stream", knownLength: Number(req.file.size || 0) || undefined });
      const length = await new Promise<number>((resolve, reject) => form.getLength((err, n) => err ? reject(err) : resolve(n)));
      const upstream = await new Promise<{statusCode:number, body:string}>((resolve, reject) => {
        form.submit(uploadUrl, { headers: { ...form.getHeaders(), "Content-Length": String(length) } }, (error: any, response: any) => {
          if (error) return reject(error);
          let body = ""; response.setEncoding("utf8");
          response.on("data", (part: string) => { body += part; });
          response.on("end", () => resolve({ statusCode: Number(response.statusCode || 0), body }));
          response.on("error", reject);
        });
      });
      let data: any = {};
      try { data = JSON.parse(upstream.body); } catch { data = { raw: upstream.body }; }
      console.log(`[Streamtape] upload HTTP ${upstream.statusCode}: ${upstream.body.slice(0, 3000)}`);
      if (upstream.statusCode < 200 || upstream.statusCode >= 300) return res.status(502).json({ error: "Streamtape upload failed", upstreamStatus: upstream.statusCode, details: data });
      const fileId = String(findValue(data, ["fileId", "file_id", "id", "fileid"]) || "").trim();
      if (!fileId) return res.status(502).json({ error: "Streamtape did not return a file ID", details: data });
      const embedUrl = `https://streamtape.com/e/${encodeURIComponent(fileId)}`;
      res.json({ success: true, provider: "streamtape", fileId, providerId: fileId, embedUrl, videoUrl: embedUrl, thumbnailUrl: "" });
    } catch (e: any) {
      console.error("[Streamtape] proxy upload failed:", e);
      res.status(502).json({ error: e?.message || "Streamtape upload failed", details: e?.cause?.message || String(e), cause: e?.cause?.code || null });
    } finally { if (tempPath) { try { fs.unlinkSync(tempPath); } catch {} } }
  });

  this.post("/api/filemoon/proxy-upload", upload.single("file"), async (req: any, res: any) => {
    let tempPath = "";
    try {
      if (!(await requireAdmin(req, res))) return;
      const token = String(process.env.FILEMOON_API_TOKEN || "").trim();
      if (!token) return res.status(500).json({ error: "FileMoon is not configured. Set FILEMOON_API_TOKEN on Railway." });
      if (!req.file) return res.status(400).json({ error: "No video file uploaded" });

      tempPath = req.file.path;
      const fileName = req.file.originalname || "video.mp4";
      const mimeType = req.file.mimetype || "application/octet-stream";
      const fileSize = Number(req.file.size || 0);
      const CHUNK_SIZE = 90 * 1024 * 1024;
      const totalChunks = Math.max(1, Math.ceil(fileSize / CHUNK_SIZE));
      const uploadId = crypto.randomUUID();

      const sendFileMoonRequest = async (chunkIndex: number): Promise<{ statusCode: number; body: string; retryAfter?: number }> => {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(fileSize, start + CHUNK_SIZE);
        const chunkLength = Math.max(0, end - start);
        const form = new FormData();

        form.append("file", fs.createReadStream(tempPath, { start, end: Math.max(start, end - 1) }), {
          filename: fileName,
          contentType: mimeType,
          knownLength: chunkLength,
        });
        form.append("visibility", "1");

        if (totalChunks > 1) {
          form.append("dzuuid", uploadId);
          form.append("dzchunkindex", String(chunkIndex));
          form.append("dztotalchunkcount", String(totalChunks));
          form.append("dzchunksize", String(CHUNK_SIZE));
          form.append("dztotalfilesize", String(fileSize));
          form.append("dzchunkbyteoffset", String(start));
        }

        const length = await new Promise<number>((resolve, reject) =>
          form.getLength((err, n) => err ? reject(err) : resolve(n))
        );

        return new Promise<{ statusCode: number; body: string; retryAfter?: number }>((resolve, reject) => {
          const request = https.request({
            protocol: "https:",
            hostname: "filemoon.org",
            path: "/api/v1/files/upload",
            method: "POST",
            headers: {
              ...form.getHeaders(),
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
              "Content-Length": String(length),
            },
            timeout: 30 * 60 * 1000,
          }, (response: any) => {
            let body = "";
            response.setEncoding("utf8");
            response.on("data", (part: string) => { body += part; });
            response.on("end", () => {
              const retryHeader = response.headers?.["retry-after"];
              const retryAfter = Number(Array.isArray(retryHeader) ? retryHeader[0] : retryHeader);
              resolve({ statusCode: Number(response.statusCode || 0), body, retryAfter: Number.isFinite(retryAfter) ? retryAfter : undefined });
            });
            response.on("error", reject);
          });
          request.on("timeout", () => request.destroy(new Error("FileMoon upload timed out")));
          request.on("error", reject);
          form.pipe(request);
        });
      };

      let finalResponse: { statusCode: number; body: string } | null = null;
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        let upstream = await sendFileMoonRequest(chunkIndex);

        if (upstream.statusCode === 429) {
          const waitSeconds = Math.min(Math.max(upstream.retryAfter || 5, 1), 120);
          console.warn(`[FileMoon] rate limited on chunk ${chunkIndex + 1}/${totalChunks}; retrying after ${waitSeconds}s`);
          await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
          upstream = await sendFileMoonRequest(chunkIndex);
        }

        console.log(`[FileMoon] upload chunk ${chunkIndex + 1}/${totalChunks} HTTP ${upstream.statusCode}: ${upstream.body.slice(0, 3000)}`);

        let data: any = {};
        try { data = JSON.parse(upstream.body); } catch { data = { raw: upstream.body }; }

        if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
          return res.status(502).json({
            error: String(data?.error?.message || data?.error || data?.message || "FileMoon upload failed"),
            upstreamStatus: upstream.statusCode,
            chunk: chunkIndex,
            totalChunks,
            requestId: data?.request_id || null,
            details: data,
          });
        }

        finalResponse = { statusCode: upstream.statusCode, body: upstream.body };
      }

      if (!finalResponse) return res.status(502).json({ error: "FileMoon upload did not return a response" });

      let data: any = {};
      try { data = JSON.parse(finalResponse.body); } catch { data = { raw: finalResponse.body }; }

      const file = data?.data || data?.file || data || {};
      const fileId = String(
        file?.id || file?.file_id || data?.id || data?.file_id || findValue(data, ["id", "file_id"]) || ""
      ).trim();
      if (!fileId) return res.status(502).json({ error: "FileMoon did not return a file ID", details: data });

      const embedUrl = String(
        file?.urls?.embed || data?.urls?.embed || `https://filemoon.org/${encodeURIComponent(fileId)}/embed`
      );
      const watchUrl = String(
        file?.urls?.watch || data?.urls?.watch || `https://filemoon.org/${encodeURIComponent(fileId)}/watch`
      );
      const thumbnailUrl = String(
        file?.thumbnail_url || file?.thumbnail || data?.thumbnail_url || data?.thumbnail || ""
      );

      return res.json({
        success: true,
        provider: "filemoon",
        fileId,
        providerId: fileId,
        embedUrl,
        videoUrl: embedUrl || watchUrl,
        thumbnailUrl,
      });
    } catch (e: any) {
      console.error("[FileMoon] proxy upload failed:", e);
      return res.status(502).json({
        error: e?.message || "FileMoon upload failed",
        details: e?.cause?.message || String(e),
        cause: e?.cause?.code || null,
      });
    } finally {
      if (tempPath) { try { fs.unlinkSync(tempPath); } catch {} }
    }
  });

  return originalListen.apply(this, args as any);
};

import("./server");

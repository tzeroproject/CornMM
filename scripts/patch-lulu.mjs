import fs from "node:fs";

const file = "server.ts";
const source = fs.readFileSync(file, "utf8");
const start = source.indexOf("async function handleLuluUpload(");
const end = source.indexOf('\napp.post("/api/lulu/upload"', start);
if (start < 0 || end < 0) throw new Error("Lulu handler markers not found");

const handler = String.raw`async function handleLuluUpload(req: any, res: any) {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  let tempPath = "";
  try {
    const key = String(process.env.LULU_API_KEY || "").trim();
    if (!key) return res.status(500).json({ error: "LuluStream is not configured (LULU_API_KEY missing)" });
    if (!req.file) return res.status(400).json({ error: "No video file received" });

    tempPath = req.file.path;
    const title = String(req.body?.file_title || req.body?.title || req.file.originalname || "Untitled Video").slice(0, 300);

    const lookup = await fetch("https://lulustream.com/api/upload/server?key=" + encodeURIComponent(key), {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": "CornMM-LuluProxy/1.0" },
      signal: AbortSignal.timeout(30000)
    });
    const lookupText = await lookup.text();
    let lookupData: any;
    try {
      lookupData = JSON.parse(lookupText);
    } catch {
      console.error("[LULU] upload-server invalid JSON", lookup.status, lookupText.slice(0, 5000));
      return res.status(502).json({ error: "Lulu upload-server returned invalid JSON", status: lookup.status, details: lookupText.slice(0, 5000) });
    }

    const rawResult = lookupData?.result;
    const uploadUrl = typeof rawResult === "string"
      ? rawResult
      : rawResult?.url || rawResult?.upload_url || rawResult?.uploadUrl || rawResult?.server || rawResult?.result;

    if (!lookup.ok || Number(lookupData?.status) !== 200 || !uploadUrl) {
      console.error("[LULU] upload-server lookup failed", lookup.status, JSON.stringify(lookupData).slice(0, 5000));
      return res.status(502).json({ error: "Lulu upload-server lookup failed", status: lookup.status, message: lookupData?.msg || lookupData?.message, details: JSON.stringify(lookupData).slice(0, 5000) });
    }

    const sendMultipart = (targetUrl: string, redirectsLeft = 4): Promise<any> => new Promise((resolve, reject) => {
      let target: URL;
      try { target = new URL(targetUrl); } catch { return reject(new Error("Lulu returned an invalid upload URL: " + String(targetUrl).slice(0, 1000))); }
      if (target.protocol !== "http:" && target.protocol !== "https:") return reject(new Error("Unsupported Lulu upload protocol: " + target.protocol));

      const form = new FormData();
      form.append("key", key);
      form.append("file_title", title);
      form.append("file", fs.createReadStream(tempPath), {
        filename: req.file.originalname || "upload.mp4",
        contentType: req.file.mimetype || "application/octet-stream",
        knownLength: Number(req.file.size || 0)
      });

      const headers: any = { ...form.getHeaders(), Accept: "application/json", "User-Agent": "CornMM-LuluProxy/1.0" };
      form.getLength((lengthError, length) => {
        if (lengthError) return reject(lengthError);
        headers["Content-Length"] = String(length);

        const client = target.protocol === "https:" ? require("https") : require("http");
        const request = client.request(target, { method: "POST", headers, timeout: 30 * 60 * 1000 }, (response: any) => {
          const status = Number(response.statusCode || 500);
          const location = response.headers?.location;
          let body = "";
          response.setEncoding("utf8");
          response.on("data", (chunk: string) => { body += chunk; });
          response.on("end", () => {
            if ([301, 302, 303, 307, 308].includes(status) && location && redirectsLeft > 0) {
              return resolve(sendMultipart(new URL(location, target).toString(), redirectsLeft - 1));
            }

            let parsed: any = null;
            try { parsed = JSON.parse(body); } catch {}
            if (status < 200 || status >= 300) {
              return reject(new Error("Lulu upload HTTP " + status + ": " + (parsed ? JSON.stringify(parsed) : body).slice(0, 5000)));
            }
            if (!parsed) return reject(new Error("Lulu upload returned non-JSON HTTP " + status + ": " + body.slice(0, 5000)));
            resolve(parsed);
          });
        });
        request.on("timeout", () => request.destroy(new Error("Lulu upload timed out after 30 minutes")));
        request.on("error", reject);
        form.on("error", reject);
        form.pipe(request);
      });
    });

    console.log("[LULU] upload server:", String(uploadUrl).slice(0, 500));
    const uploadData: any = await sendMultipart(String(uploadUrl));
    console.log("[LULU] upload response:", JSON.stringify(uploadData).slice(0, 10000));

    const candidates: any[] = [];
    if (Array.isArray(uploadData?.files)) candidates.push(...uploadData.files);
    if (uploadData?.file) candidates.push(uploadData.file);
    if (uploadData?.result && typeof uploadData.result === "object") candidates.push(uploadData.result);
    candidates.push(uploadData);
    const entry = candidates.find((x: any) => x && (x.filecode || x.fileCode || x.file_code || x.code || x.id));
    const fileCode = entry?.filecode || entry?.fileCode || entry?.file_code || entry?.code || entry?.id;

    if (!fileCode) {
      return res.status(502).json({
        error: "Lulu returned an unexpected upload response",
        luluStatus: uploadData?.status,
        luluMessage: uploadData?.msg || uploadData?.message,
        details: JSON.stringify(uploadData).slice(0, 10000)
      });
    }

    return res.json({ success: true, fileCode: String(fileCode), embedUrl: "https://lulustream.com/e/" + String(fileCode) });
  } catch (e: any) {
    console.error("[LULU] upload failed:", e);
    return res.status(502).json({
      error: e?.message || "Lulu upload failed",
      details: e?.stack ? String(e.stack).slice(0, 5000) : undefined
    });
  } finally {
    if (tempPath) { try { fs.unlinkSync(tempPath); } catch {} }
  }
}
`;

fs.writeFileSync(file, source.slice(0, start) + handler + source.slice(end));
console.log("Lulu upload handler patched");

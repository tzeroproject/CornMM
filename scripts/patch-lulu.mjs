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
    const lookup = await fetch("https://lulustream.com/api/upload/server?key=" + encodeURIComponent(key), { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(30000) });
    const lookupText = await lookup.text();
    let lookupData: any;
    try { lookupData = JSON.parse(lookupText); } catch { return res.status(502).json({ error: "Lulu upload-server returned invalid JSON", status: lookup.status, details: lookupText.slice(0, 3000) }); }
    if (!lookup.ok || Number(lookupData.status) !== 200 || !lookupData.result) return res.status(502).json({ error: "Lulu upload-server lookup failed", status: lookup.status, message: lookupData.msg, details: JSON.stringify(lookupData).slice(0, 3000) });
    const sendMultipart = (targetUrl: string, redirectsLeft = 3): Promise<any> => new Promise((resolve, reject) => {
      const form = new FormData();
      form.append("key", key); form.append("file_title", title); form.append("file_public", "1"); form.append("file_adult", "1"); form.append("html_redirect", "0");
      form.append("file", fs.createReadStream(tempPath), { filename: req.file.originalname || "upload.mp4", contentType: req.file.mimetype || "application/octet-stream", knownLength: req.file.size });
      const headers: any = { ...form.getHeaders(), Accept: "application/json" };
      form.getLength((err, length) => {
        if (err) return reject(err);
        headers["Content-Length"] = String(length);
        const target = new URL(targetUrl);
        const client = target.protocol === "https:" ? require("https") : require("http");
        const request = client.request(target, { method: "POST", headers, timeout: 30 * 60 * 1000 }, (response: any) => {
          const status = Number(response.statusCode || 500); const location = response.headers?.location; let body = "";
          response.setEncoding("utf8"); response.on("data", (chunk: string) => { body += chunk; });
          response.on("end", () => {
            if ([301,302,303,307,308].includes(status) && location && redirectsLeft > 0) { response.resume(); return resolve(sendMultipart(new URL(location, target).toString(), redirectsLeft - 1)); }
            let parsed: any; try { parsed = JSON.parse(body); } catch { return reject(new Error("Lulu HTTP " + status + ": " + body.slice(0, 3000))); }
            if (status < 200 || status >= 300) return reject(new Error("Lulu HTTP " + status + ": " + JSON.stringify(parsed).slice(0, 3000)));
            resolve(parsed);
          });
        });
        request.on("timeout", () => request.destroy(new Error("Lulu upload timed out after 30 minutes")));
        request.on("error", reject); form.on("error", reject); form.pipe(request);
      });
    });
    const uploadData: any = await sendMultipart(String(lookupData.result));
    const entry = Array.isArray(uploadData?.files) ? uploadData.files.find((x: any) => x && (x.filecode || x.fileCode || x.file_code)) : null;
    const fileCode = entry?.filecode || entry?.fileCode || entry?.file_code;
    if (!fileCode) return res.status(502).json({ error: "Lulu returned an unexpected upload response", luluStatus: uploadData?.status, luluMessage: uploadData?.msg, details: JSON.stringify(uploadData).slice(0, 5000) });
    return res.json({ success: true, fileCode: String(fileCode), embedUrl: "https://lulustream.com/e/" + String(fileCode) });
  } catch (e: any) {
    console.error("[LULU] upload failed:", e);
    return res.status(502).json({ error: e?.message || "Lulu upload failed", details: e?.stack ? String(e.stack).slice(0, 3000) : undefined });
  } finally { if (tempPath) { try { fs.unlinkSync(tempPath); } catch {} } }
}
`;
fs.writeFileSync(file, source.slice(0, start) + handler + source.slice(end));
console.log("Lulu upload handler patched");

const fs = require('fs');

const path = 'server.ts';
let code = fs.readFileSync(path, 'utf8');

const start = code.indexOf('app.put(\n  "/api/lulu/upload"');
const end = code.indexOf('// =====================================================\n// UQLOAD STREAM INTEGRATION', start);

if (start === -1 || end === -1) {
  throw new Error('Could not locate LuluStream upload route in server.ts');
}

const replacement = `app.put(
  "/api/lulu/upload",
  express.raw({ type: "*/*", limit: "2gb" }),
  async (req, res) => {
    try {
      const key = (process.env.LULU_API_KEY || "").trim();
      if (!key) {
        return res.status(500).json({ error: "LuluStream backup is not configured (LULU_API_KEY missing)." });
      }

      const title = String(req.query.title || "Untitled Video");
      const fileBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || "");
      if (!fileBuffer.length) {
        return res.status(400).json({ error: "No video file received" });
      }

      // Ask LuluStream for the upload server assigned to this API key.
      const serverResponse = await fetch(
        \`https://lulustream.com/api/upload/server?key=\${encodeURIComponent(key)}\`,
        { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(30000) }
      );
      const serverText = await serverResponse.text();
      let serverData;
      try {
        serverData = JSON.parse(serverText);
      } catch {
        return res.status(502).json({
          error: "LuluStream server lookup returned invalid JSON",
          status: serverResponse.status,
          details: serverText.slice(0, 1000)
        });
      }

      if (!serverResponse.ok || serverData.status !== 200 || !serverData.result) {
        return res.status(502).json({
          error: "Failed to get LuluStream upload server",
          status: serverResponse.status,
          details: serverData.msg || serverText.slice(0, 1000)
        });
      }

      const uploadUrl = String(serverData.result);
      const contentType = String(req.headers["content-type"] || "video/mp4").split(";")[0];
      const form = new FormData();
      form.append("key", key);
      form.append("file_title", title);
      form.append("html_redirect", "0");
      form.append("file", fileBuffer, {
        filename: "upload.mp4",
        contentType
      });

      const headers = form.getHeaders();
      const contentLength = await new Promise((resolve, reject) => {
        form.getLength((err, length) => err ? reject(err) : resolve(length));
      });
      if (Number.isFinite(contentLength)) headers["Content-Length"] = String(contentLength);
      headers.Accept = "application/json";

      // Use Node https.request instead of native fetch + npm form-data.
      // This reliably streams the multipart body to LuluStream.
      const uploadResult = await new Promise((resolve, reject) => {
        const target = new URL(uploadUrl);
        const client = target.protocol === "http:" ? require("http") : require("https");
        const request = client.request(target, {
          method: "POST",
          headers,
          timeout: 30 * 60 * 1000
        }, (response) => {
          let body = "";
          response.setEncoding("utf8");
          response.on("data", chunk => { body += chunk; });
          response.on("end", () => {
            let parsed;
            try {
              parsed = JSON.parse(body);
            } catch {
              reject(new Error(\`LuluStream upload returned invalid JSON (HTTP \${response.statusCode}): \${body.slice(0, 1000)}\`));
              return;
            }

            if ((response.statusCode || 500) < 200 || (response.statusCode || 500) >= 300) {
              reject(new Error(\`LuluStream upload failed (HTTP \${response.statusCode}): \${JSON.stringify(parsed).slice(0, 2000)}\`));
              return;
            }

            resolve(parsed);
          });
        });

        request.on("timeout", () => request.destroy(new Error("LuluStream upload timed out after 30 minutes")));
        request.on("error", reject);
        form.pipe(request);
      });

      const fileEntry = uploadResult?.files?.[0];
      if (!fileEntry || fileEntry.status !== "OK" || !fileEntry.filecode) {
        return res.status(502).json({
          error: "LuluStream returned an unexpected upload response",
          details: JSON.stringify(uploadResult).slice(0, 2000)
        });
      }

      return res.json({
        success: true,
        fileCode: fileEntry.filecode,
        embedUrl: \`https://lulustream.com/e/\${fileEntry.filecode}\`
      });
    } catch (error) {
      console.error("LuluStream upload error:", error);
      return res.status(502).json({
        error: "LuluStream upload failed",
        details: error?.message || String(error)
      });
    }
  }
);


`;

code = code.slice(0, start) + replacement + code.slice(end);
fs.writeFileSync(path, code);
console.log('LuluStream upload route patched successfully.');

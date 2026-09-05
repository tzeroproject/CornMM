const fs = require('fs');

const path = 'server.ts';
let code = fs.readFileSync(path, 'utf8');

const start = code.indexOf('app.put(\n  "/api/lulu/upload"');
const end = code.indexOf('// =====================================================\n// UQLOAD STREAM INTEGRATION', start);

if (start === -1 || end === -1) {
  throw new Error('Could not locate Lulu upload route in server.ts');
}

const replacement = `app.post(
  "/api/lulu/upload",
  upload.single("file"),
  async (req, res) => {
    let tempPath = "";

    try {
      const key = (process.env.LULU_API_KEY || "").trim();
      if (!key) {
        return res.status(500).json({ error: "Lulu upload is not configured (LULU_API_KEY missing)." });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No video file received" });
      }

      tempPath = req.file.path;
      const title = String(req.body.file_title || req.body.title || req.file.originalname || "Untitled Video");
      const description = String(req.body.file_descr || "");

      const serverResponse = await fetch(
        \`https://lulustream.com/api/upload/server?key=\${encodeURIComponent(key)}\`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(30000)
        }
      );

      const serverText = await serverResponse.text();
      let serverData;
      try {
        serverData = JSON.parse(serverText);
      } catch {
        return res.status(502).json({
          error: "Lulu upload-server lookup returned invalid JSON",
          status: serverResponse.status,
          details: serverText.slice(0, 1000)
        });
      }

      if (!serverResponse.ok || serverData.status !== 200 || !serverData.result) {
        return res.status(502).json({
          error: "Failed to get Lulu upload server",
          status: serverResponse.status,
          details: serverData.msg || serverText.slice(0, 1000)
        });
      }

      const uploadUrl = String(serverData.result);
      const form = new FormData();
      form.append("key", key);
      form.append("file_title", title);
      if (description) form.append("file_descr", description);
      form.append("file_public", "1");
      form.append("file_adult", "1");
      form.append("html_redirect", "0");
      form.append("file", fs.createReadStream(tempPath), {
        filename: req.file.originalname || "upload.mp4",
        contentType: req.file.mimetype || "application/octet-stream"
      });

      const headers = form.getHeaders();
      const contentLength = await new Promise((resolve, reject) => {
        form.getLength((err, length) => err ? reject(err) : resolve(length));
      });
      if (Number.isFinite(contentLength)) {
        headers["Content-Length"] = String(contentLength);
      }
      headers.Accept = "application/json";

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
              reject(new Error(\`Lulu upload returned invalid JSON (HTTP \${response.statusCode}): \${body.slice(0, 1000)}\`));
              return;
            }

            if ((response.statusCode || 500) < 200 || (response.statusCode || 500) >= 300) {
              reject(new Error(\`Lulu upload failed (HTTP \${response.statusCode}): \${JSON.stringify(parsed).slice(0, 2000)}\`));
              return;
            }

            resolve(parsed);
          });
        });

        request.on("timeout", () => request.destroy(new Error("Lulu upload timed out after 30 minutes")));
        request.on("error", reject);
        form.pipe(request);
      });

      const fileEntry = uploadResult?.files?.[0];
      if (!fileEntry || fileEntry.status !== "OK" || !fileEntry.filecode) {
        return res.status(502).json({
          error: "Lulu returned an unexpected upload response",
          details: JSON.stringify(uploadResult).slice(0, 2000)
        });
      }

      return res.json({
        success: true,
        fileCode: fileEntry.filecode,
        embedUrl: \`https://lulustream.com/e/\${fileEntry.filecode}\`
      });
    } catch (error) {
      console.error("Lulu upload error:", error);
      return res.status(502).json({
        error: "Lulu upload failed",
        details: error?.message || String(error)
      });
    } finally {
      if (tempPath) {
        try { fs.unlinkSync(tempPath); } catch {}
      }
    }
  }
);


`;

code = code.slice(0, start) + replacement + code.slice(end);
fs.writeFileSync(path, code);
console.log('Lulu upload route patched successfully.');

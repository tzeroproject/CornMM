const fs = require("fs");

const path = "server.ts";
let code = fs.readFileSync(path, "utf8");

const start = code.indexOf('app.put(\n  "/api/lulu/upload"');
const end = code.indexOf("// =====================================================\n// UQLOAD STREAM INTEGRATION", start);

if (start === -1 || end === -1) {
  throw new Error("Could not locate Lulu upload route in server.ts");
}

const replacement = `app.post(
  "/api/lulu/upload",
  upload.single("file"),
  async (req, res) => {
    let tempPath = "";

    try {
      const key = String(process.env.LULU_API_KEY || "").trim();
      if (!key) return res.status(500).json({ error: "LULU_API_KEY is missing" });
      if (!req.file) return res.status(400).json({ error: "No video file received" });

      tempPath = req.file.path;
      const title = String(req.body.file_title || req.body.title || req.query.title || req.file.originalname || "Untitled Video");
      const description = String(req.body.file_descr || req.body.description || "");

      const lookup = await fetch(
        \`https://lulustream.com/api/upload/server?key=\${encodeURIComponent(key)}\`,
        { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(30000) }
      );

      const lookupText = await lookup.text();
      let lookupData;
      try { lookupData = JSON.parse(lookupText); }
      catch {
        return res.status(502).json({ error: "Lulu upload-server lookup returned invalid JSON", status: lookup.status, details: lookupText.slice(0, 2000) });
      }

      if (!lookup.ok || Number(lookupData.status) !== 200 || !lookupData.result) {
        return res.status(502).json({ error: "Failed to get Lulu upload server", status: lookup.status, details: lookupData.msg || lookupText.slice(0, 2000) });
      }

      const form = new FormData();
      form.append("key", key);
      form.append("file_title", title);
      if (description) form.append("file_descr", description);
      form.append("file_public", "1");
      form.append("file_adult", "1");
      form.append("html_redirect", "0");
      form.append("file", fs.createReadStream(tempPath), {
        filename: req.file.originalname || "upload.mp4",
        contentType: req.file.mimetype || "application/octet-stream",
        knownLength: req.file.size
      });

      const headers = form.getHeaders();
      const contentLength = await new Promise((resolve, reject) =>
        form.getLength((err, length) => err ? reject(err) : resolve(length))
      );
      headers["Content-Length"] = String(contentLength);
      headers.Accept = "application/json";

      const uploadData = await new Promise((resolve, reject) => {
        const target = new URL(String(lookupData.result));
        const client = target.protocol === "https:" ? require("https") : require("http");

        const request = client.request(target, {
          method: "POST",
          headers,
          timeout: 30 * 60 * 1000
        }, (response) => {
          const status = response.statusCode || 500;
          let body = "";
          response.setEncoding("utf8");
          response.on("data", chunk => { body += chunk; });
          response.on("end", () => {
            let parsed;
            try { parsed = JSON.parse(body); }
            catch {
              reject(new Error(\`Lulu upload returned non-JSON HTTP \${status}: \${body.slice(0, 3000)}\`));
              return;
            }
            if (status < 200 || status >= 300) {
              reject(new Error(\`Lulu upload HTTP \${status}: \${JSON.stringify(parsed).slice(0, 3000)}\`));
              return;
            }
            resolve(parsed);
          });
        });

        request.on("timeout", () => request.destroy(new Error("Lulu upload timed out after 30 minutes")));
        request.on("error", reject);
        form.pipe(request);
      });

      const entries = Array.isArray(uploadData?.files) ? uploadData.files : [];
      const entry = entries.find(item => item && (item.filecode || item.fileCode)) ||
        uploadData?.result?.files?.[0] ||
        uploadData?.result ||
        uploadData?.file ||
        uploadData;

      const fileCode = entry?.filecode || entry?.fileCode || entry?.file_code || uploadData?.filecode || uploadData?.fileCode;

      if (!fileCode) {
        return res.status(502).json({
          error: "Lulu returned an unexpected upload response",
          status: uploadData?.status,
          message: uploadData?.msg,
          details: JSON.stringify(uploadData).slice(0, 5000)
        });
      }

      const normalizedCode = String(fileCode);
      return res.json({
        success: true,
        fileCode: normalizedCode,
        embedUrl: \`https://lulustream.com/e/\${normalizedCode}\`
      });
    } catch (error) {
      console.error("Lulu upload error:", error);
      return res.status(502).json({ error: "Lulu upload failed", details: error?.message || String(error) });
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
console.log("Lulu upload route patched successfully.");

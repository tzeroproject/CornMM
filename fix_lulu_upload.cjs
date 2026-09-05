const fs = require("fs");

const path = "server.ts";
let code = fs.readFileSync(path, "utf8");

const start = code.indexOf('app.put(\n  "/api/lulu/upload"');
const end = code.indexOf("// =====================================================\n// UQLOAD STREAM INTEGRATION", start);

if (start === -1 || end === -1) {
  throw new Error("Could not locate Lulu upload route in server.ts");
}

const replacement = `app.put(
  "/api/lulu/upload",
  express.raw({ type: "*/*", limit: "2gb" }),
  async (req, res) => {
    try {
      const key = String(process.env.LULU_API_KEY || "").trim();
      if (!key) {
        return res.status(500).json({ error: "LULU_API_KEY is missing" });
      }

      const title = String(req.query.title || "Untitled Video");
      const fileBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || "");
      if (!fileBuffer.length) {
        return res.status(400).json({ error: "No video data received" });
      }

      const lookup = await fetch(
        \`https://lulustream.com/api/upload/server?key=\${encodeURIComponent(key)}\`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(30000)
        }
      );

      const lookupText = await lookup.text();
      let lookupData;
      try {
        lookupData = JSON.parse(lookupText);
      } catch {
        return res.status(502).json({
          error: "Lulu upload-server lookup returned invalid JSON",
          status: lookup.status,
          details: lookupText.slice(0, 3000)
        });
      }

      if (!lookup.ok || Number(lookupData.status) !== 200 || !lookupData.result) {
        return res.status(502).json({
          error: "Failed to get Lulu upload server",
          status: lookup.status,
          message: lookupData.msg,
          details: JSON.stringify(lookupData).slice(0, 3000)
        });
      }

      const form = new FormData();
      form.append("key", key);
      form.append("file_title", title);
      form.append("file_public", "1");
      form.append("file_adult", "1");
      form.append("html_redirect", "0");
      form.append("file", fileBuffer, {
        filename: "upload.mp4",
        contentType: String(req.headers["content-type"] || "video/mp4")
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
        }, response => {
          const status = response.statusCode || 500;
          let body = "";
          response.setEncoding("utf8");
          response.on("data", chunk => { body += chunk; });
          response.on("end", () => {
            let parsed;
            try {
              parsed = JSON.parse(body);
            } catch {
              reject(new Error(
                \`Lulu upload returned non-JSON HTTP \${status}: \${body.slice(0, 5000)}\`
              ));
              return;
            }

            if (status < 200 || status >= 300) {
              reject(new Error(
                \`Lulu upload HTTP \${status}: \${JSON.stringify(parsed).slice(0, 5000)}\`
              ));
              return;
            }

            resolve(parsed);
          });
        });

        request.on("timeout", () => {
          request.destroy(new Error("Lulu upload timed out after 30 minutes"));
        });
        request.on("error", reject);
        form.pipe(request);
      });

      // Lulu documentation normally returns files[].filecode, but tolerate
      // equivalent nesting/casing so a valid upload is not rejected.
      function findFileCode(value, depth = 0) {
        if (!value || depth > 8) return null;

        if (Array.isArray(value)) {
          for (const item of value) {
            const found = findFileCode(item, depth + 1);
            if (found) return found;
          }
          return null;
        }

        if (typeof value !== "object") return null;

        for (const key of ["filecode", "fileCode", "file_code"]) {
          if (value[key] !== undefined && value[key] !== null && String(value[key]).trim()) {
            return String(value[key]).trim();
          }
        }

        for (const key of Object.keys(value)) {
          const found = findFileCode(value[key], depth + 1);
          if (found) return found;
        }

        return null;
      }

      const fileCode = findFileCode(uploadData);

      if (!fileCode) {
        console.error("Lulu upload response:", JSON.stringify(uploadData).slice(0, 10000));
        return res.status(502).json({
          error: "Lulu returned an unexpected upload response",
          luluStatus: uploadData?.status,
          luluMessage: uploadData?.msg,
          details: JSON.stringify(uploadData).slice(0, 10000)
        });
      }

      return res.json({
        success: true,
        fileCode,
        embedUrl: \`https://lulustream.com/e/\${fileCode}\`
      });
    } catch (error) {
      console.error("Lulu upload error:", error);
      return res.status(502).json({
        error: "Lulu upload failed",
        details: error?.message || String(error)
      });
    }
  }
);

`;

code = code.slice(0, start) + replacement + code.slice(end);
fs.writeFileSync(path, code);
console.log("Lulu upload route patched successfully.");

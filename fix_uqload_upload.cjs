const fs = require('fs');

const path = 'server.ts';
let code = fs.readFileSync(path, 'utf8');

const start = code.indexOf('app.post("/api/uqload/proxy-upload"');
const end = code.indexOf('app.get("/api/uqload/upload-server"', start);

if (start === -1 || end === -1) {
  throw new Error('Could not locate UQLoad proxy upload route in server.ts');
}

const replacement = `app.post("/api/uqload/proxy-upload", upload.single('file'), async (req, res) => {
  let tempPath = '';

  try {
    const key = (process.env.UQLOAD_API_KEY || '').trim();
    if (!key) {
      return res.status(500).json({ error: 'UQLOAD_API_KEY environment variable is missing' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    tempPath = req.file.path;

    const serverRes = await fetch(
      \`https://uqload.vc/api/upload/server?key=\${encodeURIComponent(key)}\`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(30000)
      }
    );

    const serverText = await serverRes.text();
    let serverData;
    try {
      serverData = JSON.parse(serverText);
    } catch {
      return res.status(502).json({
        error: 'UQLoad server lookup returned invalid JSON',
        status: serverRes.status,
        details: serverText.slice(0, 1000)
      });
    }

    if (!serverRes.ok || serverData.status !== 200 || !serverData.result) {
      return res.status(502).json({
        error: 'Failed to get UQLoad upload server',
        status: serverRes.status,
        details: serverData.msg || serverText.slice(0, 1000)
      });
    }

    const uploadUrl = String(serverData.result);
    const form = new FormData();
    form.append('key', key);
    form.append('file_title', String(req.body.file_title || req.file.originalname || 'Video'));
    form.append('html_redirect', '0');
    form.append('file', fs.createReadStream(tempPath), {
      filename: req.file.originalname || 'upload.mp4',
      contentType: req.file.mimetype || 'application/octet-stream'
    });

    const headers = form.getHeaders();
    const contentLength = await new Promise((resolve, reject) => {
      form.getLength((err, length) => err ? reject(err) : resolve(length));
    });
    if (Number.isFinite(contentLength)) {
      headers['Content-Length'] = String(contentLength);
    }
    headers.Accept = 'application/json';

    // Use Node's native https client for the multipart stream.
    // This avoids incompatibilities between the npm form-data stream and
    // native fetch/undici while preserving the exact multipart format UQLoad expects.
    const uploadResult = await new Promise((resolve, reject) => {
      const target = new URL(uploadUrl);
      const request = require('https').request(target, {
        method: 'POST',
        headers,
        timeout: 30 * 60 * 1000
      }, (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', chunk => { body += chunk; });
        response.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch {
            reject(new Error(\`UQLoad upload returned invalid JSON (HTTP \${response.statusCode}): \${body.slice(0, 1000)}\`));
            return;
          }

          if ((response.statusCode || 500) < 200 || (response.statusCode || 500) >= 300) {
            reject(new Error(\`UQLoad upload failed (HTTP \${response.statusCode}): \${JSON.stringify(parsed).slice(0, 2000)}\`));
            return;
          }

          resolve(parsed);
        });
      });

      request.on('timeout', () => {
        request.destroy(new Error('UQLoad upload timed out after 30 minutes'));
      });
      request.on('error', reject);
      form.pipe(request);
    });

    return res.status(200).json(uploadResult);
  } catch (error) {
    console.error('UQLoad proxy upload error:', error);
    return res.status(502).json({
      error: 'UQLoad upload failed',
      details: error?.message || String(error)
    });
  } finally {
    if (tempPath) {
      try {
        fs.unlinkSync(tempPath);
      } catch {}
    }
  }
});
`;

code = code.slice(0, start) + replacement + code.slice(end);
fs.writeFileSync(path, code);
console.log('UQLoad proxy upload route patched successfully.');

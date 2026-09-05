const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetStr = `app.get("/api/uqload/upload-server", async (req, res) => {
  try {
    const key = process.env.UQLOAD_API_KEY;
    if (!key) {
      return res.status(500).json({ error: "UQLOAD_API_KEY environment variable is missing" });
    }
    const response = await fetch(\`https://uqload.vc/api/upload/server?key=\${encodeURIComponent(key.trim())}\`);
    if (!response.ok) {
       throw new Error(\`Uqload API returned \${response.status}\`);
    }
    const data = await response.json();
    if (data.status !== 200) {
       throw new Error(data.msg || "Failed to get Uqload upload server");
    }
    res.json({ uploadUrl: data.result, apiKey: key });
  } catch (error: any) {
    console.error("Uqload get upload server error:", error);
    res.status(500).json({ error: error.message });
  }
});`;

const repStr = `
const multer = require('multer');
const FormData = require('form-data');
const upload = multer({ dest: '/tmp/uploads/' });

app.post("/api/uqload/proxy-upload", upload.single('file'), async (req, res) => {
  try {
    const key = process.env.UQLOAD_API_KEY;
    if (!key) {
      return res.status(500).json({ error: "UQLOAD_API_KEY environment variable is missing" });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    const serverRes = await fetch(\`https://uqload.vc/api/upload/server?key=\${encodeURIComponent(key.trim())}\`);
    const serverData = await serverRes.json();
    if (serverData.status !== 200 || !serverData.result) {
      throw new Error("Failed to get Uqload upload server");
    }
    const uploadUrl = serverData.result;
    
    const form = new FormData();
    form.append('key', key.trim());
    form.append('file_title', req.body.file_title || 'Video');
    form.append('html_redirect', '0');
    form.append('file', require('fs').createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      body: form
    });
    
    const uploadResult = await uploadRes.json();
    
    // Clean up temp file
    try {
      require('fs').unlinkSync(req.file.path);
    } catch(e) {}
    
    res.json(uploadResult);
    
  } catch (error: any) {
    console.error("Uqload proxy upload error:", error);
    res.status(500).json({ error: error.message });
  }
});
` + targetStr;

content = content.replace(targetStr, repStr);
fs.writeFileSync('server.ts', content);
console.log("Patched server.ts with uqload proxy");

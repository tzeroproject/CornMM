const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const luluRoutes = `
// =====================================================
// LULU STREAM INTEGRATION
// =====================================================

app.get("/api/lulu/upload-server", async (req, res) => {
  try {
    const key = process.env.LULU_API_KEY;
    if (!key) {
      return res.status(500).json({ error: "LULU_API_KEY environment variable is missing" });
    }
    const response = await fetch(\`https://lulustream.com/api/upload/server?key=\${key}\`);
    if (!response.ok) {
       throw new Error(\`Lulu API returned \${response.status}\`);
    }
    const data = await response.json();
    if (data.status !== 200) {
       throw new Error(data.msg || "Failed to get Lulu upload server");
    }
    res.json({ uploadUrl: data.result, apiKey: key });
  } catch (error: any) {
    console.error("Lulu get upload server error:", error);
    res.status(500).json({ error: error.message });
  }
});

`;

code = code.replace(
  '// =====================================================',
  luluRoutes + '// ====================================================='
);

fs.writeFileSync('server.ts', code);
console.log("Patched server.ts with Lulu routes");

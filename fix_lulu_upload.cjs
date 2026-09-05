const fs = require("fs");

const path = "server.ts";
const code = fs.readFileSync(path, "utf8");

// Lulu is maintained directly in server.ts.
// This build step is intentionally idempotent so it never rewrites a
// working route or changes POST to PUT after deployment.
if (!code.includes('app.post("/api/lulu/upload"')) {
  throw new Error("Lulu POST upload route is missing from server.ts");
}

console.log("Lulu upload route verified successfully.");

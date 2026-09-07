const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(/const PORT = Number\(process\.env\.PORT \|\| 3000\);/g, "const PORT = 3000;");
fs.writeFileSync('server.ts', content);
console.log("Hardcoded PORT to 3000");

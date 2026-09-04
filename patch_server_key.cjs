const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  'const response = await fetch(\`https://lulustream.com/api/upload/server?key=\${key}\`);',
  'const response = await fetch(\`https://lulustream.com/api/upload/server?key=\${encodeURIComponent(key.trim())}\`);'
);

fs.writeFileSync('server.ts', code);
console.log("Patched server.ts to encode LULU_API_KEY");

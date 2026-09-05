const fs = require('fs');
let content = fs.readFileSync('src/pages/UploadPage.tsx', 'utf8');
content = content.replace('const result = await new Promise((resolve, reject) => {', 'const result = await new Promise<any>((resolve, reject) => {');
fs.writeFileSync('src/pages/UploadPage.tsx', content);
console.log("UploadPage files patched");

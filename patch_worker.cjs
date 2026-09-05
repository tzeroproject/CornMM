const fs = require('fs');
let content = fs.readFileSync('worker/index.ts', 'utf8');
content = content.replace('ASSETS: Fetcher;', 'ASSETS: any;');
content = content.replace('ctx: ExecutionContext', 'ctx: any');
fs.writeFileSync('worker/index.ts', content);
console.log("Worker patched");

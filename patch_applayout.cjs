const fs = require('fs');
let content = fs.readFileSync('src/components/layout/AppLayout.tsx', 'utf8');
content = content.replace(
  'return (\n    <>\n            <div className="min-h-screen',
  'return (\n    <>\n      <AgeGate />\n      <div className="min-h-screen'
);
fs.writeFileSync('src/components/layout/AppLayout.tsx', content);
console.log("AppLayout patched with AgeGate");

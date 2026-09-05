const fs = require('fs');

// Patch index.html
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace('width=device-width, initial-scale=1.0', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0');
html = html.replace(/cornmm/g, 'StreamSphere');
fs.writeFileSync('index.html', html);

// Patch AppLayout.tsx
let appLayout = fs.readFileSync('src/components/layout/AppLayout.tsx', 'utf8');
appLayout = appLayout.replace(
  '<div className="min-h-screen bg-[#050505] text-zinc-300 flex flex-col selection:bg-amber-500/25 selection:text-amber-200 font-sans">',
  '<div className="min-h-screen overflow-x-hidden w-full bg-[#050505] text-zinc-300 flex flex-col selection:bg-amber-500/25 selection:text-amber-200 font-sans">'
);
fs.writeFileSync('src/components/layout/AppLayout.tsx', appLayout);

console.log("App patched");

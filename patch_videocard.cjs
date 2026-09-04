const fs = require('fs');
let content = fs.readFileSync('src/components/video/VideoCard.tsx', 'utf8');

content = content.replace(
  'className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"',
  'className="w-full h-full object-cover scale-110 blur-xl group-hover:scale-105 group-hover:blur-0 transition-all duration-500"'
);

fs.writeFileSync('src/components/video/VideoCard.tsx', content);
console.log("VideoCard.tsx patched for blur");

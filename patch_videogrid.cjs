const fs = require('fs');
let content = fs.readFileSync('src/components/video/VideoGrid.tsx', 'utf8');

// Change grid columns and gap to match mobile-first responsive specs
// 2 cols on mobile, 3 on md, 4 on lg, 5 on xl.
content = content.replace(
  /grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-5/g,
  'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5'
);
content = content.replace(
  /grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 sm:gap-5/g,
  'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5'
);

fs.writeFileSync('src/components/video/VideoGrid.tsx', content);
console.log('VideoGrid patched');

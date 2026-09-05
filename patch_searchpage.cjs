const fs = require('fs');
let content = fs.readFileSync('src/pages/SearchPage.tsx', 'utf8');

// Update form for mobile: stacking on small screens if necessary
content = content.replace(
  'className="flex gap-2"',
  'className="flex flex-col sm:flex-row gap-2"'
);

// We need to adjust select boxes so they look good on mobile
content = content.replace(
  'className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/5 text-xs"',
  'className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-3 border-t border-white/5 text-xs"'
);

content = content.replace(
  'className="flex flex-wrap items-center gap-3"',
  'className="flex flex-wrap items-center gap-2 sm:gap-3"'
);

fs.writeFileSync('src/pages/SearchPage.tsx', content);
console.log('SearchPage patched');

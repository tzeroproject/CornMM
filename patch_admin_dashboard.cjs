const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboardPage.tsx', 'utf8');

// Remove the "Review Queue" block
const reviewQueueStart = content.indexOf('{/* Review Queue */}');
if (reviewQueueStart !== -1) {
  // Let's find the end of this block by finding the next section.
  const nextSection = content.indexOf('{/* Reports Queue */}');
  if (nextSection !== -1) {
    content = content.substring(0, reviewQueueStart) + content.substring(nextSection);
  }
}

// Remove the Pending Review stat card
content = content.replace(
  /<div className="bg-\[#0a0a0a\] border border-white\/10 rounded-2xl p-5">\s*<div className="flex items-start justify-between">\s*<div>\s*<div className="text-\[10px\] uppercase font-semibold text-amber-400 mb-1">Pending Review<\/div>\s*<div className="text-2xl font-bold text-amber-400 font-mono">\{stats.pendingVideos\}<\/div>\s*<\/div>\s*<div className="p-2\.5 rounded-xl bg-amber-500\/10">\s*<AlertCircle className="w-5 h-5 text-amber-500" \/>\s*<\/div>\s*<\/div>\s*<\/div>/g,
  ''
);

fs.writeFileSync('src/pages/AdminDashboardPage.tsx', content);
console.log("AdminDashboardPage patched to remove approval system.");

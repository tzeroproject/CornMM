const fs = require('fs');
let content = fs.readFileSync('src/pages/WatchPage.tsx', 'utf8');

// Change grid cols 3 into a stack so that video takes full width of the container.
content = content.replace(
  '<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">',
  '<div className="flex flex-col gap-8 max-w-5xl mx-auto">'
);

content = content.replace(
  '<div className="lg:col-span-2 space-y-6">',
  '<div className="w-full space-y-6">'
);

// We need to find the related videos div and change its styling to match the grid requirements.
// Current:
// {/* Right Column: Related Videos Stream */}
// <div className="space-y-4">
// ...
// <div className="space-y-3">
//   {relatedVideos.map((item) => (

content = content.replace(
  '{/* Right Column: Related Videos Stream */}',
  '{/* Related Videos Section (Below Video) */}'
);

content = content.replace(
  '<div className="space-y-3">\n          {relatedVideos.map((item) => (\n            <Link\n              key={item.id}\n              to={`/watch/${item.slug || item.id}`}\n              className="group flex gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"',
  `<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">\n          {relatedVideos.map((item) => (\n            <Link\n              key={item.id}\n              to={\`/watch/\${item.slug || item.id}\`}\n              className="group flex flex-col gap-2 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 p-2"`
);

// The related video card structure inside WatchPage is a flex row currently. I need to make it flex col to look like a standard grid video card.
content = content.replace(
  '<div className="relative aspect-video w-36 rounded-lg overflow-hidden bg-black shrink-0 border border-white/5">',
  '<div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black shrink-0 border border-white/5">'
);

// The titles and views are inside:
content = content.replace(
  '<div className="flex-1 min-w-0 py-1 flex flex-col justify-between">',
  '<div className="flex-1 min-w-0 flex flex-col gap-1">'
);

content = content.replace(
  '<h4 className="text-xs font-semibold text-white line-clamp-2 group-hover:text-amber-400 transition-colors">',
  '<h4 className="text-xs sm:text-sm font-semibold text-white line-clamp-2 group-hover:text-amber-400 transition-colors">'
);

fs.writeFileSync('src/pages/WatchPage.tsx', content);
console.log('WatchPage patched');

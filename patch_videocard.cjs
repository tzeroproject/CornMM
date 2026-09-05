const fs = require('fs');
let content = fs.readFileSync('src/components/video/VideoCard.tsx', 'utf8');

// The mobile card currently uses `rounded-none sm:rounded-2xl` and `border-x-0`. Let's make it fully rounded on mobile too.
content = content.replace(
  'rounded-none sm:rounded-2xl bg-[#0a0a0a] border-y border-x-0 sm:border-x',
  'rounded-xl sm:rounded-2xl bg-[#0a0a0a] border'
);

// We should also adjust padding and font sizes slightly for the tight 2-col layout
content = content.replace(
  'p-3.5 flex items-start gap-3',
  'p-2 sm:p-3.5 flex items-start gap-2 sm:gap-3'
);
content = content.replace(
  'w-8 h-8 rounded-full',
  'w-6 h-6 sm:w-8 sm:h-8 rounded-full'
);
content = content.replace(
  'font-semibold text-sm text-white',
  'font-semibold text-xs sm:text-sm text-white'
);
content = content.replace(
  'mt-1 flex items-center gap-1.5 text-xs text-zinc-400',
  'mt-1 flex items-center gap-1.5 text-[10px] sm:text-xs text-zinc-400'
);
content = content.replace(
  'mt-1 flex items-center gap-2.5 text-[11px] text-zinc-500',
  'mt-1 flex items-center gap-1 sm:gap-2.5 text-[9px] sm:text-[11px] text-zinc-500 flex-wrap'
);

fs.writeFileSync('src/components/video/VideoCard.tsx', content);
console.log('VideoCard patched');

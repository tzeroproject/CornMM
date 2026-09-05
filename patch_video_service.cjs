const fs = require('fs');
let content = fs.readFileSync('src/services/videoService.ts', 'utf8');

content = content.replace(
  "moderation_status: videoData.moderation_status || 'pending_review',",
  "moderation_status: videoData.moderation_status || 'published',"
);

fs.writeFileSync('src/services/videoService.ts', content);
console.log("videoService patched");

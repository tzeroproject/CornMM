const fs = require('fs');
let content = fs.readFileSync('src/services/videoService.ts', 'utf8');

const bypassToRemove = `      // Bypass DB insert if it's the demo admin account to avoid foreign key errors
      if (newVideo.creator_id === '00000000-0000-0000-0000-000000000001' || newVideo.creator_id === 'admin-12345' || newVideo.creator_id === 'anonymous_user') {
        console.log('Bypassing video insert for demo/admin account.');
        return newVideo;
      }

`;

content = content.replace(bypassToRemove, '');
fs.writeFileSync('src/services/videoService.ts', content);
console.log("Removed video bypass");

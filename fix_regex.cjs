const fs = require('fs');

function fixRegex(file) {
  let code = fs.readFileSync(file, 'utf8');
  // Replace case-sensitive regex with case-insensitive and space-tolerant one
  code = code.replace(/embedUrl\.match\(\/src=\\["'\\]\(\.\*\?\)\\["'\\]\/\)/g, "embedUrl.match(/src\\s*=\\s*[\"'](.*?)[\"']/i)");
  code = code.replace(/video\.video_url\.match\(\/src=\\["'\\]\(\.\*\?\)\\["'\\]\/\)/g, "video.video_url.match(/src\\s*=\\s*[\"'](.*?)[\"']/i)");
  fs.writeFileSync(file, code);
  console.log(`Patched ${file}`);
}

fixRegex('src/pages/UploadPage.tsx');
fixRegex('src/components/video/VideoPlayer.tsx');

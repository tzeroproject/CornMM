const fs = require('fs');

function fix(file) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/const srcMatch = embedUrl\.match\(\/src=\\["'\\]\(\.\*\?\)\\["'\\]\/\);/g, "const srcMatch = embedUrl.match(/src\\s*=\\s*[\"'](.*?)[\"']/i);");
  code = code.replace(/const srcMatch = video\.video_url\.match\(\/src=\\["'\\]\(\.\*\?\)\\["'\\]\/\);/g, "const srcMatch = video.video_url.match(/src\\s*=\\s*[\"'](.*?)[\"']/i);");
  fs.writeFileSync(file, code);
  console.log("Fixed " + file);
}

fix('src/pages/UploadPage.tsx');
fix('src/components/video/VideoPlayer.tsx');

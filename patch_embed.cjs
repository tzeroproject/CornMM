const fs = require('fs');

let uploadPage = fs.readFileSync('src/pages/UploadPage.tsx', 'utf8');

// Rename the tab from "Good Stream" to "Any Embed Link"
uploadPage = uploadPage.replace(
  />\s*Good Stream\s*<\/button>/g,
  ">Any Embed Link</button>"
);

// Optional: Make the place-holder or instructions more general
uploadPage = uploadPage.replace(
  'placeholder="<iframe src=\\"https://goodstream.com/...\\"></iframe>"',
  'placeholder="<iframe src=\\"...\\"></iframe> or just a URL"'
);

fs.writeFileSync('src/pages/UploadPage.tsx', uploadPage);
console.log("Patched UploadPage for Any Embed Link");

const fs = require('fs');
let content = fs.readFileSync('src/pages/UploadPage.tsx', 'utf8');

// Update input sizing for better mobile touch targets
content = content.replace(
  'h-10 px-3.5',
  'h-11 px-4'
);

content = content.replace(
  'h-10 px-2',
  'h-11 px-3'
);

// Update select boxes
content = content.replace(
  /className="w-full h-10/g,
  'className="w-full h-11'
);

fs.writeFileSync('src/pages/UploadPage.tsx', content);
console.log('UploadPage patched');

const fs = require('fs');
let code = fs.readFileSync('src/pages/UploadPage.tsx', 'utf8');

code = code.replace(
  'disabled={isUploading || !selectedFile}',
  'disabled={isUploading || (uploadMode === "file" && !selectedFile) || (uploadMode === "embed" && !embedUrl)}'
);

fs.writeFileSync('src/pages/UploadPage.tsx', code);
console.log("Patched Submit Button");

const fs = require('fs');

let uploadPage = fs.readFileSync('src/pages/UploadPage.tsx', 'utf8');
let serverTs = fs.readFileSync('server.ts', 'utf8');

// 1. Update State
uploadPage = uploadPage.replace(
  'useState<"bunny" | "lulu" | "good">("bunny");',
  'useState<"bunny" | "lulu" | "uqload" | "good">("bunny");'
);

// 2. Add Tab
const luluTab = `        <button
          type="button"
          onClick={() => setUploadMode('lulu')}
          className={\`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors \${uploadMode === 'lulu' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:text-white'}\`}
        >
          Lulu Stream
        </button>`;
        
const uqloadTab = `        <button
          type="button"
          onClick={() => setUploadMode('uqload')}
          className={\`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors \${uploadMode === 'uqload' ? 'bg-purple-500/20 text-purple-400' : 'text-zinc-400 hover:text-white'}\`}
        >
          Uqload Stream
        </button>`;

uploadPage = uploadPage.replace(luluTab, luluTab + '\n' + uqloadTab);

// 3. Conditional Rendering (Drag&Drop area)
uploadPage = uploadPage.replace(
  "{uploadMode === 'bunny' || uploadMode === 'lulu' ? (",
  "{uploadMode === 'bunny' || uploadMode === 'lulu' || uploadMode === 'uqload' ? ("
);

// 4. Update Disabled button logic
uploadPage = uploadPage.replace(
  'disabled={isUploading || ((uploadMode === "bunny" || uploadMode === "lulu") && !selectedFile) || (uploadMode === "good" && !embedUrl)}',
  'disabled={isUploading || ((uploadMode === "bunny" || uploadMode === "lulu" || uploadMode === "uqload") && !selectedFile) || (uploadMode === "good" && !embedUrl)}'
);

// 5. Add error checking in performUpload
uploadPage = uploadPage.replace(
  `    if (uploadMode === 'lulu' && !selectedFile) {
      showToast({ type: 'error', title: 'Video File Required for Lulu Stream' });
      return;
    }`,
  `    if (uploadMode === 'lulu' && !selectedFile) {
      showToast({ type: 'error', title: 'Video File Required for Lulu Stream' });
      return;
    }
    
    if (uploadMode === 'uqload' && !selectedFile) {
      showToast({ type: 'error', title: 'Video File Required for Uqload Stream' });
      return;
    }`
);

// 6. Add upload logic in performUpload
const luluLogicBlockRegex = /if \(uploadMode === 'lulu' && selectedFile\) \{[\s\S]*?(?=\n\s*\/\/ 1\. Authorize on Bunny Stream)/;
const match = uploadPage.match(luluLogicBlockRegex);

if (match) {
  const uqloadLogic = match[0].replace(/lulu/g, 'uqload').replace(/Lulu/g, 'Uqload').replace(/LULU/g, 'UQLOAD').replace(/lulustream/g, 'uqload.vc');
  uploadPage = uploadPage.replace(match[0], match[0] + '\n\n      ' + uqloadLogic);
} else {
  console.log("Could not match luluLogicBlock for Uqload injection");
}

fs.writeFileSync('src/pages/UploadPage.tsx', uploadPage);

// 7. Server.ts routing
const luluServerRegex = /\/\/ =====================================================\n\/\/ LULU STREAM INTEGRATION\n\/\/ =====================================================[\s\S]*?(?=\n\/\/ =====================================================)/;
const serverMatch = serverTs.match(luluServerRegex);
if (serverMatch) {
  const uqloadServer = serverMatch[0].replace(/lulu/g, 'uqload').replace(/Lulu/g, 'Uqload').replace(/LULU/g, 'UQLOAD').replace(/lulustream/g, 'uqload.vc');
  serverTs = serverTs.replace(serverMatch[0], serverMatch[0] + '\n\n' + uqloadServer);
  fs.writeFileSync('server.ts', serverTs);
} else {
  console.log("Could not match luluServer block");
}

console.log("Patching complete");

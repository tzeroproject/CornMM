const fs = require('fs');
let code = fs.readFileSync('src/pages/UploadPage.tsx', 'utf8');

const oldRender = `        {/* Upload Mode conditional rendering */}
        {uploadMode === 'bunny' ? (
          !selectedFile ? (`;

const newRender = `        {/* Upload Mode conditional rendering */}
        {uploadMode === 'bunny' || uploadMode === 'lulu' ? (
          !selectedFile ? (`;

code = code.replace(oldRender, newRender);

const oldTextArea = `        ) : (
          <div className="p-6 rounded-3xl bg-[#0a0a0a] border border-white/10 space-y-4">
            <label className="block text-sm font-bold text-white uppercase tracking-wider mb-2">{uploadMode === 'lulu' ? 'Lulu Stream Embed Code or URL' : 'Good Stream Embed Code or URL'}</label>
            <textarea
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              placeholder={uploadMode === 'lulu' ? '<iframe src="https://luluvdo.com/e/anrkww78l6w8" ...></iframe>' : '<iframe src="https://goodstream.com/embed/..." ...></iframe>'}
              className="w-full h-32 px-4 py-3 rounded-xl bg-black border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            <p className="text-xs text-zinc-400">Paste an iframe code or direct embed URL from a third-party streaming site.</p>
          </div>
        )}`;

const newTextArea = `        ) : (
          <div className="p-6 rounded-3xl bg-[#0a0a0a] border border-white/10 space-y-4">
            <label className="block text-sm font-bold text-white uppercase tracking-wider mb-2">Good Stream Embed Code or URL</label>
            <textarea
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              placeholder={'<iframe src="https://goodstream.com/embed/..." ...></iframe>'}
              className="w-full h-32 px-4 py-3 rounded-xl bg-black border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            <p className="text-xs text-zinc-400">Paste an iframe code or direct embed URL from a third-party streaming site.</p>
          </div>
        )}`;

code = code.replace(oldTextArea, newTextArea);

// Fix button disabled logic
code = code.replace(
  'disabled={isUploading || (uploadMode === "bunny" && !selectedFile) || ((uploadMode === "lulu" || uploadMode === "good") && !embedUrl)}',
  'disabled={isUploading || ((uploadMode === "bunny" || uploadMode === "lulu") && !selectedFile) || (uploadMode === "good" && !embedUrl)}'
);

fs.writeFileSync('src/pages/UploadPage.tsx', code);
console.log("Patched UI for Lulu upload");

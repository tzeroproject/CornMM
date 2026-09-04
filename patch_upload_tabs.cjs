const fs = require('fs');
let code = fs.readFileSync('src/pages/UploadPage.tsx', 'utf8');

code = code.replace(
  'const [uploadMode, setUploadMode] = useState<"file" | "embed">("file");',
  'const [uploadMode, setUploadMode] = useState<"bunny" | "lulu" | "good">("bunny");'
);

const oldTabs = `      {/* Upload Mode Switcher */}
      <div className="flex bg-[#0a0a0a] border border-white/10 rounded-xl p-1 mb-6">
        <button
          type="button"
          onClick={() => setUploadMode('file')}
          className={\`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors \${uploadMode === 'file' ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-400 hover:text-white'}\`}
        >
          BunnyCDN Upload
        </button>
        <button
          type="button"
          onClick={() => setUploadMode('embed')}
          className={\`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors \${uploadMode === 'embed' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:text-white'}\`}
        >
          Third-Party Embed (Iframe)
        </button>
      </div>`;

const newTabs = `      {/* Upload Mode Switcher */}
      <div className="flex bg-[#0a0a0a] border border-white/10 rounded-xl p-1 mb-6">
        <button
          type="button"
          onClick={() => setUploadMode('bunny')}
          className={\`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors \${uploadMode === 'bunny' ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-400 hover:text-white'}\`}
        >
          Bunny Stream
        </button>
        <button
          type="button"
          onClick={() => setUploadMode('lulu')}
          className={\`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors \${uploadMode === 'lulu' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:text-white'}\`}
        >
          Lulu Stream
        </button>
        <button
          type="button"
          onClick={() => setUploadMode('good')}
          className={\`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors \${uploadMode === 'good' ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-400 hover:text-white'}\`}
        >
          Good Stream
        </button>
      </div>`;

code = code.replace(oldTabs, newTabs);

code = code.replace(
  "{uploadMode === 'file' ? (",
  "{uploadMode === 'bunny' ? ("
);

code = code.replace(
  "if (uploadMode === 'file' && !selectedFile && !autoFallback)",
  "if (uploadMode === 'bunny' && !selectedFile && !autoFallback)"
);

code = code.replace(
  "if (uploadMode === 'embed' && !embedUrl)",
  "if ((uploadMode === 'lulu' || uploadMode === 'good') && !embedUrl)"
);

code = code.replace(
  "if (uploadMode === 'embed') {",
  "if (uploadMode === 'lulu' || uploadMode === 'good') {"
);

code = code.replace(
  `disabled={isUploading || (uploadMode === "file" && !selectedFile) || (uploadMode === "embed" && !embedUrl)}`,
  `disabled={isUploading || (uploadMode === "bunny" && !selectedFile) || ((uploadMode === "lulu" || uploadMode === "good") && !embedUrl)}`
);

code = code.replace(
  `<label className="block text-sm font-bold text-white uppercase tracking-wider mb-2">Embed Code or URL</label>`,
  `<label className="block text-sm font-bold text-white uppercase tracking-wider mb-2">{uploadMode === 'lulu' ? 'Lulu Stream Embed Code or URL' : 'Good Stream Embed Code or URL'}</label>`
);

code = code.replace(
  `placeholder='<iframe src="https://luluvdo.com/e/anrkww78l6w8" ...></iframe>'`,
  `placeholder={uploadMode === 'lulu' ? '<iframe src="https://luluvdo.com/e/anrkww78l6w8" ...></iframe>' : '<iframe src="https://goodstream.com/embed/..." ...></iframe>'}`
);

fs.writeFileSync('src/pages/UploadPage.tsx', code);
console.log("Patched successfully");

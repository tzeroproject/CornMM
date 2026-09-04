const fs = require('fs');

let code = fs.readFileSync('src/pages/UploadPage.tsx', 'utf8');

// 1. Add state for upload type and embed URL
if (!code.includes('uploadMode')) {
  code = code.replace(
    'const [selectedFile, setSelectedFile] = useState<File | null>(null);',
    'const [selectedFile, setSelectedFile] = useState<File | null>(null);\n  const [uploadMode, setUploadMode] = useState<"file" | "embed">("file");\n  const [embedUrl, setEmbedUrl] = useState("");'
  );
}

// 2. Add tabs in UI
const tabsUI = `
      {/* Upload Mode Switcher */}
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
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
`;

code = code.replace(
  '<form onSubmit={handleSubmit} className="space-y-6">',
  tabsUI
);

// 3. Conditional rendering of File Upload vs Embed URL
const fileUploadBlock = `<div
          className={\`
            border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer
`;

const newUploadBlock = `
        {uploadMode === 'file' ? (
          <div
          className={\`
            border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer
`;

// Find where the file upload block ends. 
// It ends right before "Title" input.
const fileUploadEnd = `      {/* Form Fields */}`;

code = code.replace(fileUploadBlock, newUploadBlock);
code = code.replace(
  fileUploadEnd,
  `
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-[#0a0a0a] border border-white/10 space-y-4">
            <label className="block text-sm font-bold text-white uppercase tracking-wider mb-2">Embed Code or URL</label>
            <textarea
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              placeholder='<iframe src="https://luluvdo.com/e/anrkww78l6w8" ...></iframe>'
              className="w-full h-32 px-4 py-3 rounded-xl bg-black border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            <p className="text-xs text-zinc-400">Paste an iframe code or direct embed URL from a third-party streaming site.</p>
          </div>
        )}

      {/* Form Fields */}`
);

// 4. Update validation in handleSubmit
const oldValidation = `
    if (!selectedFile && !autoFallback) {
      showToast({ type: 'warning', title: 'Missing Video', message: 'Please select a video file to upload.' });
      return;
    }
`;

const newValidation = `
    if (uploadMode === 'file' && !selectedFile && !autoFallback) {
      showToast({ type: 'warning', title: 'Missing Video', message: 'Please select a video file to upload.' });
      return;
    }
    if (uploadMode === 'embed' && !embedUrl) {
      showToast({ type: 'warning', title: 'Missing Embed', message: 'Please provide an embed code.' });
      return;
    }
`;

code = code.replace(oldValidation, newValidation);

// 5. Update performUpload logic
const performUploadCode = `
    try {
      if (uploadMode === 'embed') {
        setUploadStep('done');
        let finalEmbedUrl = embedUrl;
        const srcMatch = embedUrl.match(/src=["'](.*?)["']/);
        if (srcMatch && srcMatch[1]) {
          finalEmbedUrl = srcMatch[1];
        }

        await videoService.createVideo({
          title,
          description,
          category_id: categoryId,
          tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
          visibility,
          is_age_restricted: isAgeRestricted,
          allow_comments: allowComments,
          creator_id: user?.id,
          // Generic embed setup
          bunny_video_id: 'embed',
          video_url: finalEmbedUrl,
          playback_url: finalEmbedUrl,
          thumbnail_url: 'https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=800&auto=format&fit=crop&q=80',
          duration: 0,
          moderation_status: 'published' // Auto publish for embeds since it's admin/external
        });
        
        showToast({ type: 'success', title: 'Embed Successful', message: 'Your video embed was published.' });
        navigate('/');
        return;
      }
`;

code = code.replace(
  'const performUpload = async (forceFallback = false) => {\n    if (!user) return;\n    setIsUploading(true);\n    setBunnyError(null);\n\n    try {',
  'const performUpload = async (forceFallback = false) => {\n    if (!user) return;\n    setIsUploading(true);\n    setBunnyError(null);\n' + performUploadCode
);


fs.writeFileSync('src/pages/UploadPage.tsx', code);
console.log("Patched UploadPage.tsx");

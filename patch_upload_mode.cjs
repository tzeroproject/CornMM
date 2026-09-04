const fs = require('fs');
let code = fs.readFileSync('src/pages/UploadPage.tsx', 'utf8');

const oldBlock = `        {/* Drag & Drop File Zone */}
        {!selectedFile ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={\`border border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all \${
              isDragging
                ? 'border-amber-400 bg-amber-500/10'
                : 'border-white/10 hover:border-white/20 bg-[#0a0a0a] hover:bg-[#0e0e0e]'
            }\`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
              onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
              className="hidden"
            />
            <div className="w-16 h-16 rounded-2xl bg-[#141414] border border-white/10 text-amber-400 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-base text-white">Select or Drag video file here</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Supports MP4, WebM, MOV, or MKV up to 1GB
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#161616] border border-white/10 text-[11px] font-mono text-zinc-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Auto-transcoded to 1080p, 720p & 480p HLS
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                <FileVideo className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-200">{selectedFile.name}</p>
                <p className="text-[10px] text-zinc-500">
                  {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB • Ready for Bunny upload
                </p>
              </div>
            </div>
            {!isUploading && (
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}`;

const newBlock = `        {/* Upload Mode conditional rendering */}
        {uploadMode === 'file' ? (
          !selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={\`border border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all \${
                isDragging
                  ? 'border-amber-400 bg-amber-500/10'
                  : 'border-white/10 hover:border-white/20 bg-[#0a0a0a] hover:bg-[#0e0e0e]'
              }\`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-2xl bg-[#141414] border border-white/10 text-amber-400 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-base text-white">Select or Drag video file here</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Supports MP4, WebM, MOV, or MKV up to 1GB
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#161616] border border-white/10 text-[11px] font-mono text-zinc-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Auto-transcoded to 1080p, 720p & 480p HLS
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <FileVideo className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-200">{selectedFile.name}</p>
                  <p className="text-[10px] text-zinc-500">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB • Ready for Bunny upload
                  </p>
                </div>
              </div>
              {!isUploading && (
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )
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
        )}`;

code = code.replace(oldBlock, newBlock);
fs.writeFileSync('src/pages/UploadPage.tsx', code);
console.log("Patched correctly");

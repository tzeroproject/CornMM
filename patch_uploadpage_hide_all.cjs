const fs = require('fs');
let content = fs.readFileSync('src/pages/UploadPage.tsx', 'utf8');

const oldSwitcher = `{/* Upload Mode Switcher */}
      <div className="flex bg-[#0a0a0a] border border-white/10 rounded-xl p-1 mb-6">
        <button
          type="button"
          onClick={() => setUploadMode('bunny')}
          className={\`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors \${uploadMode === 'bunny' ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-400 hover:text-white'}\`}
        >
          Bunny Stream
        </button>
        {isAdmin && (
          <>
            <button
              type="button"
              onClick={() => setUploadMode('lulu')}
              className={\`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors \${uploadMode === 'lulu' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:text-white'}\`}
            >
              Lulu Stream
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('uqload')}
              className={\`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors \${uploadMode === 'uqload' ? 'bg-purple-500/20 text-purple-400' : 'text-zinc-400 hover:text-white'}\`}
            >
              Uqload Stream
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('good')}
              className={\`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors \${uploadMode === 'good' ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-400 hover:text-white'}\`}
            >Any Embed Link</button>
          </>
        )}
      </div>`;

const newSwitcher = `{/* Upload Mode Switcher */}
      {isAdmin && (
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
            onClick={() => setUploadMode('uqload')}
            className={\`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors \${uploadMode === 'uqload' ? 'bg-purple-500/20 text-purple-400' : 'text-zinc-400 hover:text-white'}\`}
          >
            Uqload Stream
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('good')}
            className={\`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors \${uploadMode === 'good' ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-400 hover:text-white'}\`}
          >
            Any Embed Link
          </button>
        </div>
      )}`;

if (content.includes(oldSwitcher)) {
  content = content.replace(oldSwitcher, newSwitcher);
  fs.writeFileSync('src/pages/UploadPage.tsx', content);
  console.log("UploadPage mode switcher hidden completely for non-admins");
} else {
  console.log("Could not find the exact oldSwitcher string");
}

const fs = require('fs');
let content = fs.readFileSync('src/pages/UploadPage.tsx', 'utf8');

// Revert the previous `{isAdmin && (` wrapper around the entire switcher
content = content.replace(
  '{/* Upload Mode Switcher */}\n      {isAdmin && (\n        <div className="flex bg-[#0a0a0a] border border-white/10 rounded-xl p-1 mb-6">',
  '{/* Upload Mode Switcher */}\n      <div className="flex bg-[#0a0a0a] border border-white/10 rounded-xl p-1 mb-6">'
);

// Revert the closing `)}` of the previous wrapper
content = content.replace(
  '<button\n          type="button"\n          onClick={() => setUploadMode(\'good\')}\n          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${uploadMode === \'good\' ? \'bg-blue-500/20 text-blue-400\' : \'text-zinc-400 hover:text-white\'}`}\n        >Any Embed Link</button>\n      </div>\n      )}',
  '<button\n          type="button"\n          onClick={() => setUploadMode(\'good\')}\n          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${uploadMode === \'good\' ? \'bg-blue-500/20 text-blue-400\' : \'text-zinc-400 hover:text-white\'}`}\n        >Any Embed Link</button>\n      </div>'
);

// Now wrap ONLY the three buttons
const oldButtons = `<button
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
        >Any Embed Link</button>`;

const newButtons = `{isAdmin && (
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
        )}`;

content = content.replace(oldButtons, newButtons);

// Make sure that if a non-admin somehow ends up with a restricted mode, we reset it to bunny
// In useEffect
const authEffect = `  useEffect(() => {
    if (!isAdmin && uploadMode !== 'bunny') {
      setUploadMode('bunny');
    }
  }, [isAdmin, uploadMode]);`;

content = content.replace('  // Form Fields', authEffect + '\n\n  // Form Fields');


fs.writeFileSync('src/pages/UploadPage.tsx', content);
console.log("UploadPage patched perfectly for buttons");

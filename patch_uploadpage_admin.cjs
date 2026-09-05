const fs = require('fs');
let content = fs.readFileSync('src/pages/UploadPage.tsx', 'utf8');

// Add isAdmin to useAuth destructuring
content = content.replace(
  'const { user } = useAuth();',
  'const { user, isAdmin } = useAuth();'
);

// Wrap Upload Mode Switcher with isAdmin check
content = content.replace(
  '{/* Upload Mode Switcher */}\n      <div className="flex bg-[#0a0a0a] border border-white/10 rounded-xl p-1 mb-6">',
  '{/* Upload Mode Switcher */}\n      {isAdmin && (\n        <div className="flex bg-[#0a0a0a] border border-white/10 rounded-xl p-1 mb-6">'
);

content = content.replace(
  '<button\n          type="button"\n          onClick={() => setUploadMode(\'good\')}\n          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${uploadMode === \'good\' ? \'bg-blue-500/20 text-blue-400\' : \'text-zinc-400 hover:text-white\'}`}\n        >Any Embed Link</button>\n      </div>',
  '<button\n          type="button"\n          onClick={() => setUploadMode(\'good\')}\n          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${uploadMode === \'good\' ? \'bg-blue-500/20 text-blue-400\' : \'text-zinc-400 hover:text-white\'}`}\n        >Any Embed Link</button>\n      </div>\n      )}'
);

// Also reset uploadMode to 'bunny' if they somehow load the page and are not admin.
// Actually it defaults to 'bunny'. But let's add a useEffect just in case, though it's not strictly necessary.

fs.writeFileSync('src/pages/UploadPage.tsx', content);
console.log("UploadPage patched with isAdmin restriction");

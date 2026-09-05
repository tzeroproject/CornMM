const fs = require('fs');
let content = fs.readFileSync('src/pages/LoginPage.tsx', 'utf8');

const targetContent = `        {/* Administrator Quick Account Card */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" />
              Demo Access
            </h3>
            <button
              type="button"
              onClick={fillAdminCredentials}
              className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 underline cursor-pointer"
            >
              Fill Cadmin Info
            </button>
          </div>
          <div className="text-[11px] text-zinc-400 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono">
            <span>Username: <strong className="text-zinc-200">Cadmin</strong></span>
            <span>Password: <strong className="text-zinc-200">Cadmin@123</strong></span>
          </div>
        </div>`;

if (content.includes(targetContent)) {
  content = content.replace(targetContent, '');
  fs.writeFileSync('src/pages/LoginPage.tsx', content);
  console.log("Removed Quick Account Card");
} else {
  console.log("Not found Quick Account Card exactly. Will use regex or index.");
  
  const start = content.indexOf('{/* Administrator Quick Account Card */}');
  const end = content.indexOf('<div>', start);
  
  if (start !== -1 && end !== -1) {
    content = content.substring(0, start) + content.substring(end);
    fs.writeFileSync('src/pages/LoginPage.tsx', content);
    console.log("Removed Quick Account Card via index");
  }
}

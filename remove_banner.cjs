const fs = require('fs');

let content = fs.readFileSync('src/pages/HomePage.tsx', 'utf8');

const targetContent = `      {/* Trust & Safety Assurance Banner */}
      <div className="p-6 rounded-2xl bg-gradient mx-3 sm:mx-0-to-r from-[#0d0d0d] via-[#090909] to-[#050505] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white">Lawful & Consensual Video Platform</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xl leading-relaxed">
              StreamSphere enforces rigorous intellectual property protections, anti-piracy controls, and zero tolerance for non-consensual imagery. All uploads undergo Bunny transcoding and moderation review.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/guidelines"
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#161616] hover:bg-[#202020] border border-white/10 text-zinc-200 transition-colors"
          >
            Guidelines
          </Link>
          <Link
            to="/dmca"
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#161616] hover:bg-[#202020] border border-white/10 text-zinc-200 transition-colors"
          >
            DMCA Policy
          </Link>
        </div>
      </div>`;

if (content.includes(targetContent)) {
  content = content.replace(targetContent, '');
  fs.writeFileSync('src/pages/HomePage.tsx', content);
  console.log("Removed Banner");
} else {
  console.log("Could not find exact text match");
}

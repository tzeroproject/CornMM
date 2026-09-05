const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Navbar.tsx', 'utf8');

// Add search button for mobile right before the Upload button
content = content.replace(
  '{/* Upload Button */}',
  `{/* Mobile Search Button */}
        <Link
          to="/search"
          className="md:hidden p-2 text-zinc-400 hover:text-zinc-100 hover:bg-white/5 rounded-lg transition-colors"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </Link>
        {/* Upload Button */}`
);

// We should also change "cornmm" to "StreamSphere" based on the user's prompt text "StreamSphere video website"
content = content.replace(
  '<span className="font-editorial italic font-semibold text-lg tracking-wide text-white group-hover:text-amber-400 transition-colors">\n              cornmm\n            </span>',
  '<span className="font-editorial italic font-semibold text-lg tracking-wide text-white group-hover:text-amber-400 transition-colors">\n              StreamSphere\n            </span>'
);

// The user prompt also says "Profile/login button" at the top right. Currently there is no login button if they are logged out.
// Wait, currently if !user, it returns `null` for that section.
// Let's replace `{user ? ... : null}` with `{user ? ... : <Link to="/corn-admin-login" className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"><User className="w-5 h-5" /></Link>}`
content = content.replace(
  '        ) : null}',
  '        ) : (\n          <Link\n            to="/corn-admin-login"\n            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"\n            title="Log In"\n          >\n            <User className="w-5 h-5" />\n          </Link>\n        )}'
);

fs.writeFileSync('src/components/layout/Navbar.tsx', content);
console.log('Navbar patched');

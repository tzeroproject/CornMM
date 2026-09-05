const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboardPage.tsx', 'utf8');

const target = `  if (!isAdmin) {
    return (
      <div className="py-20 max-w-lg mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white font-editorial italic">Administrator Access Required</h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          The StreamSphere Admin Suite and Moderation Queue is strictly restricted to platform administrators with verified RBAC privileges.
        </p>
        <div className="pt-2">
          <Link
            to="/corn-admin-login"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all"
          >
            Sign In with Administrator Account
          </Link>
        </div>
      </div>
    );
  }`;

if (content.includes(target)) {
  // we also need to ensure Navigate is imported from react-router-dom
  if (!content.includes('Navigate')) {
    content = content.replace("import { Link } from 'react-router-dom';", "import { Link, Navigate } from 'react-router-dom';");
  }
  content = content.replace(target, `  if (!isAdmin) {
    return <Navigate to="/corn-admin-login" replace />;
  }`);
  fs.writeFileSync('src/pages/AdminDashboardPage.tsx', content);
  console.log("Patched AdminDashboardPage successfully");
} else {
  console.log("Could not find the target string.");
}

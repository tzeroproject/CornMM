const fs = require('fs');

// Patch UploadPage.tsx
let uploadPage = fs.readFileSync('src/pages/UploadPage.tsx', 'utf8');

// Remove the `if (!user)` block inside performUpload
uploadPage = uploadPage.replace(
  /if \(!user\) \{\s*showToast\(\{[^}]*\}\);\s*navigate\('\/corn-admin-login'\);\s*return;\s*\}/g,
  ''
);

// Fallback creator_id for anonymous uploads
uploadPage = uploadPage.replace(
  /creator_id:\s*user\.id,/g,
  "creator_id: user?.id || 'anonymous_user',"
);

// Ensure moderation_status remains published for anonymous if they want auto-approve
// The prompt said: "approve system ကိုဖျက်ထားပေးပါ" -> "approve system" is usually moderation_status: 'published'.
// The current code actually sets moderation_status: 'published' in uploadPage.tsx (I saw it earlier in the previous log). Let's verify.
fs.writeFileSync('src/pages/UploadPage.tsx', uploadPage);
console.log("UploadPage patched for anonymous upload");

// Patch Navbar.tsx
let navbar = fs.readFileSync('src/components/layout/Navbar.tsx', 'utf8');
navbar = navbar.replace(/\{user && \(\s*(<Link\s*to="\/upload"[\s\S]*?<\/Link>)\s*\)\}/g, '$1');
fs.writeFileSync('src/components/layout/Navbar.tsx', navbar);
console.log("Navbar patched");

// Patch Sidebar.tsx
let sidebar = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');
const uploadLinkRegex = /<NavLink to="\/upload"[^>]*>[\s\S]*?<\/NavLink>/;
const uploadLinkMatch = sidebar.match(uploadLinkRegex);
if (uploadLinkMatch) {
  // Remove from the Creator block
  sidebar = sidebar.replace(uploadLinkRegex, '');
  // Insert into the main navigation block (after Categories)
  sidebar = sidebar.replace(
    /(<NavLink to="\/categories"[^>]*>[\s\S]*?<\/NavLink>)/,
    '$1\n              ' + uploadLinkMatch[0]
  );
  fs.writeFileSync('src/components/layout/Sidebar.tsx', sidebar);
  console.log("Sidebar patched");
}

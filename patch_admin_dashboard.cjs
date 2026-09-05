const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboardPage.tsx', 'utf8');

// Set default active tab to 'reports'
content = content.replace(
  "const [activeTab, setActiveTab] = useState<'moderation' | 'reports' | 'audit'>('moderation');",
  "const [activeTab, setActiveTab] = useState<'reports' | 'audit'>('reports');"
);

// We should just use standard replace or regex for removing chunks if they exist.
// Removing pendingVideos state
content = content.replace("const [pendingVideos, setPendingVideos] = useState<Video[]>([]);\n", "");

// Removing pendingVideos fetch in loadData
content = content.replace("const pendingRes = await adminService.getPendingVideos();", "");
content = content.replace("setPendingVideos(pendingRes);\n", "");

// Removing stats updates
content = content.replace("pendingVideos: pendingRes.length,", "");

// Removing handlers
const handlersRegex = /const handleApproveVideo[\s\S]*?const handleRejectVideo[\s\S]*?message: e\.message \}\);\n    \}\n  \};/m;
content = content.replace(handlersRegex, "");

// Removing moderation tab button
const modButtonRegex = /<button\s*onClick=\{\(\) => setActiveTab\('moderation'\)\}[\s\S]*?Review Queue.*?<\/button>/m;
content = content.replace(modButtonRegex, "");

// Removing moderation tab content
const modContentRegex = /\{\/\* Tab 1: Moderation Queue \*\/\}\s*\{activeTab === 'moderation' && \([\s\S]*?\}\)\s*<\/div>\s*\)\}/m;
content = content.replace(modContentRegex, "");

// Removing pending card from overview
const pendingCardRegex = /<div className="bg-\[\#0a0a0a\] border border-white\/10 rounded-2xl p-5">[\s\S]*?Pending Streams[\s\S]*?<\/div>/m;
content = content.replace(pendingCardRegex, "");

fs.writeFileSync('src/pages/AdminDashboardPage.tsx', content);
console.log("AdminDashboard patched");

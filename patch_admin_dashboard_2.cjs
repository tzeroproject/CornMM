const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboardPage.tsx', 'utf8');
content = content.replace('adminService.getReportedContent()', 'adminService.getReports()');
fs.writeFileSync('src/pages/AdminDashboardPage.tsx', content);
console.log("Admin dashboard patched");

const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboardPage.tsx', 'utf8');

if (!content.includes('const [pendingVideos')) {
  content = content.replace(
    'const [reports, setReports] = useState<Report[]>([]);',
    'const [pendingVideos, setPendingVideos] = useState<Video[]>([]);\n  const [reports, setReports] = useState<Report[]>([]);'
  );
}

content = content.replace(/      const \\\[st, pv, rep, al\\\] = await Promise\\.all\\(\\[\\s+adminService\\.getStats\\(\\),\\s+adminService\\.getReports\\(\\),\\s+adminService\\.getAuditLogs\\(\\),\\s+\\]\\);/g, 
"      const [st, pv, rep, al] = await Promise.all([\\n        adminService.getStats(),\\n        adminService.getPendingVideos(),\\n        adminService.getReports(),\\n        adminService.getAuditLogs(),\\n      ]);");

content = content.replace(/      setStats\\(st\\);\\s+setReports\\(rep\\);/g, 
"      setStats(st);\\n      setPendingVideos(pv);\\n      setReports(rep);");

content = content.replace(/        const \\\[st, pv, rep, logs\\\] = await Promise\\.all\\(\\[\\s+adminService\\.getDashboardStats\\(\\),\\s+adminService\\.getReports\\(\\),\\s+adminService\\.getAuditLogs\\(\\),\\s+\\]\\);/g, 
"        const [st, pv, rep, logs] = await Promise.all([\\n          adminService.getDashboardStats(),\\n          adminService.getPendingVideos(),\\n          adminService.getReports(),\\n          adminService.getAuditLogs(),\\n        ]);");

content = content.replace(/        setStats\\(st\\);\\s+setReports\\(rep\\);/g, 
"        setStats(st);\\n        setPendingVideos(pv);\\n        setReports(rep);");

fs.writeFileSync('src/pages/AdminDashboardPage.tsx', content);
console.log("Patched again");

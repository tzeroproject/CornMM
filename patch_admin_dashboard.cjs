const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboardPage.tsx', 'utf8');

const target1 = `      const [st, pv, rep, al] = await Promise.all([
        adminService.getStats(),
        
        adminService.getReports(),
        adminService.getAuditLogs(),
      ]);
      setStats(st);
      
      setReports(rep);
      setAuditLogs(al);`;

const rep1 = `      const [st, pv, rep, al] = await Promise.all([
        adminService.getStats(),
        adminService.getPendingVideos(),
        adminService.getReports(),
        adminService.getAuditLogs(),
      ]);
      setStats(st);
      setPendingVideos(pv);
      setReports(rep);
      setAuditLogs(al);`;

content = content.replace(target1, rep1);

const target2 = `        const [st, pv, rep, logs] = await Promise.all([
          adminService.getDashboardStats(),
          
          adminService.getReports(),
          adminService.getAuditLogs(),
        ]);
        setStats(st);
        
        setReports(rep);
        setAuditLogs(logs);`;

const rep2 = `        const [st, pv, rep, logs] = await Promise.all([
          adminService.getDashboardStats(),
          adminService.getPendingVideos(),
          adminService.getReports(),
          adminService.getAuditLogs(),
        ]);
        setStats(st);
        setPendingVideos(pv);
        setReports(rep);
        setAuditLogs(logs);`;

content = content.replace(target2, rep2);

fs.writeFileSync('src/pages/AdminDashboardPage.tsx', content);
console.log("Patched correctly");

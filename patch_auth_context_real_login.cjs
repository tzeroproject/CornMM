const fs = require('fs');
let content = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

const targetStr = `      // Bypass for 'cadmin' or 'admin@streamsphere.tv' local testing
      if (cleanIdentifier === 'cadmin' || cleanIdentifier === 'admin@streamsphere.tv') {
        if (pass !== 'cadmin@123') {
          showToast({ type: 'error', title: 'Authentication Failed', message: 'Incorrect password.' });
          return false;
        }
        
        const dummyAdminProfile = {
          id: '00000000-0000-0000-0000-000000000001',
          username: 'Cadmin',
          display_name: 'System Admin',
          avatar_url: 'https://ui-avatars.com/api/?name=Admin&background=10b981&color=fff',
          role: 'admin',
          is_verified: true,
          is_suspended: false,
          subscriber_count: 99999,
          total_views: 9999999,
          created_at: new Date().toISOString()
        };
        setUser(dummyAdminProfile);
        localStorage.setItem('streamsphere_production_user_v2', JSON.stringify(dummyAdminProfile));
        showToast({ type: 'success', title: 'Admin Mode', message: 'Logged in via demo admin bypass.' });
        return true;
      }`;

const repStr = `      // If 'cadmin', map to the real admin email
      if (cleanIdentifier === 'cadmin') {
        cleanIdentifier = 'admin@streamsphere.tv';
      }`;

content = content.replace(targetStr, repStr);
fs.writeFileSync('src/context/AuthContext.tsx', content);
console.log("Patched AuthContext.tsx for real login");

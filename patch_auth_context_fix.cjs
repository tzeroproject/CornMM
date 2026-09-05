const fs = require('fs');
let content = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

// I inserted the bypass logic in the wrong place earlier.
// Let's remove it from `initAuth`
const bypassToRemove = `      // Bypass for 'cadmin' or 'admin@streamsphere.tv' local testing
      if (cleanIdentifier === 'cadmin' || cleanIdentifier === 'admin@streamsphere.tv') {
        const dummyAdminProfile = {
          id: 'admin-12345',
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
      }
`;

content = content.replace(bypassToRemove, '');

// And add it inside `signIn`
const targetStr = `  const signIn = async (identifier: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      let cleanIdentifier = identifier.trim().toLowerCase();

`;

const replacementStr = `  const signIn = async (identifier: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      let cleanIdentifier = identifier.trim().toLowerCase();

      // Bypass for 'cadmin' or 'admin@streamsphere.tv' local testing
      if (cleanIdentifier === 'cadmin' || cleanIdentifier === 'admin@streamsphere.tv') {
        const dummyAdminProfile = {
          id: 'admin-12345',
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
      }

`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('src/context/AuthContext.tsx', content);
console.log("Fixed the auth context bug.");

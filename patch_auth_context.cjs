const fs = require('fs');
let content = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

// Remove CADMIN_ACCOUNT definition
const cadminDef = `export const CADMIN_ACCOUNT = {
  username: 'Cadmin',
  email: 'cadmin@streamsphere.tv',
  password: 'Cadmin@123',
  profile: {
    id: '00000000-0000-0000-0000-000000000001',
    username: 'Cadmin',
    display_name: 'corn admin',
    avatar_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    role: 'admin' as const,
    is_verified: true,
    is_suspended: false,
    subscriber_count: 52400,
    total_views: 1250000,
    bio: 'Platform System Administrator & Content Moderation Lead. Full RBAC clearance.',
    created_at: '2024-01-01T00:00:00Z',
  },
};`;

if (content.includes(cadminDef)) {
  content = content.replace(cadminDef, '');
}

// Remove the bypass block in signIn
const bypassBlock = `      // Map 'cadmin' to the actual email for Supabase auth
      if (
        cleanIdentifier === 'cadmin' ||
        cleanIdentifier === 'cadmin@streamsphere.tv' ||
        cleanIdentifier === 'cadmin@admin.com'
      ) {
        cleanIdentifier = 'cadmin@streamsphere.tv';
        // If Supabase is NOT configured, allow bypass. Otherwise, fall through to Supabase auth
        if (!isSupabaseConfigured) {
          if (pass === CADMIN_ACCOUNT.password) {
            setUser(CADMIN_ACCOUNT.profile);
            localStorage.setItem('streamsphere_production_user_v2', JSON.stringify(CADMIN_ACCOUNT.profile));
            showToast({
              type: 'success',
              title: 'Administrator Access Granted',
              message: 'Signed in as Administrator Cadmin. Full moderation clearance active.',
            });
            return true;
          } else {
            showToast({ type: 'error', title: 'Authentication Failed', message: 'Incorrect password.' });
            return false;
          }
        }
      }`;

if (content.includes(bypassBlock)) {
  content = content.replace(bypassBlock, '');
}

fs.writeFileSync('src/context/AuthContext.tsx', content);
console.log("Patched AuthContext.tsx");

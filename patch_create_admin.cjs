const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function run() {
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  let adminUser = users.find(u => u.email === 'cadmin@streamsphere.tv');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: adminUser.id,
      username: 'cadmin', // Changed to lowercase, since login often uses lowercase or the app uses lowercase matching, wait we'll see
      display_name: 'System Admin',
      role: 'admin',
      avatar_url: 'https://ui-avatars.com/api/?name=Admin&background=10b981&color=fff',
      is_verified: true,
      subscriber_count: 99999,
      total_views: 9999999,
      updated_at: new Date().toISOString()
    });

  if (profileError) {
    console.error('Error updating profile:', profileError);
  } else {
    console.log('Profile configured successfully as admin.');
  }
}
run();

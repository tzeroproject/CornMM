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

  if (!adminUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'cadmin@streamsphere.tv',
      password: 'cadmin@123',
      email_confirm: true
    });
    if (error) {
      console.error(error);
      return;
    }
    adminUser = data.user;
    console.log('Created auth user:', adminUser.id);
  } else {
    console.log('Auth user already exists:', adminUser.id);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: adminUser.id,
      email: 'cadmin@streamsphere.tv',
      username: 'Cadmin',
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

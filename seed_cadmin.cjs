const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const adminId = '00000000-0000-0000-0000-000000000001';
  
  // 1. First, create the user in GoTrue (auth.users)
  console.log("Creating user in auth.users...");
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'admin@streamsphere.tv',
    password: 'cadmin@123',
    email_confirm: true,
  });

  if (authError) {
    console.error("Auth creation error:", authError);
    // If it already exists, let's try to find it. But we specified no UUID in creation. 
    // Wait, you can't specify UUID on creation? Actually, we might be able to, but let's just create one and use its ID!
  } else {
    console.log("Created auth user:", authData.user.id);
    
    // 2. Now update the profile with admin details
    const { data, error } = await supabase.from('profiles').upsert({
      id: authData.user.id,
      username: 'Cadmin',
      display_name: 'System Admin',
      avatar_url: 'https://ui-avatars.com/api/?name=Admin&background=10b981&color=fff',
      role: 'admin',
      is_verified: true,
      is_suspended: false,
      subscriber_count: 99999,
      total_views: 9999999,
    });
    
    if (error) {
      console.error("Error updating profile:", error);
    } else {
      console.log("Cadmin successfully seeded in DB with real auth ID!", authData.user.id);
    }
  }
}

seed();

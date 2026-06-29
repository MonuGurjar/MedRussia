require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setSuperAdmin() {
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }
  
  const user = usersData.users.find(u => 
    u.email === 'monu.gurjar@example.com' || 
    u.email === process.env.VITE_ADMIN_EMAIL ||
    (u.user_metadata && u.user_metadata.full_name && u.user_metadata.full_name.toLowerCase().includes('monu'))
  );

  if (!user) {
    console.log('User Monu Gurjar not found! Here are the users:');
    console.log(usersData.users.map(u => ({ email: u.email, name: u.user_metadata?.full_name, role: u.app_metadata?.role })));
    return;
  }

  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: { role: 'super_admin' }
  });

  if (error) {
    console.error('Error updating role:', error);
  } else {
    console.log(`Successfully updated ${user.email} to super_admin!`);
  }
}

setSuperAdmin();

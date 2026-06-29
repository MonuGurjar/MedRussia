import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    acc[match[1]] = val;
  }
  return acc;
}, {});

const supabase = createClient(
  env.SUPABASE_URL || env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function setSuperAdmin() {
  const emailArgs = process.argv.slice(2);
  const targetEmail = emailArgs.length > 0 ? emailArgs[0] : null;

  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }
  
  let user;
  if (targetEmail) {
    user = usersData.users.find(u => u.email.toLowerCase() === targetEmail.toLowerCase());
  } else {
    console.log('No email provided. Searching for "monu" or default admin email...');
    user = usersData.users.find(u => 
      (env.VITE_ADMIN_EMAIL && u.email.toLowerCase() === env.VITE_ADMIN_EMAIL.toLowerCase()) ||
      (u.user_metadata && u.user_metadata.full_name && u.user_metadata.full_name.toLowerCase().includes('monu'))
    );
  }

  if (!user) {
    if (targetEmail) {
      console.log(`User with email ${targetEmail} not found!`);
    } else {
      console.log('Target user not found! Please provide an email argument.');
    }
    console.log('\nHere are all registered users:');
    console.log(usersData.users.map(u => ({ email: u.email, name: u.user_metadata?.full_name, role: u.app_metadata?.role })));
    return;
  }

  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: { role: 'super_admin' }
  });

  if (error) {
    console.error('Error updating role:', error);
  } else {
    console.log(`✅ Successfully updated ${user.email} to super_admin!`);
    console.log(`They can now log in and access the admin dashboard.`);
  }
}

setSuperAdmin();

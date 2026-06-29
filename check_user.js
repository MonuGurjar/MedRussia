import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://bvkkcsbksrvbyxmfargy.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2a2tjc2Jrc3J2Ynl4bWZhcmd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU3NDQ3OSwiZXhwIjoyMDk4MTUwNDc5fQ.xo0ji5M3K9P5EM4PbwbVmqCzbr8o_maNoRjKToQq-DM";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  const user = users.find(u => u.email === 'admin@medrussia.com');
  if (user) {
    console.log('User found:', user.email);
    console.log('App Metadata:', user.app_metadata);
    console.log('User Metadata:', user.user_metadata);
  } else {
    console.log('User not found!');
  }
}
check();

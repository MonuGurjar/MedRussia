import { checkRateLimit, apiLimiter } from '../ratelimit';
import { withAuth, AuthUser } from '../../src/lib/apiAuth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const ALLOWED_ROLES = ['student', 'staff', 'manager', 'admin', 'super_admin'];

async function roleHandler(request: any, response: any, userAuth: AuthUser) {
  if (request.method !== 'PUT') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const rateLimitResult = await checkRateLimit(request, apiLimiter);
  if (!rateLimitResult.success) {
    return response.status(429).json({ error: 'Too many requests, please try again later.' });
  }

  // Only super_admin can change roles
  if (userAuth.role !== 'super_admin') {
    return response.status(403).json({ error: 'Forbidden: Only super_admin can modify roles' });
  }

  const { targetUserId, newRole } = request.body;

  if (!targetUserId || !newRole) {
    return response.status(400).json({ error: 'targetUserId and newRole are required' });
  }

  if (!ALLOWED_ROLES.includes(newRole)) {
    return response.status(400).json({ error: 'Invalid role specified' });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      app_metadata: { role: newRole }
    });

    if (error) {
      console.error('Supabase Admin API Error:', error);
      return response.status(500).json({ error: 'Failed to update user role in Supabase' });
    }

    return response.status(200).json({ success: true, message: `User role updated to ${newRole}` });
  } catch (error: any) {
    console.error('Role Update API Error:', error);
    return response.status(500).json({ error: error.message });
  }
}

export default withAuth(roleHandler);

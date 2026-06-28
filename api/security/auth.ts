import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ROLE_VALUES, type Role } from './roles';
import { getSupabaseAdminClient } from '../lib/supabase';

export type AuthContext = {
  userId: string;
  role: Role;
  email?: string;
};

function getBearerToken(req: VercelRequest): string | null {
  const auth = req.headers.authorization;
  if (!auth || typeof auth !== 'string') return null;
  const [scheme, token] = auth.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

async function parseAuthContext(req: VercelRequest): Promise<AuthContext | null> {
  const token = getBearerToken(req);
  if (!token) return null;

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;

    const user = data.user;
    const role = (user.user_metadata?.role || user.app_metadata?.role || 'Student') as string;
    if (!ROLE_VALUES.includes(role as Role)) return null;

    return {
      userId: user.id,
      role: role as Role,
      email: user.email,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(req: VercelRequest, res: VercelResponse): Promise<AuthContext | null> {
  const auth = await parseAuthContext(req);
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return auth;
}

export async function requireRole(
  req: VercelRequest,
  res: VercelResponse,
  allowedRoles: Role[]
): Promise<AuthContext | null> {
  const auth = await requireAuth(req, res);
  if (!auth) return null;

  if (!allowedRoles.includes(auth.role)) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }

  return auth;
}

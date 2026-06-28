import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ROLE_VALUES, type Role } from './roles';

export type AuthContext = {
  userId: string;
  role: Role;
};

export function parseAuthContext(req: VercelRequest): AuthContext | null {
  const userId = req.headers['x-user-id'];
  const role = req.headers['x-user-role'];

  if (typeof userId !== 'string' || typeof role !== 'string') return null;
  if (!ROLE_VALUES.includes(role as Role)) return null;

  return { userId, role: role as Role };
}

export function requireAuth(req: VercelRequest, res: VercelResponse): AuthContext | null {
  const auth = parseAuthContext(req);
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return auth;
}

export function requireRole(
  req: VercelRequest,
  res: VercelResponse,
  allowedRoles: Role[]
): AuthContext | null {
  const auth = requireAuth(req, res);
  if (!auth) return null;

  if (!allowedRoles.includes(auth.role)) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }

  return auth;
}

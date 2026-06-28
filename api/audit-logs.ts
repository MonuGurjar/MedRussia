import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { requireRole } from './security/auth';
import { queryAuditLogs } from './models/auditLog';
import { ROLES } from './security/roles';

const QuerySchema = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  status: z.enum(['success', 'failed']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const auth = await requireRole(req, res, [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.MANAGER,
  ]);
  if (!auth) return;

  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid query', details: parsed.error.flatten() });
  }

  const { userId, action, status, from, to, limit } = parsed.data;

  const logs = await queryAuditLogs({
    userId,
    action,
    status,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    limit,
  });

  return res.status(200).json({
    count: logs.length,
    filters: { userId, action, status, from, to, limit: limit || 100 },
    logs,
  });
}

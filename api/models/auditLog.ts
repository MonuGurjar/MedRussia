import { getCollection } from '../lib/mongodb';
import type { AuditLogRecord } from './types';

export async function createAuditLog(record: Omit<AuditLogRecord, 'createdAt'>): Promise<AuditLogRecord> {
  const saved: AuditLogRecord = {
    ...record,
    createdAt: new Date(),
  };

  const col = await getCollection<AuditLogRecord>('audit_logs');
  await col.insertOne(saved as any);
  return saved;
}

export async function queryAuditLogs(params: {
  userId?: string;
  action?: string;
  status?: 'success' | 'failed';
  from?: Date;
  to?: Date;
  limit?: number;
}): Promise<AuditLogRecord[]> {
  const col = await getCollection<AuditLogRecord>('audit_logs');

  const query: Record<string, any> = {};
  if (params.userId) query.userId = params.userId;
  if (params.action) query.action = params.action;
  if (params.status) query.status = params.status;
  if (params.from || params.to) {
    query.createdAt = {};
    if (params.from) query.createdAt.$gte = params.from;
    if (params.to) query.createdAt.$lte = params.to;
  }

  const limit = Math.min(Math.max(params.limit || 100, 1), 500);
  return col.find(query).sort({ createdAt: -1 }).limit(limit).toArray();
}

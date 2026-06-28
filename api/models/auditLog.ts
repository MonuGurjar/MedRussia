import type { AuditLogRecord } from './types';

type InMemoryCollection<T> = T[];

const auditLogs: InMemoryCollection<AuditLogRecord> = [];

export function createAuditLog(record: Omit<AuditLogRecord, 'createdAt'>): AuditLogRecord {
  const saved: AuditLogRecord = {
    ...record,
    createdAt: new Date(),
  };

  // TODO: Replace with MongoDB insertOne on audit_logs collection.
  auditLogs.push(saved);
  return saved;
}

export function queryAuditLogs(params: {
  userId?: string;
  action?: string;
  status?: 'success' | 'failed';
  from?: Date;
  to?: Date;
}): AuditLogRecord[] {
  return auditLogs.filter((log) => {
    if (params.userId && log.userId !== params.userId) return false;
    if (params.action && log.action !== params.action) return false;
    if (params.status && log.status !== params.status) return false;
    if (params.from && log.createdAt < params.from) return false;
    if (params.to && log.createdAt > params.to) return false;
    return true;
  });
}

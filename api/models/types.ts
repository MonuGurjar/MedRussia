export type AuditStatus = 'success' | 'failed';

export type AuditAction =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_REGISTRATION'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET'
  | 'UPLOAD_DOCUMENT'
  | 'DELETE_DOCUMENT'
  | 'VERIFY_DOCUMENT'
  | 'REJECT_DOCUMENT'
  | 'CREATE_APPLICATION'
  | 'UPDATE_APPLICATION'
  | 'DELETE_APPLICATION'
  | 'ASSIGN_COUNSELOR'
  | 'CHANGE_STUDENT_STATUS'
  | 'BOOK_APPOINTMENT'
  | 'CANCEL_APPOINTMENT'
  | 'UPLOAD_PAYMENT_PROOF'
  | 'VERIFY_PAYMENT'
  | 'REJECT_PAYMENT'
  | 'ADMIN_LOGIN'
  | 'ROLE_CHANGED'
  | 'AI_CHAT_REQUEST'
  | 'DOWNLOAD_DOCUMENT';

export interface AuditLogRecord {
  userId: string;
  userRole: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  description: string;
  ip: string;
  userAgent: string;
  status: AuditStatus;
  createdAt: Date;
}

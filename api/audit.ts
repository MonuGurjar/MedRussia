import { connectToDatabase } from './mongodb';
import { withAuth, AuthUser } from '../src/lib/apiAuth';

export async function logAuditEvent(
  userId: string,
  action: string,
  details: any,
  ipAddress?: string
) {
  try {
    const { db } = await connectToDatabase();
    const auditCollection = db.collection('audit_logs');
    
    await auditCollection.insertOne({
      userId,
      action,
      details,
      ipAddress,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

async function auditHandler(request: any, response: any, user: AuthUser) {
  if (request.method === 'POST') {
    const { action, details } = request.body;
    const ipAddress = request.headers['x-forwarded-for'] || request.headers['x-real-ip'] || 'unknown_ip';

    if (!action) {
      return response.status(400).json({ error: 'action is required' });
    }

    await logAuditEvent(user.id, action, details, ipAddress as string);
    return response.status(200).json({ success: true });
  } 
  
  if (request.method === 'GET') {
    // Only admins can read audit logs
    if (user.role !== 'admin') {
      return response.status(403).json({ error: 'Forbidden' });
    }

    try {
      const { search, action, from, to, page = '1', limit = '50' } = request.query;
      const { db } = await connectToDatabase();
      
      const query: any = {};
      
      if (action) query.action = action;
      if (from || to) {
        query.timestamp = {};
        if (from) query.timestamp.$gte = new Date(from);
        if (to) query.timestamp.$lte = new Date(to);
      }
      
      if (search) {
        query.$or = [
          { userId: { $regex: search, $options: 'i' } },
          { action: { $regex: search, $options: 'i' } }
        ];
      }

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const total = await db.collection('audit_logs').countDocuments(query);
      const logs = await db.collection('audit_logs')
        .find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .toArray();

      return response.status(200).json({ logs, total, page: pageNum, limit: limitNum });
    } catch (error: any) {
      console.error('Failed to fetch audit logs:', error);
      return response.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return response.status(405).json({ error: 'Method Not Allowed' });
}

export default withAuth(auditHandler);

import { connectToDatabase } from './mongodb';
import { apiLimiter, checkRateLimit } from './ratelimit';
import { logAuditEvent } from './audit';
import { UserSchema, validateRequest } from '../src/lib/validators';
import { withAuth, AuthUser } from '../src/lib/apiAuth';

async function usersHandler(request: any, response: any, userAuth: AuthUser) {
  const rateLimitResult = await checkRateLimit(request, apiLimiter);
  if (!rateLimitResult.success) {
    return response.status(429).json({ error: 'Too many requests, please try again later.' });
  }

  const { client, db } = await connectToDatabase();
  const usersCollection = db.collection('users');

  try {
    if (request.method === 'GET') {
      const { id, email } = request.query;
      if (id) {
        if (userAuth.role !== 'admin' && userAuth.id !== id) return response.status(403).json({ error: 'Forbidden' });
        const user = await usersCollection.findOne({ id });
        if (!user) return response.status(404).json({ error: 'User not found' });
        return response.status(200).json(user);
      } else if (email) {
        if (userAuth.role !== 'admin' && userAuth.email !== email) return response.status(403).json({ error: 'Forbidden' });
        const user = await usersCollection.findOne({ email });
        if (!user) return response.status(404).json({ error: 'User not found' });
        return response.status(200).json(user);
      } else {
        if (userAuth.role !== 'admin') return response.status(403).json({ error: 'Admin access required' });
        const users = await usersCollection.find({}).toArray();
        return response.status(200).json(users);
      }
    } else if (request.method === 'POST') {
      const validation = validateRequest(UserSchema, request.body);
      if (!validation.success) {
        return response.status(400).json({ error: validation.error });
      }
      const user = request.body;
      if (userAuth.role !== 'admin' && userAuth.email !== user.email) {
        return response.status(403).json({ error: 'Forbidden' });
      }
      await usersCollection.insertOne(user);
      
      const ipAddress = request.headers['x-forwarded-for'] || request.headers['x-real-ip'] || 'unknown_ip';
      await logAuditEvent(user.id, 'PROFILE_CREATED', { email: user.email }, ipAddress);
      
      return response.status(201).json(user);
    } else if (request.method === 'PUT') {
      // For PUT, we might not validate everything strictly since it could be partial, 
      // but let's assume we do strict validation or partial
      const validation = validateRequest(UserSchema.partial(), request.body);
      if (!validation.success) {
        return response.status(400).json({ error: validation.error });
      }
      const user = { ...request.body };
      delete user._id;

      if (userAuth.role !== 'admin' && userAuth.id !== user.id) {
        return response.status(403).json({ error: 'Forbidden' });
      }
      await usersCollection.updateOne({ id: user.id }, { $set: user }, { upsert: true });
      
      const ipAddress = request.headers['x-forwarded-for'] || request.headers['x-real-ip'] || 'unknown_ip';
      await logAuditEvent(user.id, 'PROFILE_UPDATED', { email: user.email }, ipAddress);
      
      return response.status(200).json(user);
    } else if (request.method === 'DELETE') {
      if (userAuth.role !== 'admin') return response.status(403).json({ error: 'Admin access required' });
      const { email } = request.query;
      await usersCollection.deleteOne({ email });
      return response.status(200).json({ success: true });
    } else {
      return response.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (error: any) {
    console.error('Users API Error:', error);
    return response.status(500).json({ error: error.message });
  }
}

export default withAuth(usersHandler);

import { connectToDatabase } from './mongodb';
import { apiLimiter, checkRateLimit } from './ratelimit';
import { withAuth, AuthUser } from '../src/lib/apiAuth';

const ALLOWED_KEYS = [
  'med_russia:feedback',
  'med_russia:users',
  'med_russia:settings',
  'med_russia:chat_logs',
  'med_russia:platform_feedback',
  'med_russia:team',
  'med_russia:direct_chats'
];

async function storeHandler(request: any, response: any, user: AuthUser) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const rateLimitResult = await checkRateLimit(request, apiLimiter);
  if (!rateLimitResult.success) {
    return response.status(429).json({ error: 'Too many requests, please try again later.' });
  }

  try {
    const { command, args } = request.body;

    if (!command || !args || args.length === 0) {
        return response.status(400).json({ error: 'Command and args are required' });
    }

    const key = args[0];
    if (!ALLOWED_KEYS.includes(key)) {
      return response.status(403).json({ error: 'Forbidden key' });
    }

    const { db } = await connectToDatabase();
    const kvCollection = db.collection('kv_store');

    if (command === 'GET') {
      if (key === 'med_russia:users' || key === 'med_russia:chat_logs') {
        if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'manager' && user.role !== 'staff') {
           return response.status(403).json({ error: 'Admin access required' });
        }
      }

      // Special routing for users collection
      if (key === 'med_russia:users') {
        const users = await db.collection('users').find({}).toArray();
        return response.status(200).json({ result: JSON.stringify(users) });
      }

      const doc = await kvCollection.findOne({ _id: key });
      return response.status(200).json({ result: doc ? doc.value : null });

    } else if (command === 'SET') {
      const value = args[1];

      if (key === 'med_russia:settings' || key === 'med_russia:users' || key === 'med_russia:team') {
        if (user.role !== 'admin' && user.role !== 'super_admin') {
           return response.status(403).json({ error: 'Admin access required' });
        }
      }

      // Special routing for users collection
      if (key === 'med_russia:users') {
        let usersArray = [];
        try { usersArray = typeof value === 'string' ? JSON.parse(value) : value; } catch (e) { usersArray = []; }
        
        if (Array.isArray(usersArray) && usersArray.length > 0) {
          const bulkOps = usersArray.map(u => ({
            updateOne: {
              filter: { id: u.id },
              update: { $set: u },
              upsert: true
            }
          }));
          await db.collection('users').bulkWrite(bulkOps);
        }
        return response.status(200).json({ result: 'OK' });
      }

      await kvCollection.updateOne(
        { _id: key },
        { $set: { value: value } },
        { upsert: true }
      );
      return response.status(200).json({ result: 'OK' });

    } else if (command === 'DEL') {
      if (user.role !== 'admin' && user.role !== 'super_admin') {
         return response.status(403).json({ error: 'Admin access required for delete' });
      }
      await kvCollection.deleteOne({ _id: key });
      return response.status(200).json({ result: 1 });
      
    } else {
      return response.status(400).json({ error: 'Unsupported command' });
    }

  } catch (error: any) {
    console.error('Store Proxy Error:', error);
    return response.status(500).json({ error: error.message });
  }
}

export default withAuth(storeHandler);


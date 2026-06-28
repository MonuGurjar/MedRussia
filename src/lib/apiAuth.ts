import { createClient } from '@supabase/supabase-js';
import { connectToDatabase } from '../../api/mongodb';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
  adminRole?: string;
}

interface AuthOptions {
  requiredRole?: string;
}

export function withAuth(handler: any, options?: AuthOptions) {
  return async (request: any, response: any) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return response.status(401).json({ error: 'Missing or invalid authorization header' });
      }

      const token = authHeader.split(' ')[1];
      
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error || !data.user) {
        return response.status(401).json({ error: 'Invalid or expired token' });
      }

      const userId = data.user.id;
      const email = data.user.email;

      const { db } = await connectToDatabase();
      const userDoc = await db.collection('users').findOne({ id: userId });

      const role = userDoc?.role || 'student';
      const adminRole = userDoc?.adminRole;

      if (options?.requiredRole && role !== options.requiredRole) {
        return response.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }

      const authUser: AuthUser = {
        id: userId,
        email: email || '',
        role,
        adminRole
      };

      return handler(request, response, authUser);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return response.status(500).json({ error: 'Internal Server Error during authentication' });
    }
  };
}

export function withOptionalAuth(handler: any) {
  return async (request: any, response: any) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return handler(request, response, null);
      }

      const token = authHeader.split(' ')[1];
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error || !data.user) {
        return handler(request, response, null);
      }

      const userId = data.user.id;
      const email = data.user.email;

      const { db } = await connectToDatabase();
      const userDoc = await db.collection('users').findOne({ id: userId });

      const authUser: AuthUser = {
        id: userId,
        email: email || '',
        role: userDoc?.role || 'student',
        adminRole: userDoc?.adminRole
      };

      return handler(request, response, authUser);
    } catch (error) {
      console.error('Optional Auth middleware error:', error);
      return handler(request, response, null);
    }
  };
}

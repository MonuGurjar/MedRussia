import type { VercelRequest } from '@vercel/node';

export function getClientIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

export function getUserAgent(req: VercelRequest): string {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua : 'unknown';
}

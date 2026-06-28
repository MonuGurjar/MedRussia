import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) 
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    }) 
  : null;

export const apiLimiter = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "10 s"),
}) : null;

export const strictLimiter = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
}) : null;

export async function checkRateLimit(request: any, limiter: Ratelimit | null) {
  if (!limiter) return { success: true };
  
  // Try to get IP from Vercel headers, fallback to a default if not found
  const ip = request.headers['x-forwarded-for'] || request.headers['x-real-ip'] || 'unknown_ip';
  
  const { success, limit, reset, remaining } = await limiter.limit(ip as string);
  
  return { success, limit, reset, remaining };
}

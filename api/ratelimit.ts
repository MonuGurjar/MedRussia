export const apiLimiter = null;
export const strictLimiter = null;

export async function checkRateLimit(request: any, limiter: any) {
  return { success: true, limit: 100, reset: 0, remaining: 100 };
}

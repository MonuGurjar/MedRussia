type LimitWindow = {
  max: number;
  windowSeconds: number;
};

type LimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

const LIMITS = {
  login: { max: 5, windowSeconds: 15 * 60 },
  otp: { max: 3, windowSeconds: 60 * 60 },
  ai: { max: 30, windowSeconds: 60 * 60 },
  upload: { max: 20, windowSeconds: 24 * 60 * 60 },
} as const satisfies Record<string, LimitWindow>;

import { getRedisClient } from '../lib/redis';

export async function checkRateLimit(
  key: string,
  bucket: keyof typeof LIMITS
): Promise<LimitResult> {
  const config = LIMITS[bucket];
  const redis = getRedisClient();

  const namespaced = `rl:${bucket}:${key}`;
  const count = await redis.incr(namespaced);

  if (count === 1) {
    await redis.expire(namespaced, config.windowSeconds);
  }

  const ttl = (await redis.ttl(namespaced)) || config.windowSeconds;
  const allowed = count <= config.max;
  const remaining = Math.max(0, config.max - count);

  return {
    allowed,
    remaining,
    retryAfterSeconds: ttl,
  };
}

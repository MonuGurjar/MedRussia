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

const memoryStore = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(
  key: string,
  bucket: keyof typeof LIMITS
): Promise<LimitResult> {
  const now = Date.now();
  const config = LIMITS[bucket];
  const existing = memoryStore.get(key);

  if (!existing || now > existing.resetAt) {
    memoryStore.set(key, {
      count: 1,
      resetAt: now + config.windowSeconds * 1000,
    });

    return {
      allowed: true,
      remaining: config.max - 1,
      retryAfterSeconds: config.windowSeconds,
    };
  }

  existing.count += 1;
  memoryStore.set(key, existing);

  const allowed = existing.count <= config.max;
  const remaining = Math.max(0, config.max - existing.count);
  const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);

  return { allowed, remaining, retryAfterSeconds };
}

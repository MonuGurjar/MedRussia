import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<unknown> | unknown;

export function withBodyValidation<T extends z.ZodTypeAny>(
  schema: T,
  handler: Handler
): Handler {
  return async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    req.body = parsed.data;
    return handler(req, res);
  };
}

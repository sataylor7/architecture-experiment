import { rateLimit } from 'express-rate-limit';

// Auth routes — tight per-email limit: 5 requests per 10 minutes
export const authRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => (req.body?.email as string | undefined) ?? req.ip ?? 'unknown',
  message: { error: 'Too many requests. Try again in 10 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API routes — 100 requests per minute per user
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req) =>
    (req as unknown as { user?: { userId: string } }).user?.userId ?? req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
});

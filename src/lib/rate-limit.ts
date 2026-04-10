// In-process rate limit store — works in Next.js route handlers (Node.js runtime).
// Key → { count, windowStart }
const store = new Map<string, { count: number; windowStart: number }>();

function check(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= max) return false;

  entry.count += 1;
  return true;
}

// Auth routes: 5 requests per email per 10 minutes (falls back to IP)
export function checkAuthRateLimit(email: string): boolean {
  return check(`auth:${email.toLowerCase()}`, 5, 10 * 60 * 1000);
}

// General API routes: 100 requests per userId per minute (falls back to IP)
export function checkApiRateLimit(userIdOrIp: string): boolean {
  return check(`api:${userIdOrIp}`, 100, 60 * 1000);
}

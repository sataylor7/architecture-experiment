# Bugs found after checking against the testing checklist

## I found two real bugs and a few items to explicitly mark as N/A for Phase 1. Let me walk through the full checklist:

✅ **Pass**

- Prisma schema fields and all `@@index` entries match the spec exactly
- Every API route (request-code, verify-code, refresh, logout) validates with Zod before calling any service
- Business logic (attempt counting, code burning, refresh rotation, reuse detection) is in the service layer
- No stack traces in production responses — all routes return generic `'Internal server error'`
- Audit log covers all 7 required auth events
- Security headers set via `next.config.ts` (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy)
- CORS uses `ALLOWED_ORIGINS` env var, no wildcard
- `.env` is gitignored; `.env.example` has a `!.env.example` negation so it's committable

⏭ **N/A for Phase 1** (built in later phases)

- Admin-only routes return 403 — withRole middleware exists but no admin routes built yet
- Client-role response scoping — no entity routes yet
- Invoice lock, task depth guard, subtask projectId, lineTotal/subtotal/total, taxId encryption, maskTaxId

---

❌ **Two bugs to fix before closing Phase 1**

**Bug 1 — OTP queries bleed into refresh token records**

The `AuthCode` table is reused for both OTP codes and refresh tokens (with an `rt:` prefix). Two queries are broken:

In `requestCode`, invalidating prior codes:

```
// Hits RT records too — logs user out of all sessions when requesting a new OTP
await prisma.authCode.updateMany({
  where: { userId: user.id, usedAt: null },

```

In `verifyCode`, finding the active code:

```
// Could match an RT record; bcrypt.compare against 'rt:hash' would throw
await prisma.authCode.findFirst({
  where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() }
},

```

Fix: `add codeHash: { not: { startsWith: 'rt:' } }` to both queries.

**Bug 2 — Auth rate limit key is IP, not email**

The spec requires `keyGenerator: (req) => req.body?.email ?? req.ip`. The proxy uses `auth:${ip}` only — an attacker targeting one email from different IPs won't be rate-limited per that email. The fix is to move auth rate limiting into the route handlers themselves (where the parsed email is already available from Zod), instead of the proxy.

Fixing both now.

Update Todos

- [ ] Fix Bug 1: OTP queries bleeding into RT records in AuthCode table

- [ ] Fix Bug 2: Auth rate limit key must be email-based, not IP-only

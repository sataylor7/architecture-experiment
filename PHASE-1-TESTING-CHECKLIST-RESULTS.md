# Phase 1 Testing Checklist Results

| # | Item | Status |
|---|---|---|
| 1 | All Prisma schema fields match spec, including all `@@index` entries | ✅ |
| 2 | Every API route validates with Zod before calling any service | ✅ |
| 3 | Business logic in services, not handlers | ✅ |
| 4 | Cascade deletes behave as documented | ✅ (defined in schema) |
| 5 | Admin-only routes return 403 for client-role tokens | ⏭ N/A — no entity routes in Phase 1 |
| 6 | Client-role responses omit sensitive fields | ⏭ N/A — no entity routes in Phase 1 |
| 7 | Invoice lock blocks mutations | ⏭ N/A — Phase 4 |
| 8 | Task depth guard rejects subtasks of subtasks | ⏭ N/A — Phase 3 |
| 9 | Subtask projectId matches parent projectId | ⏭ N/A — Phase 3 |
| 10 | Auth rate limit returns 429 on 6th request within 10 minutes, keyed on email | ✅ (fixed) |
| 11 | Refresh token rotation works; reuse of revoked token kills all sessions | ✅ |
| 12 | lineTotal/subtotal/taxAmount/total consistent after line item changes | ⏭ N/A — Phase 4 |
| 13 | taxId encrypted before write, decrypted only for admin reads | ⏭ N/A — Phase 2 |
| 14 | maskTaxId in non-reveal admin responses | ⏭ N/A — Phase 2 |
| 15 | No stack traces in production error responses | ✅ |
| 16 | Audit log written for all auth events and taxId accesses | ✅ |
| 17 | Security headers (helmet equivalent) present on all responses | ✅ |
| 18 | CORS allowlist set, no wildcard | ✅ |
| 19 | `.env` not committed | ✅ |

## Bugs Found and Fixed

**Bug 1 — OTP queries bleeding into refresh token records**

The `AuthCode` table is reused for both OTP codes and refresh tokens (with an `rt:` prefix). Two queries were not filtering out RT records:

- `requestCode`: invalidating prior codes was also burning active refresh tokens, logging users out of all sessions when requesting a new OTP
- `verifyCode`: the active code lookup could match an RT record, causing `bcrypt.compare` to run against an `rt:hash` string

Fixed by adding `codeHash: { not: { startsWith: 'rt:' } }` to both queries in [src/services/auth.service.ts](src/services/auth.service.ts).

**Bug 2 — Auth rate limit keyed on IP instead of email**

The spec requires the auth rate limit to be keyed on email (`keyGenerator: (req) => req.body?.email ?? req.ip`). The proxy was using `auth:${ip}` only, meaning an attacker targeting one email from different IPs would not be rate-limited per that email.

Fixed by moving auth rate limiting into the route handlers (where the parsed email is available after Zod validation) and replacing `express-rate-limit` with an in-process store. Changes in [src/lib/rate-limit.ts](src/lib/rate-limit.ts), [src/app/api/auth/request-code/route.ts](src/app/api/auth/request-code/route.ts), and [src/app/api/auth/verify-code/route.ts](src/app/api/auth/verify-code/route.ts).

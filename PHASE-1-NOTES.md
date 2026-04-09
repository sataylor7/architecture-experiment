# NOTES

- Phase 1 is complete and building clean. Here's a summary of what was built:

---

**Infrastructure**

- docker-compose.yml — PostgreSQL 16 container (dashboard_db, port 5432)
- .env.example — template for all required secrets
- prisma/schema.prisma — full schema from spec, migration 20260409200556_init applied

**Lib layer (src/lib/)**

- prisma.ts — singleton client with dev/prod log levels
- crypto.ts — AES-256-CBC encryptTaxId / decryptTaxId / maskTaxId
- errors.ts — AppError with status code
- audit.ts — structured JSON audit log + hashEmail (SHA-256 prefix)
- jwt.ts — signAccessToken / verifyAccessToken
- token-store.ts — in-memory access token (never localStorage)
- email.ts — Resend OTP sender
- rate-limit.ts — authRateLimit (5/10min) + apiRateLimit (100/min)
- schemas/auth.schema.ts — shared RequestCodeSchema / VerifyCodeSchema

**Auth service + API routes** — full passwordless flow: request-code → verify-code → refresh → logout with refresh token rotation and reuse detection

**Middleware**

- src/middleware/auth.ts — withAuth JWT guard
- src/middleware/rbac.ts — withRole(...roles) RBAC guard
- src/proxy.ts — CORS + edge rate limiting on all /api/\* routes

**Security headers** — CSP, HSTS, X-Frame-Options, etc. via next.config.ts

**Background jobs** — authcode cleanup (hourly) + overdue invoice check (01:00 daily), started via src/instrumentation.ts

**Login UI** — src/app/(auth)/login/page.tsx — two-step email → code form

## Todos

- [x] Create docker-compose.yml for PostgreSQL

- [x] Create .env with all required variables

- [x] Run Prisma migration

- [x] Build lib layer (prisma singleton, crypto, errors, audit, jwt, rate-limit, email)

- [x] Build auth service (request-code, verify-code, refresh, logout)

- [x] Build JWT + RBAC middleware

- [x] Build passwordless login UI

- [x] Set up background jobs (authcode cleanup, overdue invoices)

- [x] Wire security middleware into Next.js (helmet, cors, rate limiting)

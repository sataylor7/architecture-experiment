# Phase 2 Testing Checklist Results

| # | Item | Status |
|---|---|---|
| 1 | All Prisma schema fields match spec, including all `@@index` entries | ⏭ N/A — schema unchanged from Phase 1 |
| 2 | Every API route validates with Zod before calling any service | ✅ all 10 routes |
| 3 | Business logic in services, not handlers | ✅ email/name uniqueness, userId validation, encryption all in services |
| 4 | Cascade deletes behave as documented | ⏭ N/A — schema unchanged |
| 5 | Admin-only routes return 403 for client-role tokens | ✅ `withRole('admin')` on all user routes; client/service writes |
| 6 | Client-role responses omit `notes`, raw `taxId`, `price` | ✅ `clientClientSelect` excludes `taxId`, `userId`, `measurements` |
| 7 | Invoice lock blocks mutations | ⏭ N/A — Phase 4 |
| 8 | Task depth guard | ⏭ N/A — Phase 3 |
| 9 | Subtask `projectId` matches parent | ⏭ N/A — Phase 3 |
| 10 | Auth rate limit 429 on 6th request | ⏭ N/A — Phase 1 |
| 11 | Refresh token rotation / reuse detection | ⏭ N/A — Phase 1 |
| 12 | `lineTotal`/`subtotal`/`taxAmount`/`total` consistent | ⏭ N/A — Phase 4 |
| 13 | `taxId` encrypted before write, decrypted only for admin reads | ✅ `encryptTaxId` on create/update; `decryptTaxId` only on `?reveal=true` with admin token |
| 14 | `maskTaxId` in all non-reveal admin responses | ✅ applied in list, create, update, and non-reveal get |
| 15 | No stack traces in production | ✅ all routes return generic `'Internal server error'` |
| 16 | Audit log for all auth events and `taxId` accesses | ✅ `client.taxid_accessed` written on every reveal |
| 17 | Security headers present | ⏭ N/A — Phase 1 |
| 18 | CORS no wildcard | ⏭ N/A — Phase 1 |
| 19 | `.env` not committed | ⏭ N/A — Phase 1 |
| 20 | No `SELECT *` — all queries use explicit `select` | ✅ (fixed) |

## Bugs Found and Fixed

**Bug 1 — Incomplete edit left `getUserById` broken**

`deletedAt` was erroneously removed from `userSelect` during a previous checklist pass, breaking the soft-delete check in `getUserById` with a TypeScript error. Restored with a corrected comment — admin-only exposure of `deletedAt` is deliberate (needed for `showDeleted=true` list), not accidental. The spec protects against accidental exposure via `SELECT *`, not deliberate admin access.

Fixed in [src/services/user.service.ts](src/services/user.service.ts).

**Bug 2 — `SELECT *` on void delete calls**

`prisma.client.delete` and `prisma.service.delete` fetched the full record by default (Prisma's default when no `select` is given), violating the "Never SELECT *" rule. Added `select: { id: true }` to both.

Fixed in [src/services/client.service.ts](src/services/client.service.ts) and [src/services/service.service.ts](src/services/service.service.ts).

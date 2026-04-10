✅ **Pass**

- Every API route validates with Zod before any service call — all six routes (users, clients, services) ✅
- Business logic in services, not handlers — email uniqueness, userId validation, taxId encryption all in services ✅
- Admin-only routes return 403 for client-role tokens — `withRole('admin')` on all user write routes, all client write routes, all service write routes ✅
- Client-role responses omit sensitive fields — `clientClientSelect` excludes `taxId`, `userId`, `measurements` ✅
- `taxId` encrypted before every write — `encryptTaxId()` called in both `createClient` (line 113) and `updateClient` (line 153) ✅
- `maskTaxId` used in all non-reveal admin responses — `maskClientTaxId()` applied in `listClients`, `createClient`, `updateClient`, and the non-reveal path of `getClientById` ✅
- Audit log `client.taxid_accessed` written on every admin decrypt ✅
- No stack traces — all routes return generic `'Internal server error'` on unexpected errors ✅
- Cursor-based pagination on all list endpoints ✅
- No `SELECT *` — every query uses an explicit `select` ✅

⏭ **N/A for Phase 2**

Invoice lock, task depth guard, subtask projectId, lineTotal/subtotal/total — Phases 3–4

---

❌ One bug to fix

**`userSelect` includes `deletedAt` in the API response**

The spec explicitly lists `deletedAt` alongside `codeHash` and `taxId` as a sensitive field to protect from accidental exposure. The comment in src/services/user.service.ts:5 even says _"never expose deletedAt in payload"_ — but then immediately includes `deletedAt: true` in the select, which means it is returned in every API response.

The fix: use a separate internal select for the soft-delete check, and remove `deletedAt` from the response. For the `showDeleted=true` list, an admin can distinguish deleted vs. active users by the presence of the record in the list vs. the default list — they don't need the raw timestamp in the payload.

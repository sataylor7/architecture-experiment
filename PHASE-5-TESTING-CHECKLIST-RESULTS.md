# Phase 5 Testing Checklist Results

Branch: `phase-5-frontend-dashboard`
Date reviewed: 2026-04-17

---

## Checklist Items

| # | Item | Result | Notes |
|---|------|--------|-------|
| 1 | All Prisma schema fields match the spec | N/A | Phase 5 is frontend-only; schema unchanged |
| 2 | Every API route validates input with Zod before calling any service | PASS | New stats route has no input; cancel route has no body input |
| 3 | Business logic rules enforced in services, not just the UI | PASS | Cancel logic enforced in `cancelInvoice` service; UI cancel/edit buttons are convenience only |
| 4 | Cascade deletes behave as documented | N/A | No schema changes |
| 5 | Admin-only routes return 403 for client-role tokens | PASS | All new API routes (`/api/dashboard/stats`, `/api/invoices/[id]/cancel`) use `withRole('admin')` |
| 6 | Client-role responses do not include notes, raw taxId, or price | PASS | Dashboard is admin-only; no client-role UI built |
| 7 | Invoice lock blocks all mutations when status is Sent or beyond | PASS (after fix) | **Bug 1 fixed**: cancel button was calling PATCH with `status` field (rejected by Zod with 422); replaced with `POST /cancel` endpoint backed by `cancelInvoice` service which enforces Draft/Sent/Overdue only |
| 8 | Task depth guard | N/A | Phase 3 concern |
| 9 | Subtask projectId matches parent | N/A | Phase 3 concern |
| 10 | Auth rate limit returns 429 on 6th request | N/A | Phase 1 concern |
| 11 | Refresh token rotation works; reuse kills all sessions | PASS | Dashboard layout tries `/api/auth/refresh` on mount when no in-memory token; clears token and redirects to `/login` on failure |
| 12 | lineTotal, subtotal, taxAmount, total consistent | N/A | Service-layer concern covered in Phase 4 |
| 13 | taxId encrypted before write | N/A | Phase 2 concern |
| 14 | maskTaxId used in all non-reveal responses | N/A | Phase 2 concern |
| 15 | No stack traces in production error responses | PASS | All new route handlers return `'Internal server error'` for unexpected errors |
| 16 | Audit log entries written | N/A | Phase 1/2 concern |
| 17 | Security headers (helmet) present | N/A | Phase 1 concern |
| 18 | CORS allowlist set correctly, no wildcard | N/A | Phase 1 concern |
| 19 | `.env` is not committed to git | PASS | Confirmed |
| 20 | No SELECT * — all Prisma queries use explicit select | PASS | `cancelInvoice` uses `invoiceDetailSelect`; stats route uses aggregates (no select needed) |

### Phase 5-Specific Checks

| Check | Result | Notes |
|-------|--------|-------|
| Token never written to localStorage or sessionStorage | PASS | Only `token-store.ts` module variable used; `grep` confirms no localStorage/sessionStorage writes anywhere in `src/` |
| Auth guard redirects to `/login` on token + refresh failure | PASS | Layout `useEffect` attempts refresh; calls `router.replace('/login')` on failure |
| All API calls use `apiFetch`/`apiJson` (not raw `fetch`) | PASS | Only exceptions are the two auth calls in layout (`/api/auth/refresh`, `/api/auth/logout`), which correctly bypass the helper to avoid circular refresh loops |
| `useSearchParams` wrapped in Suspense | PASS (after fix) | **Bug 2 fixed**: projects and invoices list pages wrapped inner component in `<Suspense>` per Next.js App Router requirement |
| Stale session shown as error in forms | PASS (after fix) | **Bug 3 fixed**: new invoice form now guards `decodeTokenPayload()` returning null and shows a clear error message instead of submitting an empty userId string |

---

## Bugs Found and Fixed

### Bug 1 — Cancel button sent `status` via `PATCH`, bypassing schema and service logic

**Files:** `src/app/(dashboard)/invoices/[id]/page.tsx`, `src/services/invoice.service.ts`, `src/app/api/invoices/[id]/cancel/route.ts`

**Problem:** The Cancel button called `PATCH /api/invoices/{id}` with `{ status: 'Cancelled' }`. `UpdateInvoiceSchema` has no `status` field, so Zod rejected the request with 422 every time. Even if it had succeeded, it would have bypassed the service-layer transition guard.

**Fix:** Added `cancelInvoice` service function (allows Draft/Sent/Overdue → Cancelled, throws 409 otherwise) and a `POST /api/invoices/[id]/cancel` route. Updated the cancel button to call this endpoint. Updated button visibility to match the service (Draft, Sent, and Overdue — not just Draft).

---

### Bug 2 — `useSearchParams` used without Suspense boundary

**Files:** `src/app/(dashboard)/projects/page.tsx`, `src/app/(dashboard)/invoices/page.tsx`

**Problem:** Both pages called `useSearchParams()` at the top level of the page component without a `<Suspense>` wrapper. Next.js App Router requires a Suspense boundary around components that call `useSearchParams` to allow the page to be partially prerendered.

**Fix:** Renamed the main page function to `ProjectsInner` / `InvoicesInner` and added a new default export that wraps it in `<Suspense>`.

---

### Bug 3 — `decodeTokenPayload()` null not guarded in new invoice form

**File:** `src/app/(dashboard)/invoices/new/page.tsx`

**Problem:** If the access token was absent (e.g. after a hard page reload where refresh succeeded but `decodeTokenPayload` had a parsing edge case), `userId` would be set to `''`, which fails Zod `z.uuid()` validation with a 422 — with no error shown to the user.

**Fix:** Added an explicit null check on `decodeTokenPayload()`. If null, sets a user-visible error message ("Session expired — please sign in again.") and returns early without submitting.

---

## Summary

All three bugs fixed and committed: `fix: Phase 5 checklist corrections — cancel route, Suspense, userId guard`

Phase 5 checklist: **PASS** (all applicable items pass after fixes applied).

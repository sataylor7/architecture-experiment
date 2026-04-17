# Phase 4 Testing Checklist Results

Branch: `phase-4-invoicing`
Date reviewed: 2026-04-17

---

## Checklist Items

| # | Item | Result | Notes |
|---|------|--------|-------|
| 1 | All Prisma schema fields match the spec, including all `@@index` entries | PASS | Invoice, InvoiceLineItem, ProjectInvoice fields and indexes match spec exactly |
| 2 | Every API route validates input with Zod before calling any service | PASS | All 8 route files use `safeParse` → 422 on failure before calling any service function |
| 3 | Business logic rules enforced in services, not just the UI | PASS | `assertInvoiceEditable`, lock checks, hard-delete guard, and status transition guards all live in `invoice.service.ts` |
| 4 | Cascade deletes behave as documented | PASS | `InvoiceLineItem` and `ProjectInvoice` both have `onDelete: Cascade` on the `Invoice` FK |
| 5 | Admin-only routes return 403 for client-role tokens | PASS | All invoice routes use `withRole('admin')` — client tokens receive 403 |
| 6 | Client-role responses do not include notes, raw taxId, or price | PASS | Invoice routes are admin-only; no client-scoped select needed for invoices |
| 7 | Invoice lock blocks all mutations when status is Sent or beyond | PASS | `assertInvoiceEditable` called in `updateInvoice`, `addLineItem`, `updateLineItem`, `removeLineItem`. `LOCKED_STATUSES = ['Sent','Paid','Overdue','Cancelled']` |
| 8 | Task depth guard rejects creation of subtasks of subtasks | N/A | Phase 3 concern — covered in Phase 3 checklist |
| 9 | Subtask projectId matches parent projectId | N/A | Phase 3 concern — covered in Phase 3 checklist |
| 10 | Auth rate limit returns 429 on the 6th request within 10 minutes | N/A | Phase 1 concern — covered in Phase 1 |
| 11 | Refresh token rotation works; reuse of revoked token kills all sessions | N/A | Phase 1 concern — covered in Phase 1 |
| 12 | `lineTotal`, `subtotal`, `taxAmount`, `total` are consistent after any line item change | PASS (after fix) | `recomputeInvoiceTotals` called inside `$transaction` after every `addLineItem`, `updateLineItem`, `removeLineItem`. **Bug 1 fixed**: `updateInvoice` now also recomputes when `taxRate` changes |
| 13 | `taxId` is encrypted before write, decrypted only for admin reads | N/A | Phase 2 concern — covered in Phase 2 |
| 14 | `maskTaxId` used in all non-reveal admin responses | N/A | Phase 2 concern — covered in Phase 2 |
| 15 | No stack traces in production error responses | PASS | All route handlers catch errors, return `{ error: err.message }` for `AppError` or `'Internal server error'` for unexpected errors |
| 16 | Audit log entries written for all auth events and taxId accesses | N/A | Phase 1/2 concern |
| 17 | Security headers (helmet) present on all responses | N/A | Phase 1 concern |
| 18 | CORS allowlist set correctly, no wildcard | N/A | Phase 1 concern |
| 19 | `.env` is not committed to git | PASS | `.gitignore` includes `.env` |
| 20 | No `SELECT *` — all Prisma queries use explicit `select` | PASS (after fixes) | **Bugs 2 & 3 fixed**: `recomputeInvoiceTotals` update and `unlinkProject` delete now include `select` clauses |

---

## Cascade Delete Behaviour

| Parent deleted | Cascade target | Behaviour |
|----------------|---------------|-----------|
| `Invoice` | `InvoiceLineItem` | Hard delete — `onDelete: Cascade` |
| `Invoice` | `ProjectInvoice` | Hard delete — `onDelete: Cascade` |
| `Project` | `ProjectInvoice` | Hard delete — `onDelete: Cascade` on Project side |

---

## Bugs Found and Fixed

### Bug 1 — `updateInvoice` did not recompute totals when `taxRate` changed

**File:** `src/services/invoice.service.ts` — `updateInvoice`

**Problem:** When `data.taxRate` was included in an update, the invoice's `taxRate` column was updated but `taxAmount` and `total` remained stale. The existing `recomputeInvoiceTotals` helper was not called.

**Fix:** When `data.taxRate !== undefined`, `updateInvoice` now runs inside a `prisma.$transaction`, calls `recomputeInvoiceTotals(id, tx)` after writing the new rate, then returns the full refreshed invoice via `tx.invoice.findUniqueOrThrow`.

---

### Bug 2 — `unlinkProject` missing `select` clause

**File:** `src/services/invoice.service.ts` — `unlinkProject`

**Problem:** `prisma.projectInvoice.delete(...)` had no `select`, causing Prisma to return all columns. Violates the no-SELECT-* rule.

**Fix:** Added `select: { projectId: true }` to the delete call.

---

### Bug 3 — `recomputeInvoiceTotals` missing `select` clause

**File:** `src/services/invoice.service.ts` — `recomputeInvoiceTotals`

**Problem:** `tx.invoice.update(...)` had no `select`, causing Prisma to return all columns. Violates the no-SELECT-* rule.

**Fix:** Added `select: { id: true }` to the update call (return value is discarded).

---

## Summary

All three fixes were committed in: `fix: invoice service — recompute totals on taxRate update, add missing selects`

Phase 4 checklist: **PASS** (all applicable items pass after fixes applied).

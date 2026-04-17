Three bugs found:

1. **Bug 1 (critical)** — Cancel button sends `PATCH` with `{ status: 'Cancelled' }`, but `UpdateInvoiceSchema` has no `status` field → 422 every time. Needs a `/cancel` API route.
2. **Bug 2** — `useSearchParams()` used without a `<Suspense>` boundary in projects and invoices list pages. Next.js docs require Suspense wrapping.
3. **Bug 3 (minor)** — If `decodeTokenPayload()` returns `null` in the new invoice form, `userId` becomes `''` which fails Zod `z.uuid()` validation silently. Should guard and surface an error.

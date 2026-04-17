Phase 4 is complete. Here's a summary of everything built across 7 commits:

**Schema** — `invoice.schema.ts`
Create/Update/List, CreateLineItem/UpdateLineItem, LinkProject, MarkPaid

**Service** — `invoice.service.ts`

- `listInvoices` — cursor-paginated with status/client/date-range filters
- `createInvoice` — with optional `projectIds[]` linked via ProjectInvoice on creation
- `updateInvoice` — blocked (409) when status is Sent/Paid/Overdue/Cancelled
- `deleteInvoice` — blocked unless Draft or Cancelled
- `addLineItem` / `updateLineItem` / `removeLineItem` — all in `prisma.$transaction`, each triggers `recomputeInvoiceTotals`, all blocked when locked
- `linkProject` / `unlinkProject` — add/remove ProjectInvoice records
- `sendInvoice` — Draft → Sent only
- `markInvoicePaid` — Sent or Overdue → Paid, requires `paidAt`

**API Routes** (all `withRole('admin')`)

- `GET/POST /api/invoices`
- `GET/PATCH/DELETE /api/invoices/[id]`
- `POST /api/invoices/[id]/line-items`, `PATCH/DELETE /api/invoices/[id]/line-items/[liId]`
- `POST /api/invoices/[id]/projects`, `DELETE /api/invoices/[id]/projects/[pid]`
- `POST /api/invoices/[id]/send`, `POST /api/invoices/[id]/mark-paid`

**Background jobs** — already implemented and registered in Phase 1 (`instrumentation.ts`)

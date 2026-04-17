Found three bugs:

1. **`updateInvoice` doesn't recompute totals when `taxRate` changes** — `taxAmount` and `total` become stale, violating the consistency invariant from CLAUDE.md
2. **`unlinkProject` delete missing `select`** — Prisma returns all fields, violates "Never SELECT \*"
3. **`recomputeInvoiceTotals` update missing `select`** — same rule violation

Phase 5 is complete. Here's what was built across 6 commits:

| Item           | Files                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Infrastructure | src/lib/api.ts (apiFetch/apiJson + auto-refresh), src/app/(dashboard)/layout.tsx (sidebar + auth guard), stats API       |
| Overview       | dashboard/page.tsx — 4 summary cards + project/task status breakdown                                                     |
| Clients        | List with pagination + detail with projects/invoices panels                                                              |
| Projects       | Filterable list + detail with kanban task board (add tasks, optimistic status change)                                    |
| Invoices       | Filterable list + detail with actions (Send/Mark Paid/Cancel/Delete) + create form with project multi-select + edit form |
| Services       | Inline create/edit form, activate/deactivate toggle, category badges                                                     |

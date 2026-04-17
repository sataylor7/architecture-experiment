# Phase 3 Testing Checklist Results

| # | Item | Status |
|---|---|---|
| 1 | All Prisma schema fields match spec, including all `@@index` entries | ⏭ N/A — schema unchanged from Phase 1 |
| 2 | Every API route validates with Zod before calling any service | ✅ all 14 new routes |
| 3 | Business logic in services, not handlers | ✅ status sync, depth guard, assignee role check, sewing validation, Custom-only pattern detail — all in services |
| 4 | Cascade deletes behave as documented | ✅ (see notes below) |
| 5 | Admin-only routes return 403 for client-role tokens | ✅ (fixed) `GET /projects` corrected from `withAuth` to `withRole('admin')` |
| 6 | Client-role responses omit `notes`, `price`, `paid`, `userId` | ✅ `clientProjectSelect` excludes all four |
| 7 | Invoice lock blocks mutations | ⏭ N/A — Phase 4 |
| 8 | Task depth guard rejects subtask-of-subtask creation | ✅ `assertSubtaskAllowed` enforced in `createTask` |
| 9 | Subtask `projectId` matches parent `projectId` | ✅ checked inside `assertSubtaskAllowed` |
| 10 | Auth rate limit 429 on 6th request | ⏭ N/A — Phase 1 |
| 11 | Refresh token rotation / reuse detection | ⏭ N/A — Phase 1 |
| 12 | `lineTotal`/`subtotal`/`taxAmount`/`total` consistent | ⏭ N/A — Phase 4 |
| 13 | `taxId` encrypted before write, decrypted only for admin reads | ⏭ N/A — Phase 2 (no taxId on Project/Task) |
| 14 | `maskTaxId` in all non-reveal admin responses | ⏭ N/A — Phase 2 |
| 15 | No stack traces in production | ✅ all routes return generic `'Internal server error'` |
| 16 | Audit log for all auth events and `taxId` accesses | ⏭ N/A — no new auditable events in Phase 3 |
| 17 | Security headers present | ⏭ N/A — Phase 1 |
| 18 | CORS no wildcard | ⏭ N/A — Phase 1 |
| 19 | `.env` not committed | ⏭ N/A — Phase 1 |
| 20 | No `SELECT *` — all queries use explicit `select` | ✅ all Prisma calls use explicit `select` objects |

## Cascade Delete Notes

| Trigger | Behaviour | How enforced |
|---|---|---|
| `Project` deleted | Tasks, `ProjectProjectType`, `ProjectInvoice` records deleted | Prisma schema `onDelete: Cascade` on all three relations |
| Root `Task` deleted | All subtasks deleted first, then the parent | Manual `deleteMany` + `delete` inside `prisma.$transaction` (schema self-reference has no cascade) |
| Subtask deleted | Direct delete only | No further cascade needed |
| `ProjectType` deleted | Blocked with 409 if referenced by any project | `projectProjectType.count` check in service before delete |

## Bugs Found and Fixed

**Bug 1 — `GET /projects` accessible to client-role tokens**

The list endpoint used `withAuth` (any authenticated user) instead of `withRole('admin')`. Per spec: `GET /projects — Admin`. A client-role token could enumerate all projects across all clients.

Fixed in [src/app/api/projects/route.ts](src/app/api/projects/route.ts). `listProjects` service function simplified to remove now-dead client-role branch.

**Bug 2 — Client ownership check used wrong FK**

`getProjectById` and `listProjectTasks` looked up the client record using `where: { userId: requestingUserId }`. But `Client.userId` is the *admin owner's* user ID, not the client-role user's. This meant the check always failed for client-role users, returning 403 on every request.

Fixed in [src/services/project.service.ts](src/services/project.service.ts): ownership is now resolved by looking up `User.email` for the requesting user ID, then finding `Client` by that email — the correct link between a client-role `User` and their `Client` record.

**Bug 3 — `deleteTask` subtask cascade was not atomic**

`deleteMany` (subtasks) and `delete` (parent) were two separate Prisma calls. If the parent `delete` failed after the `deleteMany` succeeded, subtasks would be permanently gone while the parent task remained, leaving the data in an inconsistent state.

Fixed in [src/services/task.service.ts](src/services/task.service.ts): both operations now run inside `prisma.$transaction`.

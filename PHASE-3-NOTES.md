Phase 3 is complete. Here's what was built across 6 commits:

**Schemas** (`src/lib/schemas/`)

- `project.schema.ts` — Create/Update/List with status, clientId, projectTypeId, date-range filters
- `task.schema.ts` — Create/Update/List with status, projectId, assignedTo filters
- `project-type.schema.ts` — ProjectType, PatternStyleType, PatternStyleDetail schemas

**Services** (`src/services/`)

- `project.service.ts` — full CRUD, status↔completed sync, role-scoped selects, projectType assignment in transactions
- `task.service.ts` — full CRUD, depth guard, subtask cascade delete, Done→completedAt sync, admin-only assignee validation
- `project-type.service.ts` — sewing subcategory validation, muslinMade/dateMuslinMade validation, Custom-only PatternStyleDetail guard, 409 on referenced delete

**API Routes**

- `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/[id]`, `GET /api/projects/[id]/tasks`, `GET /api/projects/[id]/invoices`
- `GET/POST /api/tasks`, `GET/PATCH/DELETE /api/tasks/[id]`, `GET /api/tasks/[id]/subtasks`
- `GET/POST /api/project-types`, `PATCH/DELETE /api/project-types/[id]`
- `GET/POST /api/pattern-style-types`, `PATCH /api/pattern-style-types/[id]`
- `GET/POST /api/pattern-style-details`, `PATCH /api/pattern-style-details/[id]`

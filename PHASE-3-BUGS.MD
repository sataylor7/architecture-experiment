- Found three bugs against the checklist. Let me document them before fixing:

1. **`GET /projects` uses `withAuth` but spec says admin-only** — a client-role token can list all projects
2. **Client ownership lookup is wrong** — `Client.userId` is the _admin's_ user ID, not the client-role user's. Both `getProjectById` and `listProjectTasks` would always return 403 for client users
3. **`deleteTask` subtask cascade isn't in a transaction** — if the parent `delete` fails after `deleteMany`, subtasks are gone but the parent task persists

# Phase 2 Notes

## Commits

| Commit | What |
|---|---|
| `57eebd5` | User CRUD — admin-only, soft-delete, cursor-paginated list |
| `58c0f68` | Client CRUD — taxId encrypt/mask/reveal, role-scoped selects, audit log |
| `da2f431` | Service catalog CRUD — admin write, authenticated read, activeOnly filter |

## Additional Notes

- Notable fixes along the way: middleware updated to forward route params context; Zod v4 API (`z.email()`, `z.uuid()`, two-arg `z.record()`) applied across all schemas; Prisma `InputJsonValue` casts for JSON fields.

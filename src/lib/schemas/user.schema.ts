import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.email().max(255).toLowerCase().trim(),
  role: z.enum(['admin', 'client']).default('client'),
});

export const UpdateUserSchema = z.object({
  role: z.enum(['admin', 'client']).optional(),
});

export const ListUsersSchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  showDeleted: z.coerce.boolean().default(false),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type ListUsersInput = z.infer<typeof ListUsersSchema>;

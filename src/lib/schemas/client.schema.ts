import { z } from 'zod';

export const CreateClientSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.email().max(255).toLowerCase().trim(),
  company: z.string().max(200).optional(),
  socialMedia: z.record(z.string(), z.string()).optional(),
  subscribed: z.boolean().default(false),
  taxId: z.string().max(50).optional(),
  measurements: z.record(z.string(), z.unknown()).optional(),
  userId: z.uuid(),
});

export const UpdateClientSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.email().max(255).toLowerCase().trim().optional(),
  company: z.string().max(200).optional(),
  socialMedia: z.record(z.string(), z.string()).optional(),
  subscribed: z.boolean().optional(),
  taxId: z.string().max(50).optional(),
  measurements: z.record(z.string(), z.unknown()).optional(),
});

export const ListClientsSchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateClientInput = z.infer<typeof CreateClientSchema>;
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;
export type ListClientsInput = z.infer<typeof ListClientsSchema>;

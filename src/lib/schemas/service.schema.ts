import { z } from 'zod';

const ServiceCategoryEnum = z.enum(['Website', 'Design', 'Sewing', 'Other']);

export const CreateServiceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  defaultPrice: z.number().nonnegative().optional(),
  category: ServiceCategoryEnum.optional(),
  active: z.boolean().default(true),
});

export const UpdateServiceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  defaultPrice: z.number().nonnegative().optional(),
  category: ServiceCategoryEnum.optional(),
  active: z.boolean().optional(),
});

export const ListServicesSchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  activeOnly: z.coerce.boolean().default(false),
});

export type CreateServiceInput = z.infer<typeof CreateServiceSchema>;
export type UpdateServiceInput = z.infer<typeof UpdateServiceSchema>;
export type ListServicesInput = z.infer<typeof ListServicesSchema>;

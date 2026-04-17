import { z } from 'zod';

export const ProjectStatusEnum = z.enum(['Draft', 'InProgress', 'Completed', 'OnHold', 'Cancelled']);

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(300),
  description: z.string().optional(),
  status: ProjectStatusEnum.default('Draft'),
  notes: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  price: z.number().min(0).optional(),
  paid: z.boolean().default(false),
  clientId: z.uuid(),
  userId: z.uuid(),
  projectTypeIds: z.array(z.uuid()).min(1, 'At least one projectTypeId is required'),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  description: z.string().optional(),
  status: ProjectStatusEnum.optional(),
  notes: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  price: z.number().min(0).optional(),
  paid: z.boolean().optional(),
  completed: z.boolean().optional(),
  projectTypeIds: z.array(z.uuid()).min(1).optional(),
});

export const ListProjectsSchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: ProjectStatusEnum.optional(),
  clientId: z.uuid().optional(),
  projectTypeId: z.uuid().optional(),
  dueDateFrom: z.coerce.date().optional(),
  dueDateTo: z.coerce.date().optional(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type ListProjectsInput = z.infer<typeof ListProjectsSchema>;

import { z } from 'zod';

export const TaskStatusEnum = z.enum(['ToDo', 'InProgress', 'Blocked', 'Done', 'Cancelled']);
export const PriorityEnum = z.enum(['Low', 'Medium', 'High', 'Urgent']);

export const CreateTaskSchema = z.object({
  projectId: z.uuid(),
  parentTaskId: z.uuid().optional(),
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  status: TaskStatusEnum.default('ToDo'),
  priority: PriorityEnum.default('Medium'),
  dueDate: z.coerce.date().optional(),
  assignedTo: z.uuid().optional(),
  sortOrder: z.number().int().optional(),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().optional(),
  status: TaskStatusEnum.optional(),
  priority: PriorityEnum.optional(),
  dueDate: z.coerce.date().optional(),
  assignedTo: z.uuid().optional(),
  sortOrder: z.number().int().optional(),
});

export const ListTasksSchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: TaskStatusEnum.optional(),
  projectId: z.uuid().optional(),
  assignedTo: z.uuid().optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type ListTasksInput = z.infer<typeof ListTasksSchema>;

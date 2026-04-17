import { z } from 'zod';

export const InvoiceStatusEnum = z.enum(['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled']);

export const CreateInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1).max(100),
  clientId: z.uuid(),
  userId: z.uuid(),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  taxRate: z.number().min(0).max(1).default(0),
  notes: z.string().optional(),
  projectIds: z.array(z.uuid()).optional(),
});

export const UpdateInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1).max(100).optional(),
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  taxRate: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
});

export const ListInvoicesSchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: InvoiceStatusEnum.optional(),
  clientId: z.uuid().optional(),
  issueDateFrom: z.coerce.date().optional(),
  issueDateTo: z.coerce.date().optional(),
  dueDateFrom: z.coerce.date().optional(),
  dueDateTo: z.coerce.date().optional(),
});

export const CreateLineItemSchema = z.object({
  serviceId: z.uuid().optional(),
  description: z.string().min(1).max(500),
  quantity: z.number().min(0).default(1),
  unitPrice: z.number().min(0),
  sortOrder: z.number().int().optional(),
});

export const UpdateLineItemSchema = z.object({
  serviceId: z.uuid().optional(),
  description: z.string().min(1).max(500).optional(),
  quantity: z.number().min(0).optional(),
  unitPrice: z.number().min(0).optional(),
  sortOrder: z.number().int().optional(),
});

export const LinkProjectSchema = z.object({
  projectId: z.uuid(),
});

export const MarkPaidSchema = z.object({
  paidAt: z.coerce.date(),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>;
export type ListInvoicesInput = z.infer<typeof ListInvoicesSchema>;
export type CreateLineItemInput = z.infer<typeof CreateLineItemSchema>;
export type UpdateLineItemInput = z.infer<typeof UpdateLineItemSchema>;
export type LinkProjectInput = z.infer<typeof LinkProjectSchema>;
export type MarkPaidInput = z.infer<typeof MarkPaidSchema>;

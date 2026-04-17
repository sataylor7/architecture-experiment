import { z } from 'zod';

export const TypeCategoryEnum = z.enum(['Website', 'Design', 'Sewing']);
export const SewingSubcategoryEnum = z.enum(['Tailoring', 'Bespoke', 'Custom']);

export const CreateProjectTypeSchema = z.object({
  name: z.string().min(1).max(200),
  category: TypeCategoryEnum,
  sewingSubcategory: SewingSubcategoryEnum.optional(),
  description: z.string().max(500).optional(),
});

export const UpdateProjectTypeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: TypeCategoryEnum.optional(),
  sewingSubcategory: SewingSubcategoryEnum.optional(),
  description: z.string().max(500).optional(),
});

export const CreatePatternStyleTypeSchema = z.object({
  name: z.string().min(1).max(200),
  notes: z.string().optional(),
  muslinMade: z.boolean().default(false),
  dateMuslinMade: z.coerce.date().optional(),
});

export const UpdatePatternStyleTypeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  notes: z.string().optional(),
  muslinMade: z.boolean().optional(),
  dateMuslinMade: z.coerce.date().optional(),
});

export const CreatePatternStyleDetailSchema = z.object({
  patternStyleNumber: z.string().min(1).max(100),
  patternStyleTypeId: z.uuid(),
  projectTypeId: z.uuid(),
});

export const UpdatePatternStyleDetailSchema = z.object({
  patternStyleNumber: z.string().min(1).max(100).optional(),
  patternStyleTypeId: z.uuid().optional(),
});

export type CreateProjectTypeInput = z.infer<typeof CreateProjectTypeSchema>;
export type UpdateProjectTypeInput = z.infer<typeof UpdateProjectTypeSchema>;
export type CreatePatternStyleTypeInput = z.infer<typeof CreatePatternStyleTypeSchema>;
export type UpdatePatternStyleTypeInput = z.infer<typeof UpdatePatternStyleTypeSchema>;
export type CreatePatternStyleDetailInput = z.infer<typeof CreatePatternStyleDetailSchema>;
export type UpdatePatternStyleDetailInput = z.infer<typeof UpdatePatternStyleDetailSchema>;

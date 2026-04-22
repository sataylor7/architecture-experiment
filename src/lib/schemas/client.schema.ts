import { z } from 'zod';

export const CreateClientSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.email().max(255).toLowerCase().trim(),
  company: z.string().max(200).optional(),
  subscribed: z.boolean().default(false),
  taxId: z.string().max(50).optional(),
  userId: z.uuid(),
});

export const UpdateClientSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.email().max(255).toLowerCase().trim().optional(),
  company: z.string().max(200).optional(),
  subscribed: z.boolean().optional(),
  taxId: z.string().max(50).optional(),
});

export const ListClientsSchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const UpsertClientSocialMediaSchema = z.object({
  facebook:  z.string().max(500).optional().nullable(),
  instagram: z.string().max(500).optional().nullable(),
  twitter:   z.string().max(500).optional().nullable(),
  linkedin:  z.string().max(500).optional().nullable(),
  github:    z.string().max(500).optional().nullable(),
  tiktok:    z.string().max(500).optional().nullable(),
});

export const UpsertClientMeasurementsSchema = z.object({
  unit:           z.enum(['Inches', 'Centimeters']).default('Inches'),
  neck:           z.number().positive().optional().nullable(),
  shoulder:       z.number().positive().optional().nullable(),
  shoulderToElbow: z.number().positive().optional().nullable(),
  bicep:          z.number().positive().optional().nullable(),
  wrist:          z.number().positive().optional().nullable(),
  chest:          z.number().positive().optional().nullable(),
  waist:          z.number().positive().optional().nullable(),
  hip:            z.number().positive().optional().nullable(),
  thigh:          z.number().positive().optional().nullable(),
  ankle:          z.number().positive().optional().nullable(),
  hipToKnee:      z.number().positive().optional().nullable(),
  crotchLength:   z.number().positive().optional().nullable(),
  sleeve:         z.number().positive().optional().nullable(),
  inseam:         z.number().positive().optional().nullable(),
  outseam:        z.number().positive().optional().nullable(),
  rise:           z.number().positive().optional().nullable(),
  height:         z.number().positive().optional().nullable(),
  weight:         z.number().positive().optional().nullable(),
});

export type CreateClientInput = z.infer<typeof CreateClientSchema>;
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;
export type ListClientsInput = z.infer<typeof ListClientsSchema>;
export type UpsertClientSocialMediaInput = z.infer<typeof UpsertClientSocialMediaSchema>;
export type UpsertClientMeasurementsInput = z.infer<typeof UpsertClientMeasurementsSchema>;

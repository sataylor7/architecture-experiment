import { z } from 'zod';

export const RequestCodeSchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
});

export const VerifyCodeSchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
  code: z.string().length(6).regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export type RequestCodeInput = z.infer<typeof RequestCodeSchema>;
export type VerifyCodeInput = z.infer<typeof VerifyCodeSchema>;

import { z } from 'zod';

export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .transform((val) => (typeof val === 'string' ? val.trim() : ''))
    .pipe(z.string().max(50, 'Tên không được vượt quá 50 ký tự'))
    .optional()
    .or(z.literal('')),
  lastName: z
    .string()
    .transform((val) => (typeof val === 'string' ? val.trim() : ''))
    .pipe(z.string().max(50, 'Họ và tên đệm không được vượt quá 50 ký tự'))
    .optional()
    .or(z.literal('')),
});

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

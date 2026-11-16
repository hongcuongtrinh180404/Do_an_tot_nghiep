import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .transform((val) => (typeof val === 'string' ? val.trim() : ''))
    .pipe(
      z
        .string()
        .min(2, 'Họ và tên phải có ít nhất 2 ký tự')
        .max(100, 'Họ và tên không được vượt quá 100 ký tự'),
    ),
  bio: z
    .string()
    .transform((val) => (typeof val === 'string' ? val.trim() : ''))
    .pipe(z.string().max(500, 'Tiểu sử không được vượt quá 500 ký tự'))
    .optional(),
  firstName: z
    .string()
    .transform((val) => (typeof val === 'string' ? val.trim() : ''))
    .pipe(z.string().max(50, 'Tên không được vượt quá 50 ký tự'))
    .optional(),
  lastName: z
    .string()
    .transform((val) => (typeof val === 'string' ? val.trim() : ''))
    .pipe(z.string().max(50, 'Họ và tên đệm không được vượt quá 50 ký tự'))
    .optional(),
});

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

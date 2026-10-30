import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .transform((val) => val.trim())
    .pipe(z.string().min(1, 'Email không được để trống').email('Email không đúng định dạng')),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

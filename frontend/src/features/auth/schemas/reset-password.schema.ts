import { z } from 'zod';

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .transform((val) => val.trim())
      .pipe(z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự')),
    confirmPassword: z
      .string()
      .transform((val) => val.trim())
      .pipe(z.string().min(1, 'Vui lòng nhập lại mật khẩu')),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

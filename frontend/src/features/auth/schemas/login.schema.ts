import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .transform((val) => val.trim())
    .pipe(z.string().min(1, 'Email không được để trống').email('Email không đúng định dạng')),
  password: z
    .string()
    .transform((val) => val.trim())
    .pipe(z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự')),
});

export type LoginFormData = z.infer<typeof loginSchema>;

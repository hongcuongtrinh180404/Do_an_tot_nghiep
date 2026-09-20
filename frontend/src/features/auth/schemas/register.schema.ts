import { z } from 'zod';

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .transform((val) => val.trim())
      .pipe(z.string().min(1, 'Họ và tên đệm không được để trống')),
    lastName: z
      .string()
      .transform((val) => val.trim())
      .pipe(z.string().min(1, 'Tên không được để trống')),
    email: z
      .string()
      .transform((val) => val.trim())
      .pipe(z.string().min(1, 'Email không được để trống').email('Email không đúng định dạng')),
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

export type RegisterFormData = z.infer<typeof registerSchema>;

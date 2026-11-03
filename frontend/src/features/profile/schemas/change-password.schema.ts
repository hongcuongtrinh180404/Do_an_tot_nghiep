import { z } from 'zod';
import { AUTH_CONSTANTS } from 'share-lib';

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z
      .string()
      .min(1, 'Vui lòng nhập mật khẩu mới')
      .min(
        AUTH_CONSTANTS.MIN_PASSWORD_LENGTH,
        `Mật khẩu mới phải có ít nhất ${AUTH_CONSTANTS.MIN_PASSWORD_LENGTH} ký tự`,
      ),
    confirmPassword: z
      .string()
      .min(1, 'Vui lòng xác nhận lại mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Xác nhận mật khẩu mới không trùng khớp',
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại',
    path: ['newPassword'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;


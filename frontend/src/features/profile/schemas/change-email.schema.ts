import { z } from 'zod';
import { AUTH_CONSTANTS } from 'share-lib';

export const changeEmailSchema = z.object({
  newEmail: z
    .string()
    .transform((val) => (typeof val === 'string' ? val.trim().toLowerCase() : ''))
    .pipe(
      z
        .string()
        .min(1, 'Vui lòng nhập địa chỉ email mới')
        .email('Địa chỉ email không đúng định dạng'),
    ),
  currentPassword: z
    .string()
    .min(1, 'Vui lòng nhập mật khẩu hiện tại')
    .min(
      AUTH_CONSTANTS.MIN_PASSWORD_LENGTH,
      `Mật khẩu phải có ít nhất ${AUTH_CONSTANTS.MIN_PASSWORD_LENGTH} ký tự`,
    ),
});

export type ChangeEmailFormData = z.infer<typeof changeEmailSchema>;


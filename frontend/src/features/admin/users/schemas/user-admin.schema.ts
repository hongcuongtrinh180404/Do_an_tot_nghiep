import { z } from 'zod';
import { RoleEnum, UserStatusEnum } from 'share-lib';

export const updateUserAdminSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Họ và tên phải có ít nhất 2 ký tự.')
    .max(100, 'Họ và tên không được vượt quá 100 ký tự.'),
  username: z
    .string()
    .trim()
    .max(30, 'Tên người dùng tối đa 30 ký tự.')
    .regex(/^[a-zA-Z0-9_]*$/, 'Tên người dùng chỉ được chứa chữ cái, chữ số và dấu gạch dưới (_).')
    .optional()
    .or(z.literal('')),
  bio: z
    .string()
    .trim()
    .max(500, 'Giới thiệu bản thân không được vượt quá 500 ký tự.')
    .optional()
    .or(z.literal('')),
  role: z.nativeEnum(RoleEnum, {
    error: 'Vui lòng chọn vai trò hợp lệ.',
  }),
  status: z.nativeEnum(UserStatusEnum, {
    error: 'Vui lòng chọn trạng thái hợp lệ.',
  }),
});

export type UpdateUserAdminFormValues = z.infer<typeof updateUserAdminSchema>;

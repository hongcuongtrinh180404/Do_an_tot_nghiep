import { z } from 'zod';

export const createSectionSchema = z.object({
  title: z
    .string({ message: 'Tiêu đề chương học không được để trống' })
    .transform((val) => val.trim())
    .pipe(
      z
        .string()
        .min(1, 'Tiêu đề chương học không được để trống')
        .max(200, 'Tiêu đề chương học không được vượt quá 200 ký tự'),
    ),
  description: z
    .string()
    .transform((val) => val.trim())
    .pipe(z.string().max(1000, 'Mô tả chương học không được vượt quá 1000 ký tự'))
    .optional()
    .or(z.literal('')),
  order: z
    .number({ message: 'Thứ tự chương học phải là một số hợp lệ' })
    .int('Thứ tự chương học phải là số nguyên')
    .min(0, 'Thứ tự chương học phải lớn hơn hoặc bằng 0')
    .optional(),
});

export type CreateSectionFormData = z.infer<typeof createSectionSchema>;

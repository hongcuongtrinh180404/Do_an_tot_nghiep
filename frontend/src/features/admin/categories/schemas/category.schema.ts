import { z } from 'zod';

export const categoryFormSchema = z.object({
  name: z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z
        .string()
        .min(1, 'Tên danh mục không được để trống')
        .min(2, 'Tên danh mục phải có ít nhất 2 ký tự')
        .max(100, 'Tên danh mục không được vượt quá 100 ký tự'),
    ),
  slug: z
    .string()
    .transform((value) => value.trim().toLowerCase())
    .pipe(
      z
        .string()
        .regex(
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
          'Slug chỉ được chứa chữ cái thường, số và dấu gạch ngang',
        ),
    )
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().max(500, 'Mô tả không được vượt quá 500 ký tự'))
    .optional()
    .or(z.literal('')),
  order: z
    .number({ message: 'Thứ tự phải là một số hợp lệ' })
    .int('Thứ tự phải là số nguyên')
    .min(0, 'Thứ tự phải lớn hơn hoặc bằng 0'),
  isActive: z.boolean(),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

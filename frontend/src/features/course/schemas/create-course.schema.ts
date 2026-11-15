import { z } from 'zod';
import { CourseLevelEnum } from 'share-lib';

export const createCourseSchema = z.object({
  title: z
    .string()
    .transform((val) => val.trim())
    .pipe(
      z
        .string()
        .min(1, 'Tiêu đề khóa học không được để trống')
        .min(3, 'Tiêu đề khóa học phải có ít nhất 3 ký tự')
        .max(200, 'Tiêu đề khóa học không được vượt quá 200 ký tự')
    ),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .refine(
      (val) => !val || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(val),
      'Slug chỉ được chứa chữ cái thường, số và dấu gạch ngang (ví dụ: lap-trinh-reactjs)'
    )
    .optional(),
  shortDescription: z
    .string()
    .transform((val) => val.trim())
    .pipe(z.string().max(500, 'Mô tả ngắn không được vượt quá 500 ký tự'))
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .transform((val) => {
      const trimmed = val.trim();
      const stripped = trimmed.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      return stripped.length === 0 ? '' : trimmed;
    })
    .optional()
    .or(z.literal('')),
  price: z
    .number({ message: 'Giá khóa học phải là một số hợp lệ' })
    .min(0, 'Giá khóa học không được nhỏ hơn 0 (nhập 0 nếu là khóa học miễn phí)'),
  level: z.nativeEnum(CourseLevelEnum, {
    message: 'Vui lòng chọn cấp độ khóa học hợp lệ',
  }),
  categoryId: z.string().optional().or(z.literal('')),
});

export type CreateCourseFormData = z.infer<typeof createCourseSchema>;

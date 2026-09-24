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
    .transform((val) => val.trim().toLowerCase())
    .pipe(
      z
        .string()
        .min(1, 'Đường dẫn tĩnh (slug) không được để trống')
        .regex(
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
          'Slug chỉ được chứa chữ cái thường, số và dấu gạch ngang (ví dụ: lap-trinh-reactjs)'
        )
    ),
  shortDescription: z
    .string()
    .transform((val) => val.trim())
    .pipe(z.string().max(500, 'Mô tả ngắn không được vượt quá 500 ký tự'))
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .transform((val) => val.trim())
    .optional()
    .or(z.literal('')),
  price: z
    .number({ message: 'Giá khóa học phải là một số hợp lệ' })
    .min(0, 'Giá khóa học không được nhỏ hơn 0 (nhập 0 nếu là khóa học miễn phí)'),
  level: z.nativeEnum(CourseLevelEnum, {
    message: 'Vui lòng chọn cấp độ khóa học hợp lệ',
  }),
});

export type CreateCourseFormData = z.infer<typeof createCourseSchema>;

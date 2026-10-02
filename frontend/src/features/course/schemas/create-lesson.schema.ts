import { z } from 'zod';
import { serializeKeyPoints } from '../utils/lesson-key-points.util';

export const ACCEPTED_LESSON_FILE_EXTENSIONS = '.mp4,.webm,.mov,.pdf,.docx';

export type LessonContentType = 'video' | 'document';

export const ACCEPTED_VIDEO_FILE_EXTENSIONS =
  'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov';

export const ACCEPTED_DOCUMENT_FILE_EXTENSIONS =
  '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const MAX_VIDEO_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB (Nới lỏng giới hạn tối đa)
export const MAX_DOCUMENT_FILE_SIZE = 500 * 1024 * 1024; // 500MB (Nới lỏng giới hạn tối đa)

export function isVideoFile(file: File): boolean {
  return (
    file.type.startsWith('video/') ||
    Boolean(file.name.match(/\.(mp4|webm|mov)$/i))
  );
}

export function isDocumentFile(file: File): boolean {
  return (
    file.type === 'application/pdf' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    Boolean(file.name.match(/\.(pdf|docx)$/i))
  );
}

export const keyPointItemSchema = z.object({
  id: z.string().min(1, 'ID ý cốt lõi không được để trống'),
  text: z
    .string()
    .max(200, 'Mỗi ý cốt lõi không được vượt quá 200 ký tự'),
});

export type KeyPointItemData = z.infer<typeof keyPointItemSchema>;

export const createLessonSchema = z.object({
  title: z
    .string({ message: 'Tiêu đề bài học không được để trống' })
    .transform((val) => val.trim())
    .pipe(
      z
        .string()
        .min(1, 'Tiêu đề bài học không được để trống')
        .max(200, 'Tiêu đề bài học không được vượt quá 200 ký tự'),
    ),
  keyPoints: z
    .array(keyPointItemSchema)
    .min(1, 'Vui lòng nhập ít nhất 1 ý cốt lõi của bài học')
    .refine(
      (points) =>
        points.some((p) => typeof p.text === 'string' && p.text.trim().length > 0),
      {
        message: 'Vui lòng nhập ít nhất 1 ý cốt lõi của bài học',
      },
    )
    .refine(
      (points) => serializeKeyPoints(points).length <= 1000,
      {
        message: 'Tổng nội dung các ý cốt lõi không được vượt quá 1000 ký tự',
      },
    ),
  description: z
    .string()
    .transform((val) => (typeof val === 'string' ? val.trim() : ''))
    .pipe(z.string().max(1000, 'Mô tả bài học không được vượt quá 1000 ký tự'))
    .optional()
    .or(z.literal('')),
  order: z
    .number({ message: 'Thứ tự bài học phải là một số hợp lệ' })
    .int('Thứ tự bài học phải là số nguyên')
    .min(0, 'Thứ tự bài học phải lớn hơn hoặc bằng 0'),
  contentType: z.enum(['video', 'document']),
  contentFile: z.custom<File | null | undefined>().optional().nullable(),
  isPreview: z.boolean(),
});

export type CreateLessonFormData = z.infer<typeof createLessonSchema>;

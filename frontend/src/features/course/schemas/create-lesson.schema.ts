import { z } from 'zod';

export const ACCEPTED_LESSON_FILE_EXTENSIONS = '.mp4,.webm,.mov,.pdf,.docx';

export const MAX_VIDEO_FILE_SIZE = 900 * 1024 * 1024; // 900MB
export const MAX_DOCUMENT_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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
  contentFile: z.custom<File | null | undefined>().optional().nullable(),
  isPreview: z.boolean(),
});

export type CreateLessonFormData = z.infer<typeof createLessonSchema>;

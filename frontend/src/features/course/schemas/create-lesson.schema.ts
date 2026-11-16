import { z } from 'zod';

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
  order: z
    .number({ message: 'Thứ tự bài học phải là một số hợp lệ' })
    .int('Thứ tự bài học phải là số nguyên')
    .min(0, 'Thứ tự bài học phải lớn hơn hoặc bằng 0'),
  contentType: z.enum(['video', 'document']),
  contentFile: z.custom<File | null>(
    (value) => typeof File !== 'undefined' && value instanceof File,
    { message: 'Vui lòng tải lên video hoặc tài liệu cho bài học' },
  ),
  isPreview: z.boolean(),
}).superRefine(({ contentFile, contentType }, ctx) => {
  if (!contentFile) return;

  const isVideo = contentType === 'video';
  if (isVideo ? !isVideoFile(contentFile) : !isDocumentFile(contentFile)) {
    ctx.addIssue({
      code: 'custom',
      path: ['contentFile'],
      message: isVideo
        ? 'Vui lòng chọn video định dạng MP4, WebM hoặc MOV'
        : 'Vui lòng chọn tài liệu định dạng PDF hoặc DOCX',
    });
  }
  if (contentFile.size === 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['contentFile'],
      message: 'Tệp tải lên không được rỗng',
    });
  }
  if (contentFile.size > (isVideo ? MAX_VIDEO_FILE_SIZE : MAX_DOCUMENT_FILE_SIZE)) {
    ctx.addIssue({
      code: 'custom',
      path: ['contentFile'],
      message: isVideo
        ? 'Dung lượng video không được vượt quá 5GB'
        : 'Dung lượng tài liệu không được vượt quá 500MB',
    });
  }
});

export type CreateLessonFormData = z.infer<typeof createLessonSchema>;

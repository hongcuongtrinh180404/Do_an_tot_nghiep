export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export const MAX_VIDEO_SIZE_BYTES = 900 * 1024 * 1024; // 900MB
export const MAX_DOCUMENT_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

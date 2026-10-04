export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export const MAX_VIDEO_SIZE_BYTES = 5 * 1024 * 1024 * 1024; // 5GB (Nới lỏng giới hạn tối đa)
export const MAX_DOCUMENT_SIZE_BYTES = 500 * 1024 * 1024; // 500MB (Nới lỏng giới hạn tối đa)
export const MAX_AVATAR_SIZE_BYTES = 50 * 1024 * 1024; // 50MB (Nới lỏng giới hạn tối đa)

export const ALLOWED_THUMBNAIL_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const MAX_THUMBNAIL_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_TRAILER_SIZE_BYTES = 600 * 1024 * 1024; // 600MB

import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import {
  ALLOWED_VIDEO_MIME_TYPES,
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_VIDEO_SIZE_BYTES,
  MAX_DOCUMENT_SIZE_BYTES,
} from '../../storage/index.js';

@Injectable()
export class LessonFileValidationPipe
  implements PipeTransform<Express.Multer.File, Express.Multer.File>
{
  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file || !file.buffer) {
      throw new BadRequestException('Vui lòng chọn file tải lên');
    }

    const isVideo = (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(file.mimetype);
    const isDocument = (ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(file.mimetype);

    if (!isVideo && !isDocument) {
      throw new BadRequestException(
        'Định dạng file không được hỗ trợ. Chỉ chấp nhận video (MP4, WebM, QuickTime) hoặc tài liệu (PDF, Word .docx).',
      );
    }

    if (isVideo && file.size > MAX_VIDEO_SIZE_BYTES) {
      throw new BadRequestException(
        `Dung lượng video (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn tối đa cho phép (900MB).`,
      );
    }

    if (isDocument && file.size > MAX_DOCUMENT_SIZE_BYTES) {
      throw new BadRequestException(
        `Dung lượng tài liệu (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn tối đa cho phép (50MB).`,
      );
    }

    // Sanitize file.originalname to prevent path traversal or unsafe characters
    if (file.originalname) {
      file.originalname = file.originalname
        .replace(/[/\\?%*:|"<>]/g, '_')
        .replace(/\.\.+/g, '.')
        .trim();
    }

    return file;
  }
}

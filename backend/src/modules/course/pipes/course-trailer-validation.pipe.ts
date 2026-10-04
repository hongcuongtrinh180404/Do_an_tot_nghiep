import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import { decodeUtf8FileName } from 'share-lib';
import {
  ALLOWED_VIDEO_MIME_TYPES,
  MAX_TRAILER_SIZE_BYTES,
} from '../../storage/index.js';

@Injectable()
export class CourseTrailerValidationPipe
  implements PipeTransform<Express.Multer.File, Express.Multer.File>
{
  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file || !file.buffer) {
      throw new BadRequestException('Vui lòng chọn video trailer tải lên');
    }

    const isVideo = (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(file.mimetype);

    if (!isVideo) {
      throw new BadRequestException(
        'Định dạng trailer không được hỗ trợ. Chỉ chấp nhận video (MP4, WebM, QuickTime).',
      );
    }

    if (file.size > MAX_TRAILER_SIZE_BYTES) {
      throw new BadRequestException(
        `Dung lượng video trailer (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn tối đa cho phép (600MB).`,
      );
    }

    // Fix UTF-8 encoding if multer parsed header as Latin-1 (mojibake) & sanitize
    if (file.originalname) {
      file.originalname = decodeUtf8FileName(file.originalname)
        .replace(/[/\\?%*:|"<>]/g, '_')
        .replace(/\.\.+/g, '.')
        .trim();
    }

    return file;
  }
}

import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import {
  ALLOWED_THUMBNAIL_MIME_TYPES,
  MAX_THUMBNAIL_SIZE_BYTES,
} from '../../storage/index.js';

@Injectable()
export class CourseImageValidationPipe
  implements PipeTransform<Express.Multer.File, Express.Multer.File>
{
  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file || !file.buffer) {
      throw new BadRequestException('Vui lòng chọn ảnh bìa tải lên');
    }

    const isImage = (ALLOWED_THUMBNAIL_MIME_TYPES as readonly string[]).includes(file.mimetype);

    if (!isImage) {
      throw new BadRequestException(
        'Định dạng ảnh không được hỗ trợ. Chỉ chấp nhận JPEG, PNG, WebP hoặc GIF.',
      );
    }

    if (file.size > MAX_THUMBNAIL_SIZE_BYTES) {
      throw new BadRequestException(
        `Dung lượng ảnh (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn tối đa cho phép (10MB).`,
      );
    }

    return file;
  }
}

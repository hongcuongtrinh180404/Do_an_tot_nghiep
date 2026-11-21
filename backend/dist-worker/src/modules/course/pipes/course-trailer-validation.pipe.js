var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, BadRequestException } from '@nestjs/common';
import { decodeUtf8FileName } from 'share-lib';
import { ALLOWED_VIDEO_MIME_TYPES, MAX_TRAILER_SIZE_BYTES, } from '../../storage/index.js';
let CourseTrailerValidationPipe = class CourseTrailerValidationPipe {
    transform(file) {
        if (!file || !file.buffer) {
            throw new BadRequestException('Vui lòng chọn video trailer tải lên');
        }
        const isVideo = ALLOWED_VIDEO_MIME_TYPES.includes(file.mimetype);
        if (!isVideo) {
            throw new BadRequestException('Định dạng trailer không được hỗ trợ. Chỉ chấp nhận video (MP4, WebM, QuickTime).');
        }
        if (file.size > MAX_TRAILER_SIZE_BYTES) {
            throw new BadRequestException(`Dung lượng video trailer (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn tối đa cho phép (600MB).`);
        }
        if (file.originalname) {
            file.originalname = decodeUtf8FileName(file.originalname)
                .replace(/[/\\?%*:|"<>]/g, '_')
                .replace(/\.\.+/g, '.')
                .trim();
        }
        return file;
    }
};
CourseTrailerValidationPipe = __decorate([
    Injectable()
], CourseTrailerValidationPipe);
export { CourseTrailerValidationPipe };
//# sourceMappingURL=course-trailer-validation.pipe.js.map
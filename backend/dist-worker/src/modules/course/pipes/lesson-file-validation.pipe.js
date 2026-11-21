var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, BadRequestException } from '@nestjs/common';
import { decodeUtf8FileName } from 'share-lib';
import { ALLOWED_VIDEO_MIME_TYPES, ALLOWED_DOCUMENT_MIME_TYPES, MAX_VIDEO_SIZE_BYTES, MAX_DOCUMENT_SIZE_BYTES, } from '../../storage/index.js';
let LessonFileValidationPipe = class LessonFileValidationPipe {
    transform(file) {
        if (!file || !file.buffer) {
            throw new BadRequestException('Vui lòng chọn file tải lên');
        }
        const isVideo = ALLOWED_VIDEO_MIME_TYPES.includes(file.mimetype);
        const isDocument = ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype);
        if (!isVideo && !isDocument) {
            throw new BadRequestException('Định dạng file không được hỗ trợ. Chỉ chấp nhận video (MP4, WebM, QuickTime) hoặc tài liệu (PDF, Word .docx).');
        }
        if (isVideo && file.size > MAX_VIDEO_SIZE_BYTES) {
            throw new BadRequestException(`Dung lượng video (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn tối đa cho phép (5GB).`);
        }
        if (isDocument && file.size > MAX_DOCUMENT_SIZE_BYTES) {
            throw new BadRequestException(`Dung lượng tài liệu (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn tối đa cho phép (500MB).`);
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
LessonFileValidationPipe = __decorate([
    Injectable()
], LessonFileValidationPipe);
export { LessonFileValidationPipe };
//# sourceMappingURL=lesson-file-validation.pipe.js.map
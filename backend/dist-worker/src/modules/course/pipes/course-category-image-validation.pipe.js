var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, BadRequestException } from '@nestjs/common';
import { ALLOWED_THUMBNAIL_MIME_TYPES, MAX_THUMBNAIL_SIZE_BYTES, } from '../../storage/index.js';
let CourseCategoryImageValidationPipe = class CourseCategoryImageValidationPipe {
    transform(file) {
        if (!file || !file.buffer) {
            throw new BadRequestException('Vui lòng chọn ảnh danh mục tải lên');
        }
        const isImage = ALLOWED_THUMBNAIL_MIME_TYPES.includes(file.mimetype);
        if (!isImage) {
            throw new BadRequestException('Định dạng ảnh không được hỗ trợ. Chỉ chấp nhận JPEG, PNG, WebP hoặc GIF.');
        }
        if (file.size > MAX_THUMBNAIL_SIZE_BYTES) {
            throw new BadRequestException(`Dung lượng ảnh (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn tối đa cho phép (10MB).`);
        }
        return file;
    }
};
CourseCategoryImageValidationPipe = __decorate([
    Injectable()
], CourseCategoryImageValidationPipe);
export { CourseCategoryImageValidationPipe };
//# sourceMappingURL=course-category-image-validation.pipe.js.map
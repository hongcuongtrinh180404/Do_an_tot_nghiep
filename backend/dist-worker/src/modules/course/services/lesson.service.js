var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var LessonService_1;
import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException, Optional, } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { RoleEnum, CourseStatusEnum, LessonContentTypeEnum, LessonTranscriptionStatusEnum, } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { SectionRepository } from '../repositories/section.repository.js';
import { CourseRepository } from '../repositories/course.repository.js';
import { StorageService } from '../../storage/index.js';
import { LessonTranscriptService } from './lesson-transcript.service.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
let LessonService = LessonService_1 = class LessonService extends BaseService {
    lessonRepository;
    sectionRepository;
    enrollmentRepository;
    storageService;
    courseRepository;
    lessonTranscriptService;
    constructor(lessonRepository, sectionRepository, cls, enrollmentRepository, storageService, courseRepository, lessonTranscriptService) {
        super(lessonRepository, cls, LessonService_1.name);
        this.lessonRepository = lessonRepository;
        this.sectionRepository = sectionRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.storageService = storageService;
        this.courseRepository = courseRepository;
        this.lessonTranscriptService = lessonTranscriptService;
    }
    async createLesson(sectionId, input, session) {
        let section = null;
        try {
            section = await this.sectionRepository.findById(sectionId, session);
        }
        catch {
            throw new NotFoundException(`Không tìm thấy chương học với ID '${sectionId}'`);
        }
        if (!section || section.deletedAt) {
            throw new NotFoundException(`Không tìm thấy chương học với ID '${sectionId}'`);
        }
        if (this.courseRepository) {
            const course = await this.courseRepository.findById(section.courseId, session);
            if (course && course.status === CourseStatusEnum.PENDING_APPROVAL) {
                throw new ConflictException('Khóa học đang trong quá trình chờ phê duyệt, không thể thêm bài học.');
            }
        }
        if (input.order !== undefined && input.order < 0) {
            throw new BadRequestException('Thứ tự bài học không được nhỏ hơn 0');
        }
        if (!input.content ||
            ![LessonContentTypeEnum.VIDEO, LessonContentTypeEnum.DOCUMENT].includes(input.content.type) ||
            typeof input.content.url !== 'string' ||
            !input.content.url.trim()) {
            throw new BadRequestException('Vui lòng tải lên video hoặc tài liệu hợp lệ cho bài học');
        }
        const userId = input.userId ?? this.getCurrentUserId();
        const isVideo = input.content?.type === LessonContentTypeEnum.VIDEO;
        const createdLesson = await this.lessonRepository.create({
            sectionId: section.id,
            title: input.title.trim(),
            order: input.order,
            content: { ...input.content, url: input.content.url.trim() },
            isPreview: Boolean(input.isPreview),
            transcriptionStatus: isVideo
                ? LessonTranscriptionStatusEnum.QUEUED
                : LessonTranscriptionStatusEnum.IDLE,
            createdById: userId,
            updatedById: userId,
        }, session);
        if (isVideo &&
            (createdLesson.content?.publicId || createdLesson.content?.url) &&
            this.lessonTranscriptService) {
            const fileKey = createdLesson.content.publicId || createdLesson.content.url;
            this.lessonTranscriptService.triggerTranscription(createdLesson.id, fileKey);
        }
        return createdLesson;
    }
    async updateLesson(lessonId, input, userId, userRole, session) {
        const lesson = await this.getLessonById(lessonId, session);
        if (this.courseRepository) {
            const section = await this.sectionRepository.findById(lesson.sectionId, session);
            if (section) {
                const course = await this.courseRepository.findById(section.courseId, session);
                if (course && course.status === CourseStatusEnum.PENDING_APPROVAL) {
                    throw new ConflictException('Khóa học đang trong quá trình chờ phê duyệt, không thể cập nhật bài học.');
                }
                if (course &&
                    userId &&
                    userRole !== RoleEnum.ADMIN &&
                    course.instructorId !== userId &&
                    String(course.instructorId) !== userId) {
                    throw new ForbiddenException('Bạn không có quyền chỉnh sửa bài học này');
                }
            }
        }
        const updatePayload = {};
        if (input.title !== undefined) {
            updatePayload.title = input.title.trim();
        }
        if (input.order !== undefined) {
            if (input.order < 0) {
                throw new BadRequestException('Thứ tự bài học không được nhỏ hơn 0');
            }
            updatePayload.order = input.order;
        }
        if (input.isPreview !== undefined) {
            updatePayload.isPreview = Boolean(input.isPreview);
        }
        const currentUserId = userId ?? this.getCurrentUserId();
        if (currentUserId) {
            updatePayload.updatedById = currentUserId;
        }
        const updated = await this.lessonRepository.update(lesson.id, updatePayload, session);
        if (!updated) {
            throw new NotFoundException(`Không thể cập nhật bài học với ID '${lessonId}'`);
        }
        return updated;
    }
    async getLessonsBySectionId(sectionId, session) {
        let section = null;
        try {
            section = await this.sectionRepository.findById(sectionId, session);
        }
        catch {
            throw new NotFoundException(`Không tìm thấy chương học với ID '${sectionId}'`);
        }
        if (!section || section.deletedAt) {
            throw new NotFoundException(`Không tìm thấy chương học với ID '${sectionId}'`);
        }
        return this.lessonRepository.findBySectionId(sectionId, session);
    }
    async getLessonById(id, session) {
        let lesson = null;
        try {
            lesson = await this.lessonRepository.findById(id, session);
        }
        catch {
            throw new NotFoundException(`Không tìm thấy bài học với ID '${id}'`);
        }
        if (!lesson || lesson.deletedAt) {
            throw new NotFoundException(`Không tìm thấy bài học với ID '${id}'`);
        }
        return lesson;
    }
    async getLessonForUser(id, userId, userRole, session) {
        const lesson = await this.getAccessibleLesson(id, userId, userRole, session);
        if (!this.storageService)
            return lesson;
        const sign = async (url) => this.storageService.isPrivateMedia(url)
            ? this.storageService.getPresignedStreamUrl(url, 1800)
            : url;
        return {
            ...lesson,
            content: lesson.content ? { ...lesson.content, url: await sign(lesson.content.url) } : lesson.content,
            materials: await Promise.all((lesson.materials ?? []).map(async (material) => ({
                ...material, url: await sign(material.url),
            }))),
        };
    }
    async getAccessibleLesson(id, userId, userRole, session) {
        const lesson = await this.getLessonById(id, session);
        if (lesson.isPreview) {
            return lesson;
        }
        if (userRole === RoleEnum.ADMIN) {
            return lesson;
        }
        let courseId = null;
        if (lesson.sectionId && this.sectionRepository) {
            const section = await this.sectionRepository.findById(lesson.sectionId, session);
            courseId = section?.courseId ?? null;
        }
        if (courseId && this.courseRepository && userId) {
            const course = await this.courseRepository.findById(courseId, session);
            const instructorIdStr = course?.instructorId ? String(course.instructorId) : '';
            if (course && (course.instructorId === userId || instructorIdStr === userId)) {
                return lesson;
            }
        }
        if (userId && courseId) {
            const enrollment = await this.enrollmentRepository.findByUserAndCourse(userId, courseId, session);
            if (enrollment && !enrollment.deletedAt) {
                return lesson;
            }
        }
        throw new ForbiddenException('Bạn cần mua khóa học để xem nội dung bài học này');
    }
    async getAuthorizedStreamUrl(keyOrUrl, userId, userRole) {
        if (!this.storageService)
            throw new BadRequestException('Dịch vụ lưu trữ chưa sẵn sàng');
        const reference = this.storageService.getMediaReference(keyOrUrl);
        const lesson = await this.lessonRepository.findByMediaUrl(reference.url);
        if (!lesson)
            throw new NotFoundException('Không tìm thấy nội dung bài học');
        await this.getAccessibleLesson(lesson.id, userId, userRole);
        return this.storageService.getPresignedStreamUrl(reference.url, 1800);
    }
    async addMaterial(lessonId, file, title, userId, userRole, session) {
        const lesson = await this.getLessonById(lessonId, session);
        if (this.courseRepository) {
            const section = await this.sectionRepository.findById(lesson.sectionId, session);
            if (section) {
                const course = await this.courseRepository.findById(section.courseId, session);
                if (course && course.status === CourseStatusEnum.PENDING_APPROVAL) {
                    throw new ConflictException('Khóa học đang trong quá trình chờ phê duyệt, không thể đính kèm tài liệu.');
                }
                if (course && userId && userRole !== RoleEnum.ADMIN && course.instructorId !== userId) {
                    throw new ForbiddenException('Bạn không có quyền thêm tài liệu vào bài học này');
                }
            }
        }
        if (!this.storageService) {
            throw new BadRequestException('Dịch vụ lưu trữ chưa sẵn sàng');
        }
        const uploadedMedia = await this.storageService.uploadLessonMedia(file, 'courses/lessons/materials');
        const materialTitle = title?.trim() || uploadedMedia.fileName || 'Tài liệu đính kèm';
        const updated = await this.lessonRepository.addMaterial(lesson.id, {
            title: materialTitle,
            url: uploadedMedia.url,
            fileName: uploadedMedia.fileName || file.originalname || 'material',
            fileSize: uploadedMedia.fileSize ?? file.size,
            mimeType: uploadedMedia.mimeType ?? file.mimetype,
            publicId: uploadedMedia.publicId,
            createdAt: new Date(),
        }, session);
        if (!updated) {
            throw new NotFoundException(`Không thể cập nhật bài học với ID '${lessonId}'`);
        }
        return updated;
    }
    async deleteMaterial(lessonId, materialId, userId, userRole, session) {
        const lesson = await this.getLessonById(lessonId, session);
        if (this.courseRepository) {
            const section = await this.sectionRepository.findById(lesson.sectionId, session);
            if (section) {
                const course = await this.courseRepository.findById(section.courseId, session);
                if (course && course.status === CourseStatusEnum.PENDING_APPROVAL) {
                    throw new ConflictException('Khóa học đang trong quá trình chờ phê duyệt, không thể xóa tài liệu.');
                }
                if (course && userId && userRole !== RoleEnum.ADMIN && course.instructorId !== userId) {
                    throw new ForbiddenException('Bạn không có quyền xóa tài liệu của bài học này');
                }
            }
        }
        const material = (lesson.materials || []).find((m) => m.id === materialId);
        if (!material) {
            throw new NotFoundException(`Không tìm thấy tài liệu với ID '${materialId}' trong bài học`);
        }
        const updated = await this.lessonRepository.deleteMaterial(lesson.id, materialId, session);
        if (this.storageService && material.url) {
            try {
                await this.storageService.deleteFile(material.url);
            }
            catch (error) {
                this.logger.warn(`Lỗi khi dọn dẹp file tài liệu ${material.url} trên MinIO: ${String(error)}`);
            }
        }
        if (!updated) {
            throw new NotFoundException(`Không thể cập nhật bài học với ID '${lessonId}'`);
        }
        return updated;
    }
    async deleteLesson(lessonId, userId, userRole) {
        const lesson = await this.getLessonById(lessonId);
        if (this.courseRepository) {
            const section = await this.sectionRepository.findById(lesson.sectionId);
            if (section) {
                const course = await this.courseRepository.findById(section.courseId);
                if (course && course.status === CourseStatusEnum.PENDING_APPROVAL) {
                    throw new ConflictException('Khóa học đang trong quá trình chờ phê duyệt, không thể xóa bài học.');
                }
                if (course && userId && userRole !== RoleEnum.ADMIN && course.instructorId !== userId) {
                    throw new ForbiddenException('Bạn không có quyền xóa bài học này');
                }
            }
        }
        const filesToDelete = [];
        if (lesson.content?.url) {
            filesToDelete.push(lesson.content.url);
        }
        if (lesson.materials && lesson.materials.length > 0) {
            for (const mat of lesson.materials) {
                if (mat.url) {
                    filesToDelete.push(mat.url);
                }
            }
        }
        let success = false;
        try {
            await this.lessonRepository.withTransaction(async (session) => {
                success = await this.lessonRepository.softDelete(lesson.id, userId, session);
                await this.lessonRepository.reorderAfterDelete(lesson.sectionId, lesson.order, session);
            });
        }
        catch {
            success = await this.lessonRepository.softDelete(lesson.id, userId);
            await this.lessonRepository.reorderAfterDelete(lesson.sectionId, lesson.order);
        }
        if (this.storageService && filesToDelete.length > 0) {
            for (const fileUrl of filesToDelete) {
                try {
                    await this.storageService.deleteFile(fileUrl);
                }
                catch (error) {
                    this.logger.warn(`Lỗi khi dọn dẹp file ${fileUrl} trên MinIO: ${String(error)}`);
                }
            }
        }
        return success;
    }
};
LessonService = LessonService_1 = __decorate([
    Injectable(),
    __param(4, Optional()),
    __param(5, Optional()),
    __param(6, Optional()),
    __metadata("design:paramtypes", [LessonRepository,
        SectionRepository,
        ClsService,
        EnrollmentRepository,
        StorageService,
        CourseRepository,
        LessonTranscriptService])
], LessonService);
export { LessonService };
//# sourceMappingURL=lesson.service.js.map
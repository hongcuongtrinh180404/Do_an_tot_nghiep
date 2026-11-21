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
var CourseService_1;
import { Injectable, ConflictException, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef, } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { RoleEnum, UserStatusEnum, CourseStatusEnum, CourseLevelEnum, CourseApprovalActionEnum, slugify, } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { CourseRepository } from '../repositories/course.repository.js';
import { CourseCategoryRepository } from '../repositories/course-category.repository.js';
import { SectionRepository } from '../repositories/section.repository.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { CourseMindmapRepository } from '../repositories/course-mindmap.repository.js';
import { CourseApprovalHistoryRepository } from '../repositories/course-approval-history.repository.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { StorageService } from '../../storage/index.js';
import { LessonQuizRepository } from '../repositories/lesson-quiz.repository.js';
import { buildQuizTimingRequirement } from '../utils/course-approval.util.js';
let CourseService = CourseService_1 = class CourseService extends BaseService {
    courseRepository;
    courseCategoryRepository;
    sectionRepository;
    lessonRepository;
    courseMindmapRepository;
    enrollmentRepository;
    userRepository;
    storageService;
    courseApprovalHistoryRepository;
    lessonQuizRepository;
    constructor(courseRepository, courseCategoryRepository, sectionRepository, lessonRepository, courseMindmapRepository, enrollmentRepository, userRepository, storageService, courseApprovalHistoryRepository, cls, lessonQuizRepository) {
        super(courseRepository, cls, CourseService_1.name);
        this.courseRepository = courseRepository;
        this.courseCategoryRepository = courseCategoryRepository;
        this.sectionRepository = sectionRepository;
        this.lessonRepository = lessonRepository;
        this.courseMindmapRepository = courseMindmapRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.userRepository = userRepository;
        this.storageService = storageService;
        this.courseApprovalHistoryRepository = courseApprovalHistoryRepository;
        this.lessonQuizRepository = lessonQuizRepository;
    }
    async validateCategoryForAssignment(categoryId, session) {
        if (!categoryId)
            return;
        let category = null;
        try {
            category = await this.courseCategoryRepository.findById(categoryId, session);
        }
        catch {
            category = null;
        }
        if (!category || category.deletedAt || !category.isActive) {
            throw new BadRequestException('Danh mục không tồn tại hoặc đã bị tạm ẩn');
        }
    }
    async validateInstructor(instructorId, session) {
        const instructor = await this.userRepository.findById(instructorId, session);
        if (!instructor || instructor.deletedAt) {
            throw new NotFoundException(`Instructor with ID '${instructorId}' not found`);
        }
        if (instructor.status !== UserStatusEnum.ACTIVE) {
            throw new BadRequestException(`Instructor account is not active (current status: ${instructor.status})`);
        }
        if (instructor.role !== RoleEnum.INSTRUCTOR) {
            throw new ForbiddenException(`User with ID '${instructorId}' is not authorized to create courses (role: ${instructor.role})`);
        }
        return instructor;
    }
    async ensureSlugNotTaken(slug, session) {
        const normalizedSlug = slug.toLowerCase().trim();
        const existing = await this.courseRepository.findBySlug(normalizedSlug, session);
        if (existing) {
            throw new ConflictException(`Course with slug '${normalizedSlug}' already exists`);
        }
    }
    async findBySlug(slug, session) {
        return this.courseRepository.findBySlug(slug, session);
    }
    async findByInstructorId(instructorId, session) {
        const courses = await this.courseRepository.findByInstructorId(instructorId, session);
        if (!courses || courses.length === 0)
            return [];
        const courseIds = courses.map((c) => c.id);
        const countMap = await this.enrollmentRepository.countByCourseIds(courseIds);
        return courses.map((course) => ({
            ...course,
            studentsCount: countMap.get(course.id) ?? 0,
        }));
    }
    async getCourseDetailForInstructor(courseId, currentUserId, currentUserRole, session) {
        let course = null;
        try {
            course = await this.courseRepository.findById(courseId, session);
        }
        catch {
            throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
        }
        if (!course || course.deletedAt) {
            throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
        }
        if (currentUserRole !== RoleEnum.ADMIN && course.instructorId !== currentUserId) {
            throw new ForbiddenException('Bạn không có quyền truy cập khóa học này');
        }
        const studentsCount = await this.enrollmentRepository.countByCourseId(course.id);
        return {
            ...course,
            studentsCount,
        };
    }
    async createCourse(input, session) {
        await this.validateInstructor(input.instructorId, session);
        if (input.price !== undefined && input.price < 0) {
            throw new BadRequestException('Course price must be greater than or equal to 0');
        }
        await this.validateCategoryForAssignment(input.categoryId, session);
        const baseSlug = (input.slug && input.slug.trim()) || input.title;
        const finalSlug = await this.generateUniqueSlug(baseSlug, undefined, session);
        return this.create({
            title: input.title.trim(),
            slug: finalSlug,
            instructorId: input.instructorId,
            description: input.description ?? null,
            thumbnailUrl: input.thumbnailUrl ?? null,
            price: input.price ?? 0,
            status: input.status ?? CourseStatusEnum.DRAFT,
            level: input.level ?? CourseLevelEnum.ALL_LEVELS,
            categoryId: input.categoryId ?? null,
        }, session);
    }
    async createSection(courseId, dto, userId, role, session) {
        let course = null;
        try {
            course = await this.courseRepository.findById(courseId, session);
        }
        catch {
            throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
        }
        if (!course || course.deletedAt) {
            throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
        }
        if (role !== RoleEnum.ADMIN && course.instructorId !== userId) {
            throw new ForbiddenException('Bạn không có quyền thêm chương học vào khóa học này');
        }
        if (course.status === CourseStatusEnum.PENDING_APPROVAL) {
            throw new ConflictException('Khóa học đang trong quá trình chờ phê duyệt, không thể thêm chương học.');
        }
        let targetOrder = dto.order;
        if (targetOrder === undefined || targetOrder === null) {
            const existingSections = await this.sectionRepository.findByCourseId(courseId, session);
            targetOrder = existingSections.length;
        }
        const section = await this.sectionRepository.create({
            courseId: course.id,
            title: dto.title,
            description: dto.description ?? null,
            order: targetOrder,
            createdById: userId,
            updatedById: userId,
        }, session);
        return section;
    }
    async reorderSections(courseId, dto, userId, role, session) {
        let course = null;
        try {
            course = await this.courseRepository.findById(courseId, session);
        }
        catch {
            throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
        }
        if (!course || course.deletedAt) {
            throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
        }
        if (role !== RoleEnum.ADMIN && course.instructorId !== userId) {
            throw new ForbiddenException('Bạn không có quyền sắp xếp chương học của khóa học này');
        }
        if (course.status === CourseStatusEnum.PENDING_APPROVAL) {
            throw new ConflictException('Khóa học đang trong quá trình chờ phê duyệt, không thể sắp xếp lại chương học.');
        }
        const uniqueIds = new Set(dto.sectionIds);
        if (uniqueIds.size !== dto.sectionIds.length) {
            throw new BadRequestException('Danh sách ID chương học chứa các phần tử trùng lặp');
        }
        const existingSections = await this.sectionRepository.findByCourseId(courseId, session);
        const existingIds = new Set(existingSections.map((s) => s.id));
        const allBelong = dto.sectionIds.every((id) => existingIds.has(id));
        if (!allBelong || dto.sectionIds.length !== existingSections.length) {
            throw new BadRequestException('Danh sách ID chương học không hợp lệ hoặc không khớp với các chương hiện có của khóa học');
        }
        return this.sectionRepository.reorderSections(courseId, dto.sectionIds, userId, session);
    }
    async updateSection(courseId, sectionId, dto, userId, role, session) {
        let course = null;
        try {
            course = await this.courseRepository.findById(courseId, session);
        }
        catch {
            throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
        }
        if (!course || course.deletedAt) {
            throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
        }
        if (role !== RoleEnum.ADMIN && course.instructorId !== userId) {
            throw new ForbiddenException('Bạn không có quyền chỉnh sửa chương học của khóa học này');
        }
        if (course.status === CourseStatusEnum.PENDING_APPROVAL) {
            throw new ConflictException('Khóa học đang trong quá trình chờ phê duyệt, không thể chỉnh sửa chương học.');
        }
        let section = null;
        try {
            section = await this.sectionRepository.findById(sectionId, session);
        }
        catch {
            throw new NotFoundException(`Không tìm thấy chương học với ID '${sectionId}'`);
        }
        if (!section || section.deletedAt || section.courseId !== courseId) {
            throw new NotFoundException(`Không tìm thấy chương học với ID '${sectionId}' trong khóa học này`);
        }
        const updatePayload = {
            updatedById: userId,
        };
        if (dto.title !== undefined) {
            updatePayload.title = dto.title;
        }
        if (dto.description !== undefined) {
            updatePayload.description = dto.description ?? null;
        }
        if (dto.order !== undefined) {
            updatePayload.order = dto.order;
        }
        const updatedSection = await this.sectionRepository.update(sectionId, updatePayload, session);
        if (!updatedSection) {
            throw new NotFoundException(`Không tìm thấy chương học với ID '${sectionId}'`);
        }
        return updatedSection;
    }
    async deleteSection(courseId, sectionId, userId, role) {
        let course = null;
        try {
            course = await this.courseRepository.findById(courseId);
        }
        catch {
            throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
        }
        if (!course || course.deletedAt) {
            throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
        }
        if (role !== RoleEnum.ADMIN && course.instructorId !== userId) {
            throw new ForbiddenException('Bạn không có quyền xóa chương học của khóa học này');
        }
        if (course.status === CourseStatusEnum.PENDING_APPROVAL) {
            throw new ConflictException('Khóa học đang trong quá trình chờ phê duyệt, không thể xóa chương học.');
        }
        let section = null;
        try {
            section = await this.sectionRepository.findById(sectionId);
        }
        catch {
            throw new NotFoundException(`Không tìm thấy chương học với ID '${sectionId}'`);
        }
        if (!section || section.deletedAt || section.courseId !== courseId) {
            throw new NotFoundException(`Không tìm thấy chương học với ID '${sectionId}' trong khóa học này`);
        }
        const lessons = await this.lessonRepository.findBySectionId(sectionId);
        const filesToDelete = [];
        for (const lesson of lessons) {
            if (lesson.content?.url) {
                filesToDelete.push(lesson.content.url);
            }
            if (lesson.content?.publicId) {
                filesToDelete.push(lesson.content.publicId);
            }
        }
        await this.courseRepository.withTransaction(async (session) => {
            await this.sectionRepository.softDelete(sectionId, userId, session);
            await this.lessonRepository.softDeleteBySectionId(sectionId, userId, session);
            await this.sectionRepository.shiftOrdersAfterDelete(courseId, section.order, userId, session);
        });
        for (const fileKeyOrUrl of filesToDelete) {
            try {
                await this.storageService.deleteFile(fileKeyOrUrl);
            }
            catch (err) {
                this.logger.warn(`Lỗi khi dọn dẹp file MinIO '${fileKeyOrUrl}': ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        return true;
    }
    async deleteCourse(courseId, userId, role) {
        let course = null;
        try {
            course = await this.courseRepository.findById(courseId);
        }
        catch {
            throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
        }
        if (!course || course.deletedAt) {
            throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
        }
        if (role !== RoleEnum.ADMIN && course.instructorId !== userId) {
            throw new ForbiddenException('Bạn không có quyền xóa khóa học này');
        }
        if (course.status === CourseStatusEnum.PENDING_APPROVAL) {
            throw new ConflictException('Khóa học đang trong quá trình chờ phê duyệt, không thể xóa. Vui lòng rút/hủy yêu cầu duyệt trước.');
        }
        const studentsCount = await this.enrollmentRepository.countByCourseId(courseId);
        if (studentsCount > 0) {
            throw new BadRequestException(`Khóa học đã có ${studentsCount} học viên đăng ký hoặc mua. Không thể xóa để bảo đảm quyền lợi học tập của học viên. Vui lòng chọn "Ngừng bán" (Lưu trữ) để ẩn khóa học.`);
        }
        const filesToDelete = [];
        if (course.thumbnailUrl) {
            filesToDelete.push(course.thumbnailUrl);
        }
        if (course.trailerUrl) {
            filesToDelete.push(course.trailerUrl);
        }
        const sections = await this.sectionRepository.findByCourseId(courseId);
        const sectionIds = sections.map((s) => s.id);
        const lessons = await this.lessonRepository.findBySectionIds(sectionIds);
        for (const lesson of lessons) {
            if (lesson.content?.url)
                filesToDelete.push(lesson.content.url);
            if (lesson.content?.publicId)
                filesToDelete.push(lesson.content.publicId);
            if (lesson.materials && Array.isArray(lesson.materials)) {
                for (const mat of lesson.materials) {
                    if (mat.url)
                        filesToDelete.push(mat.url);
                }
            }
        }
        await this.courseRepository.withTransaction(async (session) => {
            await this.courseRepository.softDelete(courseId, userId, session);
            await this.sectionRepository.softDeleteByCourseId(courseId, userId, session);
            if (sectionIds.length > 0) {
                await this.lessonRepository.softDeleteBySectionIds(sectionIds, userId, session);
            }
            await this.courseMindmapRepository.softDeleteByCourseId(courseId, userId, session);
        });
        for (const fileKeyOrUrl of filesToDelete) {
            try {
                await this.storageService.deleteFile(fileKeyOrUrl);
            }
            catch (err) {
                this.logger.warn(`Lỗi khi dọn dẹp file MinIO '${fileKeyOrUrl}': ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        return true;
    }
    async archiveCourse(courseId, userId, role) {
        const course = await this.getCourseDetailForInstructor(courseId, userId, role);
        if (course.status !== CourseStatusEnum.PUBLISHED) {
            throw new ConflictException('Chỉ có thể ngừng bán khi khóa học đang ở trạng thái đã xuất bản.');
        }
        const updated = await this.courseRepository.updateStatus(courseId, CourseStatusEnum.PUBLISHED, CourseStatusEnum.ARCHIVED, userId);
        if (!updated) {
            throw new ConflictException('Không thể chuyển trạng thái khóa học. Vui lòng thử lại.');
        }
        const studentsCount = await this.enrollmentRepository.countByCourseId(courseId);
        return { ...updated, studentsCount };
    }
    async unarchiveCourse(courseId, userId, role) {
        const course = await this.getCourseDetailForInstructor(courseId, userId, role);
        if (course.status !== CourseStatusEnum.ARCHIVED) {
            throw new ConflictException('Chỉ có thể mở bán lại khi khóa học đang ở trạng thái ngừng bán.');
        }
        await this.assertQuizTimings(courseId);
        const updated = await this.courseRepository.updateStatus(courseId, CourseStatusEnum.ARCHIVED, CourseStatusEnum.PUBLISHED, userId);
        if (!updated) {
            throw new ConflictException('Không thể mở bán lại khóa học. Vui lòng thử lại.');
        }
        const studentsCount = await this.enrollmentRepository.countByCourseId(courseId);
        return { ...updated, studentsCount };
    }
    async getSectionsByCourseId(courseId, session) {
        let course = null;
        try {
            course = await this.courseRepository.findById(courseId, session);
        }
        catch {
            throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
        }
        if (!course || course.deletedAt) {
            throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
        }
        return this.sectionRepository.findByCourseId(courseId, session);
    }
    async updateCourseThumbnail(courseId, userId, role, file, session) {
        const course = await this.getCourseDetailForInstructor(courseId, userId, role, session);
        if (course.status === CourseStatusEnum.PENDING_APPROVAL) {
            throw new ConflictException('Khóa học đang trong quá trình chờ phê duyệt, không thể thay đổi ảnh bìa.');
        }
        const oldThumbnailUrl = course.thumbnailUrl;
        const newThumbnailUrl = await this.storageService.uploadImage(file, {
            subFolder: 'courses/thumbnail',
            width: 1280,
            height: 720,
            quality: 85,
        });
        if (oldThumbnailUrl) {
            this.storageService.deleteFile(oldThumbnailUrl).catch((err) => {
                this.logger.warn(`Không thể xóa ảnh thumbnail cũ: ${err instanceof Error ? err.message : String(err)}`);
            });
        }
        return this.updateOrFail(courseId, { thumbnailUrl: newThumbnailUrl }, session);
    }
    async updateCourseTrailer(courseId, userId, role, file, session) {
        const course = await this.getCourseDetailForInstructor(courseId, userId, role, session);
        if (course.status === CourseStatusEnum.PENDING_APPROVAL) {
            throw new ConflictException('Khóa học đang trong quá trình chờ phê duyệt, không thể thay đổi video trailer.');
        }
        const oldTrailerUrl = course.trailerUrl;
        const lessonContent = await this.storageService.uploadLessonMedia(file, 'courses/trailer');
        if (oldTrailerUrl) {
            this.storageService.deleteFile(oldTrailerUrl).catch((err) => {
                this.logger.warn(`Không thể xóa video trailer cũ: ${err instanceof Error ? err.message : String(err)}`);
            });
        }
        return this.updateOrFail(courseId, { trailerUrl: lessonContent.url }, session);
    }
    async generateUniqueSlug(baseSlug, excludeCourseId, session) {
        const normalized = slugify(baseSlug) || 'khoa-hoc';
        const conflictingSlugs = await this.courseRepository.findConflictingSlugs(normalized, excludeCourseId, session);
        if (!conflictingSlugs || conflictingSlugs.length === 0) {
            return normalized;
        }
        const conflictingSet = new Set(conflictingSlugs);
        if (!conflictingSet.has(normalized)) {
            return normalized;
        }
        let suffix = 2;
        while (conflictingSet.has(`${normalized}-${suffix}`)) {
            suffix++;
        }
        return `${normalized}-${suffix}`;
    }
    async updateCourse(courseId, dto, userId, role, session) {
        const course = await this.getCourseDetailForInstructor(courseId, userId, role, session);
        if (course.status === CourseStatusEnum.PENDING_APPROVAL) {
            throw new ConflictException('Khóa học đang trong quá trình chờ phê duyệt, không thể chỉnh sửa thông tin.');
        }
        if (dto.status !== undefined) {
            if (!Object.values(CourseStatusEnum).includes(dto.status)) {
                throw new BadRequestException('Trạng thái khóa học không hợp lệ');
            }
            if (dto.status !== course.status && role !== RoleEnum.ADMIN) {
                throw new ForbiddenException('Vui lòng sử dụng chức năng yêu cầu phê duyệt để gửi khóa học.');
            }
            if (dto.status === CourseStatusEnum.PENDING_APPROVAL) {
                throw new BadRequestException('Cần kiểm tra điều kiện qua chức năng yêu cầu phê duyệt.');
            }
            if (dto.status === CourseStatusEnum.PUBLISHED && course.status !== CourseStatusEnum.PUBLISHED) {
                await this.assertQuizTimings(courseId);
            }
        }
        const targetPrice = dto.price !== undefined ? dto.price : course.price;
        const targetOriginalPrice = dto.originalPrice !== undefined ? dto.originalPrice : course.originalPrice;
        if (dto.price !== undefined && dto.price < 0) {
            throw new BadRequestException('Giá khóa học không được nhỏ hơn 0');
        }
        if (dto.originalPrice !== undefined && dto.originalPrice !== null && dto.originalPrice < 0) {
            throw new BadRequestException('Giá gốc khóa học không được nhỏ hơn 0');
        }
        if (targetOriginalPrice !== null &&
            targetOriginalPrice !== undefined &&
            targetPrice > targetOriginalPrice) {
            throw new BadRequestException('Giá bán không được lớn hơn giá gốc');
        }
        let updatedSlug = undefined;
        if (dto.slug) {
            const normalizedSlug = slugify(dto.slug);
            if (normalizedSlug !== course.slug) {
                const conflicting = await this.courseRepository.findConflictingSlugs(normalizedSlug, courseId, session);
                if (conflicting.includes(normalizedSlug)) {
                    throw new ConflictException(`Đường dẫn slug '${normalizedSlug}' đã tồn tại`);
                }
                updatedSlug = normalizedSlug;
            }
        }
        else if (dto.title && dto.title.trim() !== course.title) {
            updatedSlug = await this.generateUniqueSlug(dto.title.trim(), courseId, session);
        }
        const updateData = {};
        if (dto.title !== undefined)
            updateData.title = dto.title.trim();
        if (updatedSlug !== undefined)
            updateData.slug = updatedSlug;
        if (dto.description !== undefined)
            updateData.description = dto.description;
        if (dto.thumbnailUrl !== undefined)
            updateData.thumbnailUrl = dto.thumbnailUrl;
        if (dto.trailerUrl !== undefined)
            updateData.trailerUrl = dto.trailerUrl;
        if (dto.price !== undefined)
            updateData.price = dto.price;
        if (dto.originalPrice !== undefined)
            updateData.originalPrice = dto.originalPrice;
        if (dto.level !== undefined)
            updateData.level = dto.level;
        if (dto.status !== undefined)
            updateData.status = dto.status;
        if (dto.categoryId !== undefined) {
            if (dto.categoryId === null) {
                updateData.categoryId = null;
            }
            else {
                await this.validateCategoryForAssignment(dto.categoryId, session);
                updateData.categoryId = dto.categoryId;
            }
        }
        return this.updateOrFail(courseId, updateData, session);
    }
    async getAdminCourseStats(session) {
        return this.courseRepository.getAdminCourseStats(session);
    }
    async findAdminCourses(query, session) {
        return this.courseRepository.findAdminCoursesWithPagination(query, session);
    }
    async approveCourse(courseId, adminId, session) {
        await this.assertQuizTimings(courseId);
        const updated = await this.courseRepository.approveCourse(courseId, adminId, session);
        if (!updated) {
            const existing = await this.courseRepository.findById(courseId, session);
            if (!existing) {
                throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
            }
            throw new ConflictException('Khóa học đã được xử lý bởi quản trị viên khác hoặc không ở trạng thái chờ duyệt.');
        }
        await this.courseApprovalHistoryRepository.createHistory({
            courseId: updated.id,
            adminId,
            instructorId: updated.instructorId,
            action: CourseApprovalActionEnum.APPROVED,
            previousStatus: CourseStatusEnum.PENDING_APPROVAL,
            targetStatus: CourseStatusEnum.PUBLISHED,
            reason: null,
        }, session);
        return updated;
    }
    async assertQuizTimings(courseId) {
        const sections = await this.sectionRepository.findByCourseId(courseId);
        const lessons = await this.lessonRepository.findBySectionIds(sections.map((section) => section.id));
        const quizzes = await this.lessonQuizRepository.findByLessonIds(lessons.map((lesson) => lesson.id));
        const requirement = buildQuizTimingRequirement(sections, lessons, quizzes);
        if (!requirement.complete) {
            throw new BadRequestException({
                message: `Còn ${requirement.issues.length} câu hỏi tương tác video chưa có thời điểm xuất hiện hợp lệ.`,
                requirement,
            });
        }
    }
    async rejectCourse(courseId, adminId, reason, session) {
        const updated = await this.courseRepository.rejectCourse(courseId, adminId, reason, session);
        if (!updated) {
            const existing = await this.courseRepository.findById(courseId, session);
            if (!existing) {
                throw new NotFoundException(`Không tìm thấy khóa học với ID '${courseId}'`);
            }
            throw new ConflictException('Khóa học đã được xử lý bởi quản trị viên khác hoặc không ở trạng thái chờ duyệt.');
        }
        await this.courseApprovalHistoryRepository.createHistory({
            courseId: updated.id,
            adminId,
            instructorId: updated.instructorId,
            action: CourseApprovalActionEnum.REJECTED,
            previousStatus: CourseStatusEnum.PENDING_APPROVAL,
            targetStatus: CourseStatusEnum.DRAFT,
            reason: reason.trim(),
        }, session);
        return updated;
    }
    async findPublicCourses(query, session) {
        let categoryId = null;
        if (query.category) {
            const isObjectId = /^[0-9a-fA-F]{24}$/.test(query.category);
            if (isObjectId) {
                categoryId = query.category;
            }
            else {
                const cat = await this.courseCategoryRepository.findBySlug(query.category, session);
                categoryId = cat?.id ?? null;
            }
        }
        const paginated = await this.courseRepository.findPublicCoursesWithPagination(query, categoryId, session);
        const courseIds = paginated.items.map((c) => c.id);
        if (courseIds.length > 0) {
            const [countMap, videoStats] = await Promise.all([
                this.enrollmentRepository.countByCourseIds(courseIds),
                this.lessonRepository.getCourseVideoStats(courseIds),
            ]);
            const videoStatsMap = new Map(videoStats.map((s) => [s.courseId, s]));
            paginated.items = paginated.items.map((c) => {
                const stats = videoStatsMap.get(c.id);
                const totalDuration = c.totalDuration ?? stats?.totalSeconds ?? 0;
                return {
                    ...c,
                    studentsCount: countMap.get(c.id) ?? c.studentsCount ?? 0,
                    totalDuration,
                    lessonsCount: stats?.videoCount ?? c.lessonsCount ?? 0,
                };
            });
        }
        return paginated;
    }
    async getPublicCourseDetail(idOrSlug, viewerRole, session) {
        const course = await this.courseRepository.findPublicCourseDetail(idOrSlug, session, viewerRole === RoleEnum.ADMIN);
        if (!course) {
            throw new NotFoundException('Không tìm thấy khóa học công khai');
        }
        const [sections, studentsCount] = await Promise.all([
            this.sectionRepository.findByCourseId(course.id, session),
            this.enrollmentRepository.countByCourseId(course.id),
        ]);
        const sectionsWithLessons = await Promise.all(sections.map(async (sec) => {
            const lessons = await this.lessonRepository.findBySectionId(sec.id, session);
            return {
                ...sec,
                lessons: lessons.map((l) => ({
                    id: l.id,
                    title: l.title,
                    order: l.order,
                    duration: l.content?.duration ?? 0,
                    isPreview: l.isPreview,
                    type: l.content?.type ?? null,
                })),
            };
        }));
        return {
            ...course,
            studentsCount,
            sections: sectionsWithLessons,
        };
    }
    async findAdminCourseApprovalHistories(query, session) {
        return this.courseApprovalHistoryRepository.findAdminHistoriesWithPagination(query, session);
    }
    async getAdminCourseApprovalHistoryStats(session) {
        return this.courseApprovalHistoryRepository.getStats(session);
    }
    async getCourseApprovalHistories(courseId, session) {
        return this.courseApprovalHistoryRepository.findByCourseId(courseId, session);
    }
};
CourseService = CourseService_1 = __decorate([
    Injectable(),
    __param(5, Inject(forwardRef(() => EnrollmentRepository))),
    __metadata("design:paramtypes", [CourseRepository,
        CourseCategoryRepository,
        SectionRepository,
        LessonRepository,
        CourseMindmapRepository,
        EnrollmentRepository,
        UserRepository,
        StorageService,
        CourseApprovalHistoryRepository,
        ClsService,
        LessonQuizRepository])
], CourseService);
export { CourseService };
//# sourceMappingURL=course.service.js.map
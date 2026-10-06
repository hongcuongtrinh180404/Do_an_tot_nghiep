import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import {
  RoleEnum,
  CourseLevelEnum,
  CourseStatusEnum,
  ICourse,
  ILessonContent,
  LessonContentTypeEnum,
} from 'share-lib';
import { CourseService } from '../services/course.service.js';
import { CourseRepository } from '../repositories/course.repository.js';
import { SectionRepository } from '../repositories/section.repository.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { StorageService } from '../../storage/index.js';
import { CourseImageValidationPipe } from '../pipes/course-image-validation.pipe.js';
import { CourseTrailerValidationPipe } from '../pipes/course-trailer-validation.pipe.js';

describe('Course Media Upload (Thumbnail & Trailer)', () => {
  let service: CourseService;
  let mockCourseRepository: {
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let mockSectionRepository: {
    create: ReturnType<typeof vi.fn>;
    findByCourseId: ReturnType<typeof vi.fn>;
    reorderSections: ReturnType<typeof vi.fn>;
  };
  let mockUserRepository: {
    findById: ReturnType<typeof vi.fn>;
  };
  let mockStorageService: {
    uploadImage: ReturnType<typeof vi.fn>;
    uploadLessonMedia: ReturnType<typeof vi.fn>;
    deleteFile: ReturnType<typeof vi.fn>;
  };
  let mockCls: { get: ReturnType<typeof vi.fn> };

  const sampleCourse: ICourse = {
    id: 'course_123',
    title: 'Khóa học Lập trình Web Fullstack',
    slug: 'khoa-hoc-lap-trinh-web-fullstack',
    instructorId: 'instructor_1',
    description: 'Chi tiết khóa học',
    shortDescription: 'Mô tả ngắn',
    thumbnailUrl: 'http://localhost:9000/thc-datn-media/courses/thumbnail/old-thumb.webp',
    trailerUrl: 'http://localhost:9000/thc-datn-media/courses/trailer/old-trailer.mp4',
    price: 299000,
    status: CourseStatusEnum.DRAFT,
    level: CourseLevelEnum.BEGINNER,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const dummyImageFile = {
    buffer: Buffer.from('fake-image-bytes'),
    mimetype: 'image/jpeg',
    size: 1024 * 1024, // 1MB
    originalname: 'thumbnail.jpg',
  } as Express.Multer.File;

  const dummyVideoFile = {
    buffer: Buffer.from('fake-video-bytes'),
    mimetype: 'video/mp4',
    size: 50 * 1024 * 1024, // 50MB
    originalname: 'trailer.mp4',
  } as Express.Multer.File;

  beforeEach(() => {
    mockCourseRepository = {
      findById: vi.fn(),
      update: vi.fn(),
    };
    mockSectionRepository = {
      create: vi.fn(),
      findByCourseId: vi.fn(),
      reorderSections: vi.fn(),
    };
    mockUserRepository = {
      findById: vi.fn(),
    };
    mockStorageService = {
      uploadImage: vi.fn(),
      uploadLessonMedia: vi.fn(),
      deleteFile: vi.fn().mockResolvedValue(true),
    };
    mockCls = {
      get: vi.fn().mockReturnValue('instructor_1'),
    };

    const mockLessonRepository = {
      findBySectionId: vi.fn(),
      softDeleteBySectionId: vi.fn(),
    };

    service = new CourseService(
      mockCourseRepository as unknown as CourseRepository,
      mockSectionRepository as unknown as SectionRepository,
      mockLessonRepository as unknown as LessonRepository,
      mockUserRepository as unknown as UserRepository,
      mockStorageService as unknown as StorageService,
      mockCls as unknown as ClsService,
    );
  });

  describe('updateCourseThumbnail', () => {
    it('should successfully upload thumbnail to courses/thumbnail and update course', async () => {
      mockCourseRepository.findById.mockResolvedValue(sampleCourse);
      const newUrl = 'http://localhost:9000/thc-datn-media/courses/thumbnail/new-uuid.webp';
      mockStorageService.uploadImage.mockResolvedValue(newUrl);

      const updatedCourse: ICourse = { ...sampleCourse, thumbnailUrl: newUrl };
      mockCourseRepository.update.mockResolvedValue(updatedCourse);

      const result = await service.updateCourseThumbnail(
        'course_123',
        'instructor_1',
        RoleEnum.INSTRUCTOR,
        dummyImageFile,
      );

      expect(mockCourseRepository.findById).toHaveBeenCalledWith('course_123', undefined);
      expect(mockStorageService.uploadImage).toHaveBeenCalledWith(dummyImageFile, {
        subFolder: 'courses/thumbnail',
        width: 1280,
        height: 720,
        quality: 85,
      });
      expect(mockStorageService.deleteFile).toHaveBeenCalledWith(sampleCourse.thumbnailUrl);
      expect(mockCourseRepository.update).toHaveBeenCalledWith(
        'course_123',
        expect.objectContaining({ thumbnailUrl: newUrl }),
        undefined,
      );
      expect(result.thumbnailUrl).toBe(newUrl);
    });

    it('should allow ADMIN to update thumbnail even if not the course instructor', async () => {
      mockCourseRepository.findById.mockResolvedValue(sampleCourse);
      const newUrl = 'http://localhost:9000/thc-datn-media/courses/thumbnail/admin-upload.webp';
      mockStorageService.uploadImage.mockResolvedValue(newUrl);
      mockCourseRepository.update.mockResolvedValue({ ...sampleCourse, thumbnailUrl: newUrl });

      const result = await service.updateCourseThumbnail(
        'course_123',
        'admin_999',
        RoleEnum.ADMIN,
        dummyImageFile,
      );

      expect(result.thumbnailUrl).toBe(newUrl);
    });

    it('should throw ForbiddenException if user is neither course owner nor ADMIN', async () => {
      mockCourseRepository.findById.mockResolvedValue(sampleCourse);

      await expect(
        service.updateCourseThumbnail(
          'course_123',
          'other_instructor',
          RoleEnum.INSTRUCTOR,
          dummyImageFile,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockStorageService.uploadImage).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if course does not exist', async () => {
      mockCourseRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateCourseThumbnail(
          'non_existent',
          'instructor_1',
          RoleEnum.INSTRUCTOR,
          dummyImageFile,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockStorageService.uploadImage).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if course is soft deleted', async () => {
      mockCourseRepository.findById.mockResolvedValue({
        ...sampleCourse,
        deletedAt: new Date(),
      });

      await expect(
        service.updateCourseThumbnail(
          'course_123',
          'instructor_1',
          RoleEnum.INSTRUCTOR,
          dummyImageFile,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockStorageService.uploadImage).not.toHaveBeenCalled();
    });
  });

  describe('updateCourseTrailer', () => {
    const mockLessonContent: ILessonContent = {
      type: LessonContentTypeEnum.VIDEO,
      url: 'http://localhost:9000/thc-datn-media/courses/trailer/new-trailer.mp4',
      publicId: 'courses/trailer/new-trailer.mp4',
      fileName: 'trailer.mp4',
      fileSize: dummyVideoFile.size,
      mimeType: dummyVideoFile.mimetype,
    };

    it('should successfully upload trailer to courses/trailer and update course', async () => {
      mockCourseRepository.findById.mockResolvedValue(sampleCourse);
      mockStorageService.uploadLessonMedia.mockResolvedValue(mockLessonContent);

      const updatedCourse: ICourse = { ...sampleCourse, trailerUrl: mockLessonContent.url };
      mockCourseRepository.update.mockResolvedValue(updatedCourse);

      const result = await service.updateCourseTrailer(
        'course_123',
        'instructor_1',
        RoleEnum.INSTRUCTOR,
        dummyVideoFile,
      );

      expect(mockCourseRepository.findById).toHaveBeenCalledWith('course_123', undefined);
      expect(mockStorageService.uploadLessonMedia).toHaveBeenCalledWith(
        dummyVideoFile,
        'courses/trailer',
      );
      expect(mockStorageService.deleteFile).toHaveBeenCalledWith(sampleCourse.trailerUrl);
      expect(mockCourseRepository.update).toHaveBeenCalledWith(
        'course_123',
        expect.objectContaining({ trailerUrl: mockLessonContent.url }),
        undefined,
      );
      expect(result.trailerUrl).toBe(mockLessonContent.url);
    });

    it('should allow ADMIN to update trailer', async () => {
      mockCourseRepository.findById.mockResolvedValue(sampleCourse);
      mockStorageService.uploadLessonMedia.mockResolvedValue(mockLessonContent);
      mockCourseRepository.update.mockResolvedValue({
        ...sampleCourse,
        trailerUrl: mockLessonContent.url,
      });

      const result = await service.updateCourseTrailer(
        'course_123',
        'admin_999',
        RoleEnum.ADMIN,
        dummyVideoFile,
      );

      expect(result.trailerUrl).toBe(mockLessonContent.url);
    });

    it('should throw ForbiddenException if user is neither course owner nor ADMIN', async () => {
      mockCourseRepository.findById.mockResolvedValue(sampleCourse);

      await expect(
        service.updateCourseTrailer(
          'course_123',
          'other_instructor',
          RoleEnum.INSTRUCTOR,
          dummyVideoFile,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockStorageService.uploadLessonMedia).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if course does not exist', async () => {
      mockCourseRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateCourseTrailer(
          'non_existent',
          'instructor_1',
          RoleEnum.INSTRUCTOR,
          dummyVideoFile,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('CourseImageValidationPipe', () => {
    const pipe = new CourseImageValidationPipe();

    it('should pass valid image file', () => {
      const file = {
        buffer: Buffer.from('abc'),
        mimetype: 'image/png',
        size: 5 * 1024 * 1024,
      } as Express.Multer.File;

      expect(pipe.transform(file)).toBe(file);
    });

    it('should reject file if buffer is missing', () => {
      expect(() => pipe.transform({} as Express.Multer.File)).toThrow(BadRequestException);
    });

    it('should reject unsupported mime type', () => {
      const file = {
        buffer: Buffer.from('abc'),
        mimetype: 'video/mp4',
        size: 1024,
      } as Express.Multer.File;

      expect(() => pipe.transform(file)).toThrow(BadRequestException);
    });

    it('should reject image exceeding 10MB', () => {
      const file = {
        buffer: Buffer.from('abc'),
        mimetype: 'image/jpeg',
        size: 11 * 1024 * 1024,
      } as Express.Multer.File;

      expect(() => pipe.transform(file)).toThrow(BadRequestException);
    });
  });

  describe('CourseTrailerValidationPipe', () => {
    const pipe = new CourseTrailerValidationPipe();

    it('should pass valid video file and sanitize originalname', () => {
      const file = {
        buffer: Buffer.from('abc'),
        mimetype: 'video/mp4',
        size: 100 * 1024 * 1024,
        originalname: 'my:trailer?.mp4',
      } as Express.Multer.File;

      const result = pipe.transform(file);
      expect(result.mimetype).toBe('video/mp4');
      expect(result.originalname).toBe('my_trailer_.mp4');
    });

    it('should reject non-video mime type', () => {
      const file = {
        buffer: Buffer.from('abc'),
        mimetype: 'image/png',
        size: 1024,
      } as Express.Multer.File;

      expect(() => pipe.transform(file)).toThrow(BadRequestException);
    });

    it('should reject video exceeding 600MB', () => {
      const file = {
        buffer: Buffer.from('abc'),
        mimetype: 'video/mp4',
        size: 650 * 1024 * 1024,
      } as Express.Multer.File;

      expect(() => pipe.transform(file)).toThrow(BadRequestException);
    });
  });
});

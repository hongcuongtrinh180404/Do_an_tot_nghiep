import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import { ILesson, ISection, ICourse, RoleEnum, LessonContentTypeEnum } from 'share-lib';
import { LessonService, CreateLessonInput } from '../services/lesson.service.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { SectionRepository } from '../repositories/section.repository.js';
import { CourseRepository } from '../repositories/course.repository.js';
import { StorageService } from '../../storage/index.js';

describe('LessonService', () => {
  let service: LessonService;
  let mockLessonRepository: {
    create: ReturnType<typeof vi.fn>;
    findBySectionId: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    addMaterial: ReturnType<typeof vi.fn>;
    deleteMaterial: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
    reorderAfterDelete: ReturnType<typeof vi.fn>;
    withTransaction: ReturnType<typeof vi.fn>;
  };
  let mockSectionRepository: {
    findById: ReturnType<typeof vi.fn>;
  };
  let mockCourseRepository: {
    findById: ReturnType<typeof vi.fn>;
  };
  let mockStorageService: {
    uploadLessonMedia: ReturnType<typeof vi.fn>;
    deleteFile: ReturnType<typeof vi.fn>;
  };
  let mockCls: {
    get: ReturnType<typeof vi.fn>;
  };

  const sampleSection: ISection = {
    id: 'section_100',
    courseId: 'course_100',
    title: 'Chương 1: Tổng quan',
    description: 'Mô tả chương 1',
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const sampleLesson: ILesson = {
    id: 'lesson_100',
    sectionId: 'section_100',
    title: 'Bài 1: Giới thiệu khóa học',
    description: 'Mô tả bài 1',
    order: 0,
    content: null,
    isPreview: false,
    materials: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdById: 'user_1',
    updatedById: 'user_1',
  };

  beforeEach(() => {
    mockLessonRepository = {
      create: vi.fn(),
      findBySectionId: vi.fn(),
      findById: vi.fn(),
      addMaterial: vi.fn(),
      deleteMaterial: vi.fn(),
      softDelete: vi.fn().mockResolvedValue(true),
      reorderAfterDelete: vi.fn().mockResolvedValue(1),
      withTransaction: vi.fn().mockImplementation(async (cb) => cb(undefined)),
    };

    mockSectionRepository = {
      findById: vi.fn(),
    };

    mockCourseRepository = {
      findById: vi.fn(),
    };

    mockStorageService = {
      uploadLessonMedia: vi.fn(),
      deleteFile: vi.fn(),
    };

    mockCls = {
      get: vi.fn().mockReturnValue('user_1'),
    };

    service = new LessonService(
      mockLessonRepository as unknown as LessonRepository,
      mockSectionRepository as unknown as SectionRepository,
      mockCls as unknown as ClsService,
      mockStorageService as unknown as StorageService,
      mockCourseRepository as unknown as CourseRepository,
    );
  });

  describe('createLesson', () => {
    const validInput: CreateLessonInput = {
      title: '  Bài 1: Giới thiệu khóa học  ',
      description: '  Mô tả bài 1  ',
      order: 0,
      userId: 'user_1',
    };

    it('1. should create lesson successfully when section exists and data is valid', async () => {
      mockSectionRepository.findById.mockResolvedValue(sampleSection);
      mockLessonRepository.create.mockResolvedValue(sampleLesson);

      const result = await service.createLesson('section_100', validInput);

      expect(mockSectionRepository.findById).toHaveBeenCalledWith('section_100', undefined);
      expect(mockLessonRepository.create).toHaveBeenCalledWith(
        {
          sectionId: 'section_100',
          title: 'Bài 1: Giới thiệu khóa học',
          description: 'Mô tả bài 1',
          order: 0,
          content: null,
          isPreview: false,
          createdById: 'user_1',
          updatedById: 'user_1',
        },
        undefined,
      );
      expect(result).toEqual(sampleLesson);
    });

    it('2. should use CLS userId when input.userId is not provided', async () => {
      mockSectionRepository.findById.mockResolvedValue(sampleSection);
      mockLessonRepository.create.mockResolvedValue(sampleLesson);

      const inputWithoutUser: CreateLessonInput = {
        title: 'Bài 2',
        order: 1,
      };

      await service.createLesson('section_100', inputWithoutUser);

      expect(mockLessonRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          createdById: 'user_1',
          updatedById: 'user_1',
        }),
        undefined,
      );
    });

    it('3. should normalize empty description to null', async () => {
      mockSectionRepository.findById.mockResolvedValue(sampleSection);
      mockLessonRepository.create.mockResolvedValue(sampleLesson);

      const inputEmptyDesc: CreateLessonInput = {
        title: 'Bài 3',
        description: '   ',
        order: 2,
      };

      await service.createLesson('section_100', inputEmptyDesc);

      expect(mockLessonRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: null,
        }),
        undefined,
      );
    });

    it('4. should throw NotFoundException when section does not exist (null)', async () => {
      mockSectionRepository.findById.mockResolvedValue(null);

      await expect(service.createLesson('section_nonexistent', validInput)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createLesson('section_nonexistent', validInput)).rejects.toThrow(
        "Không tìm thấy chương học với ID 'section_nonexistent'",
      );
      expect(mockLessonRepository.create).not.toHaveBeenCalled();
    });

    it('5. should throw NotFoundException when section is soft-deleted', async () => {
      mockSectionRepository.findById.mockResolvedValue({
        ...sampleSection,
        deletedAt: new Date(),
      });

      await expect(service.createLesson('section_100', validInput)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockLessonRepository.create).not.toHaveBeenCalled();
    });

    it('6. should throw NotFoundException when sectionRepository.findById throws error (e.g. invalid ObjectId)', async () => {
      mockSectionRepository.findById.mockRejectedValue(new Error('CastError: ObjectId failed'));

      await expect(service.createLesson('invalid_id', validInput)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockLessonRepository.create).not.toHaveBeenCalled();
    });

    it('7. should throw BadRequestException when order is negative (< 0)', async () => {
      mockSectionRepository.findById.mockResolvedValue(sampleSection);

      const negativeOrderInput: CreateLessonInput = {
        title: 'Bài học lỗi',
        order: -1,
      };

      await expect(service.createLesson('section_100', negativeOrderInput)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createLesson('section_100', negativeOrderInput)).rejects.toThrow(
        'Thứ tự bài học không được nhỏ hơn 0',
      );
      expect(mockLessonRepository.create).not.toHaveBeenCalled();
    });

    it('8. should pass session down to sectionRepository.findById and lessonRepository.create', async () => {
      const mockSession = { id: 'mock_session_123' } as unknown as ClientSession;
      mockSectionRepository.findById.mockResolvedValue(sampleSection);
      mockLessonRepository.create.mockResolvedValue(sampleLesson);

      await service.createLesson('section_100', validInput, mockSession);

      expect(mockSectionRepository.findById).toHaveBeenCalledWith('section_100', mockSession);
      expect(mockLessonRepository.create).toHaveBeenCalledWith(
        expect.any(Object),
        mockSession,
      );
    });

    it('9. should propagate repository error when lessonRepository.create fails', async () => {
      mockSectionRepository.findById.mockResolvedValue(sampleSection);
      mockLessonRepository.create.mockRejectedValue(new Error('Database write error'));

      await expect(service.createLesson('section_100', validInput)).rejects.toThrow(
        'Database write error',
      );
    });
  });

  describe('getLessonsBySectionId', () => {
    const sampleLessons: ILesson[] = [
      {
        id: 'lesson_1',
        sectionId: 'section_100',
        title: 'Bài 1: Giới thiệu',
        order: 0,
        content: null,
        isPreview: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      {
        id: 'lesson_2',
        sectionId: 'section_100',
        title: 'Bài 2: Cài đặt',
        order: 1,
        content: null,
        isPreview: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ];

    it('1. should return lessons when section exists', async () => {
      mockSectionRepository.findById.mockResolvedValue(sampleSection);
      mockLessonRepository.findBySectionId.mockResolvedValue(sampleLessons);

      const result = await service.getLessonsBySectionId('section_100');

      expect(mockSectionRepository.findById).toHaveBeenCalledWith('section_100', undefined);
      expect(mockLessonRepository.findBySectionId).toHaveBeenCalledWith('section_100', undefined);
      expect(result).toEqual(sampleLessons);
      expect(result).toHaveLength(2);
      expect(result[0].order).toBe(0);
      expect(result[1].order).toBe(1);
    });

    it('2. should return empty array [] when section exists but has no lessons', async () => {
      mockSectionRepository.findById.mockResolvedValue(sampleSection);
      mockLessonRepository.findBySectionId.mockResolvedValue([]);

      const result = await service.getLessonsBySectionId('section_100');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('3. should throw NotFoundException when section does not exist (null)', async () => {
      mockSectionRepository.findById.mockResolvedValue(null);

      await expect(service.getLessonsBySectionId('section_nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getLessonsBySectionId('section_nonexistent')).rejects.toThrow(
        "Không tìm thấy chương học với ID 'section_nonexistent'",
      );
      expect(mockLessonRepository.findBySectionId).not.toHaveBeenCalled();
    });

    it('4. should throw NotFoundException when section is soft-deleted', async () => {
      mockSectionRepository.findById.mockResolvedValue({
        ...sampleSection,
        deletedAt: new Date(),
      });

      await expect(service.getLessonsBySectionId('section_100')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockLessonRepository.findBySectionId).not.toHaveBeenCalled();
    });

    it('5. should throw NotFoundException when sectionRepository.findById throws error', async () => {
      mockSectionRepository.findById.mockRejectedValue(new Error('DB Connection Timeout'));

      await expect(service.getLessonsBySectionId('invalid_id')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockLessonRepository.findBySectionId).not.toHaveBeenCalled();
    });

    it('6. should pass session down to sectionRepository.findById and lessonRepository.findBySectionId', async () => {
      const mockSession = { id: 'mock_session_456' } as unknown as ClientSession;
      mockSectionRepository.findById.mockResolvedValue(sampleSection);
      mockLessonRepository.findBySectionId.mockResolvedValue(sampleLessons);

      const result = await service.getLessonsBySectionId('section_100', mockSession);

      expect(mockSectionRepository.findById).toHaveBeenCalledWith('section_100', mockSession);
      expect(mockLessonRepository.findBySectionId).toHaveBeenCalledWith('section_100', mockSession);
      expect(result).toEqual(sampleLessons);
    });

    it('7. should propagate repository error when lessonRepository.findBySectionId fails', async () => {
      mockSectionRepository.findById.mockResolvedValue(sampleSection);
      mockLessonRepository.findBySectionId.mockRejectedValue(new Error('Query execution failed'));

      await expect(service.getLessonsBySectionId('section_100')).rejects.toThrow(
        'Query execution failed',
      );
    });
  });

  describe('getLessonById', () => {
    it('1. should return lesson domain model when lesson exists and is not soft-deleted', async () => {
      mockLessonRepository.findById.mockResolvedValue(sampleLesson);

      const result = await service.getLessonById('lesson_100');

      expect(mockLessonRepository.findById).toHaveBeenCalledWith('lesson_100', undefined);
      expect(result).toEqual(sampleLesson);
    });

    it('2. should throw NotFoundException when lesson does not exist in repository', async () => {
      mockLessonRepository.findById.mockResolvedValue(null);

      await expect(service.getLessonById('lesson_non_existent')).rejects.toThrow(NotFoundException);
      await expect(service.getLessonById('lesson_non_existent')).rejects.toThrow(
        "Không tìm thấy bài học với ID 'lesson_non_existent'",
      );
    });

    it('3. should throw NotFoundException when lesson is soft-deleted', async () => {
      const softDeletedLesson: ILesson = {
        ...sampleLesson,
        deletedAt: new Date(),
      };
      mockLessonRepository.findById.mockResolvedValue(softDeletedLesson);

      await expect(service.getLessonById('lesson_100')).rejects.toThrow(NotFoundException);
      await expect(service.getLessonById('lesson_100')).rejects.toThrow(
        "Không tìm thấy bài học với ID 'lesson_100'",
      );
    });

    it('4. should catch repository error and throw NotFoundException when repository rejects', async () => {
      mockLessonRepository.findById.mockRejectedValue(new Error('Cast to ObjectId failed'));

      await expect(service.getLessonById('invalid_id')).rejects.toThrow(NotFoundException);
      await expect(service.getLessonById('invalid_id')).rejects.toThrow(
        "Không tìm thấy bài học với ID 'invalid_id'",
      );
    });

    it('5. should pass session down to lessonRepository.findById', async () => {
      const mockSession = { id: 'mock_session_789' } as unknown as ClientSession;
      mockLessonRepository.findById.mockResolvedValue(sampleLesson);

      const result = await service.getLessonById('lesson_100', mockSession);

      expect(mockLessonRepository.findById).toHaveBeenCalledWith('lesson_100', mockSession);
      expect(result).toEqual(sampleLesson);
    });
  });

  describe('addMaterial', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'document.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: Buffer.from('dummy content'),
      size: 1024,
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    };

    const sampleCourse: ICourse = {
      id: 'course_100',
      title: 'Khóa học Node.js',
      slug: 'khoa-hoc-nodejs',
      description: 'Mô tả',
      instructorId: 'user_1',
      level: 'BEGINNER' as any,
      status: 'DRAFT' as any,
      price: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    it('1. should successfully upload file and add material to lesson', async () => {
      mockLessonRepository.findById.mockResolvedValue(sampleLesson);
      mockSectionRepository.findById.mockResolvedValue(sampleSection);
      mockCourseRepository.findById.mockResolvedValue(sampleCourse);
      mockStorageService.uploadLessonMedia.mockResolvedValue({
        url: 'http://localhost:9000/media/doc.pdf',
        fileName: 'doc.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        publicId: 'courses/lessons/materials/doc.pdf',
      });

      const updatedLesson: ILesson = {
        ...sampleLesson,
        materials: [
          {
            id: 'mat_1',
            title: 'Tài liệu bài 1',
            url: 'http://localhost:9000/media/doc.pdf',
            fileName: 'doc.pdf',
            fileSize: 1024,
            mimeType: 'application/pdf',
            createdAt: new Date(),
          },
        ],
      };
      mockLessonRepository.addMaterial.mockResolvedValue(updatedLesson);

      const result = await service.addMaterial(
        'lesson_100',
        mockFile,
        'Tài liệu bài 1',
        'user_1',
        RoleEnum.INSTRUCTOR,
      );

      expect(mockStorageService.uploadLessonMedia).toHaveBeenCalledWith(
        mockFile,
        'courses/lessons/materials',
      );
      expect(mockLessonRepository.addMaterial).toHaveBeenCalledWith(
        'lesson_100',
        expect.objectContaining({
          title: 'Tài liệu bài 1',
          url: 'http://localhost:9000/media/doc.pdf',
        }),
        undefined,
      );
      expect(result).toEqual(updatedLesson);
    });

    it('2. should throw ForbiddenException when user is not course instructor nor ADMIN', async () => {
      mockLessonRepository.findById.mockResolvedValue(sampleLesson);
      mockSectionRepository.findById.mockResolvedValue(sampleSection);
      mockCourseRepository.findById.mockResolvedValue(sampleCourse); // instructorId is user_1

      await expect(
        service.addMaterial(
          'lesson_100',
          mockFile,
          'Tài liệu',
          'other_user',
          RoleEnum.INSTRUCTOR,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('3. should allow ADMIN to add material even if not course instructor', async () => {
      mockLessonRepository.findById.mockResolvedValue(sampleLesson);
      mockSectionRepository.findById.mockResolvedValue(sampleSection);
      mockCourseRepository.findById.mockResolvedValue(sampleCourse);
      mockStorageService.uploadLessonMedia.mockResolvedValue({
        url: 'http://localhost:9000/media/doc.pdf',
        fileName: 'doc.pdf',
        fileSize: 1024,
      });
      mockLessonRepository.addMaterial.mockResolvedValue(sampleLesson);

      const result = await service.addMaterial(
        'lesson_100',
        mockFile,
        'Admin Upload',
        'admin_id',
        RoleEnum.ADMIN,
      );

      expect(result).toBeDefined();
    });

    it('4. should fallback title to uploadedMedia fileName or originalname if title not provided', async () => {
      mockLessonRepository.findById.mockResolvedValue(sampleLesson);
      mockSectionRepository.findById.mockResolvedValue(sampleSection);
      mockCourseRepository.findById.mockResolvedValue(sampleCourse);
      mockStorageService.uploadLessonMedia.mockResolvedValue({
        url: 'http://localhost:9000/media/doc.pdf',
        fileName: 'doc.pdf',
        fileSize: 1024,
      });
      mockLessonRepository.addMaterial.mockResolvedValue(sampleLesson);

      await service.addMaterial('lesson_100', mockFile, '   ', 'user_1', RoleEnum.INSTRUCTOR);

      expect(mockLessonRepository.addMaterial).toHaveBeenCalledWith(
        'lesson_100',
        expect.objectContaining({
          title: 'doc.pdf',
        }),
        undefined,
      );
    });
  });

  describe('deleteMaterial', () => {
    const existingMaterial = {
      id: 'mat_1',
      title: 'Slide bài giảng',
      url: 'http://localhost:9000/media/slide.pdf',
      fileName: 'slide.pdf',
      fileSize: 2048,
      mimeType: 'application/pdf',
      createdAt: new Date(),
    };

    const lessonWithMaterial: ILesson = {
      ...sampleLesson,
      materials: [existingMaterial],
    };

    const sampleCourse: ICourse = {
      id: 'course_100',
      title: 'Khóa học Node.js',
      slug: 'khoa-hoc-nodejs',
      description: 'Mô tả',
      instructorId: 'user_1',
      level: 'BEGINNER' as any,
      status: 'DRAFT' as any,
      price: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    it('1. should delete material and clean up storage file', async () => {
      mockLessonRepository.findById.mockResolvedValue(lessonWithMaterial);
      mockSectionRepository.findById.mockResolvedValue(sampleSection);
      mockCourseRepository.findById.mockResolvedValue(sampleCourse);
      mockLessonRepository.deleteMaterial.mockResolvedValue(sampleLesson);

      const result = await service.deleteMaterial(
        'lesson_100',
        'mat_1',
        'user_1',
        RoleEnum.INSTRUCTOR,
      );

      expect(mockLessonRepository.deleteMaterial).toHaveBeenCalledWith(
        'lesson_100',
        'mat_1',
        undefined,
      );
      expect(mockStorageService.deleteFile).toHaveBeenCalledWith(existingMaterial.url);
      expect(result).toEqual(sampleLesson);
    });

    it('2. should throw NotFoundException when material is not in lesson', async () => {
      mockLessonRepository.findById.mockResolvedValue(lessonWithMaterial);
      mockSectionRepository.findById.mockResolvedValue(sampleSection);
      mockCourseRepository.findById.mockResolvedValue(sampleCourse);

      await expect(
        service.deleteMaterial('lesson_100', 'mat_999', 'user_1', RoleEnum.INSTRUCTOR),
      ).rejects.toThrow(NotFoundException);
    });

    it('3. should throw ForbiddenException when user is not instructor nor admin', async () => {
      mockLessonRepository.findById.mockResolvedValue(lessonWithMaterial);
      mockSectionRepository.findById.mockResolvedValue(sampleSection);
      mockCourseRepository.findById.mockResolvedValue(sampleCourse);

      await expect(
        service.deleteMaterial('lesson_100', 'mat_1', 'other_user', RoleEnum.INSTRUCTOR),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteLesson', () => {
    const sampleCourse: ICourse = {
      id: 'course_100',
      title: 'Khóa học Node.js',
      slug: 'khoa-hoc-nodejs',
      description: 'Mô tả',
      instructorId: 'user_1',
      level: 'BEGINNER' as any,
      status: 'DRAFT' as any,
      price: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    const lessonWithMedia: ILesson = {
      ...sampleLesson,
      content: {
        type: LessonContentTypeEnum.VIDEO,
        url: 'https://minio/videos/sample.mp4',
        duration: 120,
      },
      materials: [
        {
          id: 'mat_1',
          title: 'Doc 1',
          url: 'https://minio/docs/doc1.pdf',
          fileName: 'doc1.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          publicId: null,
          createdAt: new Date(),
        },
      ],
    };

    it('1. should soft delete lesson, reorder remaining lessons, and delete physical files on storage', async () => {
      mockLessonRepository.findById.mockResolvedValue(lessonWithMedia);
      mockSectionRepository.findById.mockResolvedValue(sampleSection);
      mockCourseRepository.findById.mockResolvedValue(sampleCourse);

      const result = await service.deleteLesson('lesson_100', 'user_1', RoleEnum.INSTRUCTOR);

      expect(mockLessonRepository.softDelete).toHaveBeenCalledWith('lesson_100', 'user_1', undefined);
      expect(mockLessonRepository.reorderAfterDelete).toHaveBeenCalledWith('section_100', 0, undefined);
      expect(mockStorageService.deleteFile).toHaveBeenCalledWith('https://minio/videos/sample.mp4');
      expect(mockStorageService.deleteFile).toHaveBeenCalledWith('https://minio/docs/doc1.pdf');
      expect(result).toBe(true);
    });

    it('2. should throw NotFoundException when lesson does not exist', async () => {
      mockLessonRepository.findById.mockResolvedValue(null);

      await expect(
        service.deleteLesson('non_existent', 'user_1', RoleEnum.INSTRUCTOR),
      ).rejects.toThrow(NotFoundException);
    });

    it('3. should throw ForbiddenException when caller is neither course owner nor admin', async () => {
      mockLessonRepository.findById.mockResolvedValue(lessonWithMedia);
      mockSectionRepository.findById.mockResolvedValue(sampleSection);
      mockCourseRepository.findById.mockResolvedValue(sampleCourse);

      await expect(
        service.deleteLesson('lesson_100', 'hacker_user', RoleEnum.INSTRUCTOR),
      ).rejects.toThrow(ForbiddenException);
    });

    it('4. should allow ADMIN to delete lesson even if not instructor', async () => {
      mockLessonRepository.findById.mockResolvedValue(lessonWithMedia);
      mockSectionRepository.findById.mockResolvedValue(sampleSection);
      mockCourseRepository.findById.mockResolvedValue(sampleCourse);

      const result = await service.deleteLesson('lesson_100', 'admin_user', RoleEnum.ADMIN);

      expect(result).toBe(true);
      expect(mockLessonRepository.softDelete).toHaveBeenCalledWith('lesson_100', 'admin_user', undefined);
    });
  });
});

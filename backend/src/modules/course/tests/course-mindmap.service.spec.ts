import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ICourse, ICourseMindmap, RoleEnum, CourseStatusEnum, CourseLevelEnum } from 'share-lib';
import { CourseMindmapService } from '../services/course-mindmap.service.js';
import { CourseMindmapRepository } from '../repositories/course-mindmap.repository.js';
import { CourseRepository } from '../repositories/course.repository.js';

describe('CourseMindmapService', () => {
  let service: CourseMindmapService;
  let mockCourseMindmapRepository: {
    findByCourseId: ReturnType<typeof vi.fn>;
    upsertByCourseId: ReturnType<typeof vi.fn>;
  };
  let mockCourseRepository: {
    findById: ReturnType<typeof vi.fn>;
  };
  let mockCls: { get: ReturnType<typeof vi.fn> };

  const sampleCourse: ICourse = {
    id: 'course_123',
    title: 'Khóa học NestJS & React',
    slug: 'khoa-hoc-nestjs-react',
    instructorId: 'instructor_1',
    price: 299000,
    status: CourseStatusEnum.PUBLISHED,
    level: CourseLevelEnum.ALL_LEVELS,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleMindmapData = {
    id: 'root',
    title: 'Khóa học NestJS & React',
    type: 'course',
    children: [
      {
        id: 'sec_1',
        title: 'Chương 1: Tổng quan',
        type: 'section',
        children: [],
      },
    ],
  };

  const sampleMindmap: ICourseMindmap = {
    id: 'mindmap_123',
    courseId: 'course_123',
    mindmapData: sampleMindmapData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockCourseMindmapRepository = {
      findByCourseId: vi.fn(),
      upsertByCourseId: vi.fn(),
    };
    mockCourseRepository = {
      findById: vi.fn(),
    };
    mockCls = {
      get: vi.fn(),
    };

    service = new CourseMindmapService(
      mockCourseMindmapRepository as unknown as CourseMindmapRepository,
      mockCourseRepository as unknown as CourseRepository,
      mockCls as unknown as ClsService,
    );
  });

  describe('getMindmapByCourseId', () => {
    it('1. should throw NotFoundException if course does not exist', async () => {
      // Arrange
      mockCourseRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getMindmapByCourseId('non_existent_id')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockCourseRepository.findById).toHaveBeenCalledWith('non_existent_id');
      expect(mockCourseMindmapRepository.findByCourseId).not.toHaveBeenCalled();
    });

    it('2. should throw NotFoundException if course is soft deleted', async () => {
      // Arrange
      mockCourseRepository.findById.mockResolvedValue({
        ...sampleCourse,
        deletedAt: new Date(),
      });

      // Act & Assert
      await expect(service.getMindmapByCourseId('course_123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('3. should return null if course exists but mindmap has not been created yet', async () => {
      // Arrange
      mockCourseRepository.findById.mockResolvedValue(sampleCourse);
      mockCourseMindmapRepository.findByCourseId.mockResolvedValue(null);

      // Act
      const result = await service.getMindmapByCourseId('course_123');

      // Assert
      expect(result).toBeNull();
      expect(mockCourseMindmapRepository.findByCourseId).toHaveBeenCalledWith('course_123');
    });

    it('4. should return mindmapData when mindmap exists', async () => {
      // Arrange
      mockCourseRepository.findById.mockResolvedValue(sampleCourse);
      mockCourseMindmapRepository.findByCourseId.mockResolvedValue(sampleMindmap);

      // Act
      const result = await service.getMindmapByCourseId('course_123');

      // Assert
      expect(result).toEqual(sampleMindmapData);
    });
  });

  describe('findMindmapEntity', () => {
    it('1. should throw NotFoundException if course does not exist', async () => {
      // Arrange
      mockCourseRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findMindmapEntity('course_123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('2. should return full entity if found', async () => {
      // Arrange
      mockCourseRepository.findById.mockResolvedValue(sampleCourse);
      mockCourseMindmapRepository.findByCourseId.mockResolvedValue(sampleMindmap);

      // Act
      const result = await service.findMindmapEntity('course_123');

      // Assert
      expect(result).toEqual(sampleMindmap);
    });
  });

  describe('upsertMindmap', () => {
    it('1. should throw NotFoundException if course does not exist', async () => {
      // Arrange
      mockCourseRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.upsertMindmap('course_123', sampleMindmapData, 'instructor_1', RoleEnum.INSTRUCTOR),
      ).rejects.toThrow(NotFoundException);
      expect(mockCourseMindmapRepository.upsertByCourseId).not.toHaveBeenCalled();
    });

    it('2. should throw ForbiddenException if user is not instructor of course and not admin', async () => {
      // Arrange
      mockCourseRepository.findById.mockResolvedValue(sampleCourse);

      // Act & Assert
      await expect(
        service.upsertMindmap(
          'course_123',
          sampleMindmapData,
          'different_instructor',
          RoleEnum.INSTRUCTOR,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockCourseMindmapRepository.upsertByCourseId).not.toHaveBeenCalled();
    });

    it('3. should upsert successfully when user is the course instructor', async () => {
      // Arrange
      mockCourseRepository.findById.mockResolvedValue(sampleCourse);
      mockCourseMindmapRepository.upsertByCourseId.mockResolvedValue(sampleMindmap);

      // Act
      const result = await service.upsertMindmap(
        'course_123',
        sampleMindmapData,
        'instructor_1',
        RoleEnum.INSTRUCTOR,
      );

      // Assert
      expect(mockCourseMindmapRepository.upsertByCourseId).toHaveBeenCalledWith(
        'course_123',
        sampleMindmapData,
        'instructor_1',
      );
      expect(result).toEqual(sampleMindmap);
    });

    it('4. should upsert successfully when user is ADMIN (bypass instructor check)', async () => {
      // Arrange
      mockCourseRepository.findById.mockResolvedValue(sampleCourse);
      mockCourseMindmapRepository.upsertByCourseId.mockResolvedValue(sampleMindmap);

      // Act
      const result = await service.upsertMindmap(
        'course_123',
        sampleMindmapData,
        'admin_user_id',
        RoleEnum.ADMIN,
      );

      // Assert
      expect(mockCourseMindmapRepository.upsertByCourseId).toHaveBeenCalledWith(
        'course_123',
        sampleMindmapData,
        'admin_user_id',
      );
      expect(result).toEqual(sampleMindmap);
    });
  });
});

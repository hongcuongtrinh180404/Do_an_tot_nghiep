import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ICourseMindmap, RoleEnum } from 'share-lib';
import { CourseMindmapController } from '../course-mindmap.controller.js';
import { CourseMindmapService } from '../services/course-mindmap.service.js';
import { UpsertCourseMindmapDto } from '../dto/upsert-course-mindmap.dto.js';

describe('CourseMindmapController', () => {
  let controller: CourseMindmapController;
  let mockCourseMindmapService: {
    getMindmapByCourseId: ReturnType<typeof vi.fn>;
    upsertMindmap: ReturnType<typeof vi.fn>;
  };

  const sampleMindmapData = {
    id: 'root',
    title: 'Khóa học NestJS & React',
    type: 'course',
    children: [],
  };

  const sampleMindmap: ICourseMindmap = {
    id: 'mindmap_123',
    courseId: '507f1f77bcf86cd799439011',
    mindmapData: sampleMindmapData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockCourseMindmapService = {
      getMindmapByCourseId: vi.fn(),
      upsertMindmap: vi.fn(),
    };

    controller = new CourseMindmapController(
      mockCourseMindmapService as unknown as CourseMindmapService,
    );
  });

  describe('getMindmap', () => {
    it('1. should delegate to service and return mindmapData wrapped in ApiResponse', async () => {
      // Arrange
      const courseId = '507f1f77bcf86cd799439011';
      mockCourseMindmapService.getMindmapByCourseId.mockResolvedValue(sampleMindmapData);

      // Act
      const response = await controller.getMindmap(courseId);

      // Assert
      expect(mockCourseMindmapService.getMindmapByCourseId).toHaveBeenCalledWith(courseId);
      expect(response.success).toBe(true);
      expect(response.message).toBe('Lấy sơ đồ tư duy khóa học thành công');
      expect(response.data).toEqual(sampleMindmapData);
    });

    it('2. should return null data wrapped in ApiResponse when mindmap has not been generated', async () => {
      // Arrange
      const courseId = '507f1f77bcf86cd799439011';
      mockCourseMindmapService.getMindmapByCourseId.mockResolvedValue(null);

      // Act
      const response = await controller.getMindmap(courseId);

      // Assert
      expect(mockCourseMindmapService.getMindmapByCourseId).toHaveBeenCalledWith(courseId);
      expect(response.success).toBe(true);
      expect(response.data).toBeNull();
    });
  });

  describe('upsertMindmap', () => {
    it('1. should delegate to service with courseId, dto data, and user auth context', async () => {
      // Arrange
      const courseId = '507f1f77bcf86cd799439011';
      const userId = 'instructor_1';
      const role = RoleEnum.INSTRUCTOR;
      const dto: UpsertCourseMindmapDto = {
        mindmapData: sampleMindmapData,
      };

      mockCourseMindmapService.upsertMindmap.mockResolvedValue(sampleMindmap);

      // Act
      const response = await controller.upsertMindmap(courseId, userId, role, dto);

      // Assert
      expect(mockCourseMindmapService.upsertMindmap).toHaveBeenCalledWith(
        courseId,
        dto.mindmapData,
        userId,
        role,
      );
      expect(response.success).toBe(true);
      expect(response.message).toBe('Cập nhật sơ đồ tư duy khóa học thành công');
      expect(response.data).toEqual(sampleMindmap);
    });
  });
});

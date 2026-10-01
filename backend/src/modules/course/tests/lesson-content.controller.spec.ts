import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ILessonContent, LessonContentTypeEnum, RoleEnum } from 'share-lib';
import { LessonContentController } from '../lesson-content.controller.js';
import { StorageService } from '../../storage/index.js';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator.js';

describe('LessonContentController', () => {
  let controller: LessonContentController;
  let mockStorageService: {
    uploadLessonMedia: ReturnType<typeof vi.fn>;
    getPresignedStreamUrl: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockStorageService = {
      uploadLessonMedia: vi.fn(),
      getPresignedStreamUrl: vi.fn(),
    };

    controller = new LessonContentController(
      mockStorageService as unknown as StorageService,
    );
  });

  describe('Authorization and Decorator Metadata', () => {
    it('should have Roles decorator on uploadContent with INSTRUCTOR and ADMIN roles', () => {
      const reflector = new Reflector();
      const roles = reflector.get<RoleEnum[]>(ROLES_KEY, LessonContentController.prototype.uploadContent);

      expect(roles).toBeDefined();
      expect(roles).toEqual([RoleEnum.INSTRUCTOR, RoleEnum.ADMIN]);
    });

    it('should have Roles decorator on getStreamUrl with STUDENT, INSTRUCTOR and ADMIN roles', () => {
      const reflector = new Reflector();
      const roles = reflector.get<RoleEnum[]>(ROLES_KEY, LessonContentController.prototype.getStreamUrl);

      expect(roles).toBeDefined();
      expect(roles).toEqual([RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN]);
    });
  });

  describe('uploadContent (POST /lesson-content/upload)', () => {
    it('should successfully upload video file and return standardized ApiResponse<ILessonContent>', async () => {
      const fakeVideoFile = {
        fieldname: 'file',
        originalname: 'lesson-01.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        buffer: Buffer.from('mock_video_buffer'),
        size: 35680120,
      } as Express.Multer.File;

      const mockContent: ILessonContent = {
        type: LessonContentTypeEnum.VIDEO,
        url: 'http://localhost:9000/thc-datn-media/courses/lessons/lesson-01.mp4',
        publicId: 'courses/lessons/lesson-01',
        fileName: 'lesson-01.mp4',
        fileSize: 35680120,
        mimeType: 'video/mp4',
      };

      mockStorageService.uploadLessonMedia.mockResolvedValue(mockContent);

      const response = await controller.uploadContent(fakeVideoFile);

      expect(mockStorageService.uploadLessonMedia).toHaveBeenCalledWith(
        fakeVideoFile,
        'courses/lessons',
      );
      expect(response.success).toBe(true);
      expect(response.message).toBe('Tải lên nội dung bài học thành công');
      expect(response.data).toEqual(mockContent);
      expect(response.data?.type).toBe(LessonContentTypeEnum.VIDEO);
    });

    it('should successfully upload document file (PDF) and return standardized ApiResponse<ILessonContent>', async () => {
      const fakeDocFile = {
        fieldname: 'file',
        originalname: 'reference-guide.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: Buffer.from('mock_pdf_buffer'),
        size: 5242880,
      } as Express.Multer.File;

      const mockContent: ILessonContent = {
        type: LessonContentTypeEnum.DOCUMENT,
        url: 'http://localhost:9000/thc-datn-media/courses/lessons/reference-guide.pdf',
        publicId: 'courses/lessons/reference-guide',
        fileName: 'reference-guide.pdf',
        fileSize: 5242880,
        mimeType: 'application/pdf',
      };

      mockStorageService.uploadLessonMedia.mockResolvedValue(mockContent);

      const response = await controller.uploadContent(fakeDocFile);

      expect(mockStorageService.uploadLessonMedia).toHaveBeenCalledWith(
        fakeDocFile,
        'courses/lessons',
      );
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockContent);
      expect(response.data?.type).toBe(LessonContentTypeEnum.DOCUMENT);
    });

    it('should propagate BadRequestException when StorageService fails', async () => {
      const fakeFile = {
        fieldname: 'file',
        originalname: 'video.mp4',
        mimetype: 'video/mp4',
        buffer: Buffer.from('mock_buffer'),
        size: 1000,
      } as Express.Multer.File;

      mockStorageService.uploadLessonMedia.mockRejectedValue(
        new BadRequestException('Không thể tải file lên máy chủ lưu trữ: timeout'),
      );

      await expect(controller.uploadContent(fakeFile)).rejects.toThrow(
        'Không thể tải file lên máy chủ lưu trữ: timeout',
      );
    });
  });

  describe('getStreamUrl (GET /lesson-content/stream-url)', () => {
    it('should return presigned URL when valid key is provided', async () => {
      const mockKey = 'courses/lessons/123-video.mp4';
      const mockSignedUrl = 'http://localhost:9000/thc-datn-media/courses/lessons/123-video.mp4?X-Amz-Signature=xyz';

      mockStorageService.getPresignedStreamUrl.mockResolvedValue(mockSignedUrl);

      const response = await controller.getStreamUrl(mockKey);

      expect(mockStorageService.getPresignedStreamUrl).toHaveBeenCalledWith(mockKey);
      expect(response.success).toBe(true);
      expect(response.data?.url).toBe(mockSignedUrl);
    });

    it('should throw BadRequestException when key is missing or empty', async () => {
      await expect(controller.getStreamUrl('')).rejects.toThrow(BadRequestException);
      await expect(controller.getStreamUrl('   ')).rejects.toThrow(BadRequestException);
    });
  });
});

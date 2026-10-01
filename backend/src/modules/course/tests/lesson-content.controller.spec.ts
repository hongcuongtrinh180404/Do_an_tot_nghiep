import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ILessonContent, LessonContentTypeEnum, RoleEnum } from 'share-lib';
import { LessonContentController } from '../lesson-content.controller.js';
import { CloudinaryService } from '../../cloudinary/cloudinary.service.js';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator.js';

describe('LessonContentController', () => {
  let controller: LessonContentController;
  let mockCloudinaryService: {
    uploadLessonMedia: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockCloudinaryService = {
      uploadLessonMedia: vi.fn(),
    };

    controller = new LessonContentController(
      mockCloudinaryService as unknown as CloudinaryService,
    );
  });

  describe('Authorization and Decorator Metadata', () => {
    it('should have Roles decorator with INSTRUCTOR and ADMIN roles', () => {
      const reflector = new Reflector();
      const roles = reflector.get<RoleEnum[]>(ROLES_KEY, LessonContentController);

      expect(roles).toBeDefined();
      expect(roles).toEqual([RoleEnum.INSTRUCTOR, RoleEnum.ADMIN]);
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
        url: 'https://res.cloudinary.com/demo/video/upload/courses/lessons/lesson-01.mp4',
        publicId: 'courses/lessons/lesson-01',
        fileName: 'lesson-01.mp4',
        fileSize: 35680120,
        mimeType: 'video/mp4',
        duration: 485,
      };

      mockCloudinaryService.uploadLessonMedia.mockResolvedValue(mockContent);

      const response = await controller.uploadContent(fakeVideoFile);

      expect(mockCloudinaryService.uploadLessonMedia).toHaveBeenCalledWith(
        fakeVideoFile,
        'courses/lessons',
      );
      expect(response.success).toBe(true);
      expect(response.message).toBe('Tải lên nội dung bài học thành công');
      expect(response.data).toEqual(mockContent);
      expect(response.data?.type).toBe(LessonContentTypeEnum.VIDEO);
      expect(response.data?.duration).toBe(485);
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
        url: 'https://res.cloudinary.com/demo/raw/upload/courses/lessons/reference-guide.pdf',
        publicId: 'courses/lessons/reference-guide',
        fileName: 'reference-guide.pdf',
        fileSize: 5242880,
        mimeType: 'application/pdf',
      };

      mockCloudinaryService.uploadLessonMedia.mockResolvedValue(mockContent);

      const response = await controller.uploadContent(fakeDocFile);

      expect(mockCloudinaryService.uploadLessonMedia).toHaveBeenCalledWith(
        fakeDocFile,
        'courses/lessons',
      );
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockContent);
      expect(response.data?.type).toBe(LessonContentTypeEnum.DOCUMENT);
      expect(response.data?.duration).toBeUndefined();
    });

    it('should successfully upload Word (.docx) document and return ILessonContent', async () => {
      const fakeDocxFile = {
        fieldname: 'file',
        originalname: 'course-syllabus.docx',
        encoding: '7bit',
        mimetype:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buffer: Buffer.from('mock_docx_buffer'),
        size: 1048576,
      } as Express.Multer.File;

      const mockContent: ILessonContent = {
        type: LessonContentTypeEnum.DOCUMENT,
        url: 'https://res.cloudinary.com/demo/raw/upload/courses/lessons/course-syllabus.docx',
        publicId: 'courses/lessons/course-syllabus',
        fileName: 'course-syllabus.docx',
        fileSize: 1048576,
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };

      mockCloudinaryService.uploadLessonMedia.mockResolvedValue(mockContent);

      const response = await controller.uploadContent(fakeDocxFile);

      expect(response.success).toBe(true);
      expect(response.data?.type).toBe(LessonContentTypeEnum.DOCUMENT);
      expect(response.data?.fileName).toBe('course-syllabus.docx');
    });

    it('should propagate BadRequestException when CloudinaryService fails', async () => {
      const fakeFile = {
        fieldname: 'file',
        originalname: 'video.mp4',
        mimetype: 'video/mp4',
        buffer: Buffer.from('mock_buffer'),
        size: 1000,
      } as Express.Multer.File;

      mockCloudinaryService.uploadLessonMedia.mockRejectedValue(
        new BadRequestException('Lỗi upload file lên Cloudinary: Cloud storage network timeout'),
      );

      await expect(controller.uploadContent(fakeFile)).rejects.toThrow(
        'Lỗi upload file lên Cloudinary: Cloud storage network timeout',
      );
    });
  });
});

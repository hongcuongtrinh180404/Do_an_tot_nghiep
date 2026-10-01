import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse, UploadResponseCallback } from 'cloudinary';
import { PassThrough } from 'stream';
import { LessonContentTypeEnum } from 'share-lib';
import { CloudinaryService } from '../cloudinary.service.js';

// Mock cloudinary SDK
vi.mock('cloudinary', () => {
  return {
    v2: {
      config: vi.fn(),
      uploader: {
        upload_stream: vi.fn(),
      },
    },
  };
});

describe('CloudinaryService', () => {
  let service: CloudinaryService;
  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
  };

  const setupMockUploadStream = (
    result?: Partial<UploadApiResponse>,
    error?: UploadApiErrorResponse,
    onCall?: (options?: unknown) => void,
  ) => {
    vi.mocked(cloudinary.uploader.upload_stream).mockImplementation(
      ((optionsOrCb?: unknown, maybeCb?: unknown) => {
        let callback: UploadResponseCallback | undefined;
        let options: unknown;

        if (typeof optionsOrCb === 'function') {
          callback = optionsOrCb as UploadResponseCallback;
        } else {
          options = optionsOrCb;
          if (typeof maybeCb === 'function') {
            callback = maybeCb as UploadResponseCallback;
          }
        }

        if (onCall) {
          onCall(options);
        }

        if (callback) {
          callback(error, result as UploadApiResponse);
        }

        return new PassThrough();
      }) as unknown as typeof cloudinary.uploader.upload_stream,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfigService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, string> = {
          CLOUDINARY_CLOUD_NAME: 'test_cloud',
          CLOUDINARY_API_KEY: 'test_key',
          CLOUDINARY_API_SECRET: 'test_secret',
          CLOUDINARY_FOLDER: 'test/avatars',
        };
        return config[key] ?? defaultValue;
      }),
    };

    service = new CloudinaryService(mockConfigService as unknown as ConfigService);
  });

  describe('Initialization', () => {
    it('should configure Cloudinary when credentials exist', () => {
      expect(cloudinary.config).toHaveBeenCalledWith({
        cloud_name: 'test_cloud',
        api_key: 'test_key',
        api_secret: 'test_secret',
        secure: true,
      });
    });

    it('should throw BadRequestException on upload when credentials are not configured', async () => {
      const emptyConfig = {
        get: vi.fn().mockReturnValue(undefined),
      };
      const unconfiguredService = new CloudinaryService(
        emptyConfig as unknown as ConfigService,
      );

      const fakeFile = {
        buffer: Buffer.from('data'),
        mimetype: 'video/mp4',
        originalname: 'test.mp4',
        size: 100,
      } as Express.Multer.File;

      await expect(
        unconfiguredService.uploadLessonMedia(fakeFile),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadImage (Avatar)', () => {
    it('should throw BadRequestException if file is missing or has no buffer', async () => {
      await expect(
        service.uploadImage({} as Express.Multer.File),
      ).rejects.toThrow('Không tìm thấy dữ liệu file tải lên');
    });

    it('should upload image and return secure_url', async () => {
      const mockResult: Partial<UploadApiResponse> = {
        secure_url: 'https://res.cloudinary.com/test_cloud/image/upload/avatar.jpg',
      };

      setupMockUploadStream(mockResult);

      const fakeFile = {
        buffer: Buffer.from('avatar_image_data'),
        mimetype: 'image/jpeg',
        originalname: 'avatar.jpg',
        size: 1024,
      } as Express.Multer.File;

      const result = await service.uploadImage(fakeFile);
      expect(result).toBe(mockResult.secure_url);
    });
  });

  describe('uploadLessonMedia (Video & Document)', () => {
    it('should throw BadRequestException if file is missing or has no buffer', async () => {
      await expect(
        service.uploadLessonMedia({} as Express.Multer.File),
      ).rejects.toThrow('Không tìm thấy dữ liệu file tải lên');
    });

    it('should successfully upload a video with resource_type: video and map duration', async () => {
      const mockResult: Partial<UploadApiResponse> = {
        secure_url: 'https://res.cloudinary.com/test/video/upload/v1/courses/lessons/video.mp4',
        public_id: 'courses/lessons/video_abc123',
        bytes: 10485760,
        duration: 125.4,
      };

      let passedOptions: Record<string, unknown> | undefined;

      setupMockUploadStream(mockResult, undefined, (opts) => {
        passedOptions = opts as Record<string, unknown>;
      });

      const fakeFile = {
        buffer: Buffer.from('video_binary_data'),
        mimetype: 'video/mp4',
        originalname: 'intro-lesson.mp4',
        size: 10485760,
      } as Express.Multer.File;

      const result = await service.uploadLessonMedia(fakeFile);

      expect(passedOptions?.resource_type).toBe('video');
      expect(passedOptions?.folder).toBe('courses/lessons');
      expect(result).toEqual({
        type: LessonContentTypeEnum.VIDEO,
        url: mockResult.secure_url,
        publicId: mockResult.public_id,
        fileName: 'intro-lesson.mp4',
        fileSize: 10485760,
        mimeType: 'video/mp4',
        duration: 125,
      });
    });

    it('should successfully upload a PDF document with resource_type: raw and no duration', async () => {
      const mockResult: Partial<UploadApiResponse> = {
        secure_url: 'https://res.cloudinary.com/test/raw/upload/v1/courses/lessons/doc.pdf',
        public_id: 'courses/lessons/doc_xyz789',
        bytes: 5242880,
      };

      let passedOptions: Record<string, unknown> | undefined;

      setupMockUploadStream(mockResult, undefined, (opts) => {
        passedOptions = opts as Record<string, unknown>;
      });

      const fakeFile = {
        buffer: Buffer.from('pdf_binary_data'),
        mimetype: 'application/pdf',
        originalname: 'slide-lecture.pdf',
        size: 5242880,
      } as Express.Multer.File;

      const result = await service.uploadLessonMedia(fakeFile);

      expect(passedOptions?.resource_type).toBe('raw');
      expect(passedOptions?.folder).toBe('courses/lessons');
      expect(result).toEqual({
        type: LessonContentTypeEnum.DOCUMENT,
        url: mockResult.secure_url,
        publicId: mockResult.public_id,
        fileName: 'slide-lecture.pdf',
        fileSize: 5242880,
        mimeType: 'application/pdf',
      });
      expect(result.duration).toBeUndefined();
    });

    it('should successfully upload a Word (.docx) document with resource_type: raw', async () => {
      const mockResult: Partial<UploadApiResponse> = {
        secure_url: 'https://res.cloudinary.com/test/raw/upload/v1/courses/lessons/doc.docx',
        public_id: 'courses/lessons/doc_docx_123',
        bytes: 2097152,
      };

      let passedOptions: Record<string, unknown> | undefined;

      setupMockUploadStream(mockResult, undefined, (opts) => {
        passedOptions = opts as Record<string, unknown>;
      });

      const fakeFile = {
        buffer: Buffer.from('docx_binary_data'),
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        originalname: 'syllabus.docx',
        size: 2097152,
      } as Express.Multer.File;

      const result = await service.uploadLessonMedia(fakeFile);

      expect(passedOptions?.resource_type).toBe('raw');
      expect(result.type).toBe(LessonContentTypeEnum.DOCUMENT);
      expect(result.fileName).toBe('syllabus.docx');
    });

    it('should throw BadRequestException when Cloudinary returns an error', async () => {
      const mockError: UploadApiErrorResponse = {
        message: 'Invalid API key or network timeout',
        name: 'Error',
        http_code: 400,
      };

      setupMockUploadStream(undefined, mockError);

      const fakeFile = {
        buffer: Buffer.from('video_binary_data'),
        mimetype: 'video/mp4',
        originalname: 'video.mp4',
        size: 1000,
      } as Express.Multer.File;

      await expect(service.uploadLessonMedia(fakeFile)).rejects.toThrow(
        'Lỗi upload file lên Cloudinary: Invalid API key or network timeout',
      );
    });

    it('should throw BadRequestException when Cloudinary response has no secure_url', async () => {
      setupMockUploadStream({} as UploadApiResponse);

      const fakeFile = {
        buffer: Buffer.from('video_binary_data'),
        mimetype: 'video/mp4',
        originalname: 'video.mp4',
        size: 1000,
      } as Express.Multer.File;

      await expect(service.uploadLessonMedia(fakeFile)).rejects.toThrow(
        'Không nhận được URL từ Cloudinary',
      );
    });
  });
});

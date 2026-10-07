import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { StorageService } from '../storage.service.js';
import { LessonContentTypeEnum } from 'share-lib';

// Mock @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockImplementation(async (_client, _command, _options) => {
    return 'http://localhost:9000/thc-datn-media/test-signed-url';
  }),
}));

vi.mock('sharp', () => {
  const sharpMock = vi.fn().mockReturnValue({
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('processed_webp_image')),
  });
  return { default: sharpMock };
});

describe('StorageService', () => {
  let service: StorageService;
  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
  };
  let sendSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfigService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const configMap: Record<string, unknown> = {
          MINIO_ENDPOINT: 'localhost',
          MINIO_PORT: 9000,
          MINIO_USE_SSL: false,
          MINIO_ROOT_USER: 'minioadmin',
          MINIO_ROOT_PASSWORD: 'minioadmin123',
          MINIO_BUCKET_NAME: 'thc-datn-media',
          MINIO_PUBLIC_URL: 'http://localhost:9000',
        };
        return configMap[key] ?? defaultValue;
      }),
    };

    service = new StorageService(mockConfigService as unknown as ConfigService);
    // Spy on S3Client send
    sendSpy = vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never);
  });

  describe('uploadImage', () => {
    it('should process image with Sharp and upload WebP to MinIO', async () => {
      const mockFile = {
        buffer: Buffer.from('mock_raw_image_data'),
        mimetype: 'image/png',
        originalname: 'test-avatar.png',
        size: 5000,
      } as Express.Multer.File;

      const result = await service.uploadImage(mockFile, 'avatars');

      expect(sendSpy).toHaveBeenCalledTimes(1);
      const command = sendSpy.mock.calls[0][0];
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect((command as PutObjectCommand).input.Bucket).toBe('thc-datn-media');
      expect((command as PutObjectCommand).input.ContentType).toBe('image/webp');
      expect((command as PutObjectCommand).input.Key).toMatch(/^avatars\/.*\.webp$/);

      expect(result).toMatch(/^http:\/\/localhost:9000\/thc-datn-media\/avatars\/.*\.webp$/);
    });

    it('should throw BadRequestException if file is missing or has no buffer', async () => {
      await expect(service.uploadImage(null as unknown as Express.Multer.File)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('uploadLessonMedia', () => {
    it('should upload video and return ILessonContent with VIDEO type', async () => {
      const mockVideoFile = {
        buffer: Buffer.from('mock_mp4_bytes'),
        mimetype: 'video/mp4',
        originalname: 'lesson-intro.mp4',
        size: 20000000,
      } as Express.Multer.File;

      const result = await service.uploadLessonMedia(mockVideoFile, 'courses/lessons');

      expect(sendSpy).toHaveBeenCalledTimes(1);
      const command = sendSpy.mock.calls[0][0];
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect((command as PutObjectCommand).input.Bucket).toBe('thc-datn-media');
      expect((command as PutObjectCommand).input.ContentType).toBe('video/mp4');

      expect(result.type).toBe(LessonContentTypeEnum.VIDEO);
      expect(result.fileName).toBe('lesson-intro.mp4');
      expect(result.fileSize).toBe(20000000);
      expect(result.mimeType).toBe('video/mp4');
      expect(result.url).toMatch(/^http:\/\/localhost:9000\/thc-datn-media\/courses\/lessons\//);
    });

    it('should upload document and return ILessonContent with DOCUMENT type', async () => {
      const mockDocFile = {
        buffer: Buffer.from('mock_pdf_bytes'),
        mimetype: 'application/pdf',
        originalname: 'notes.pdf',
        size: 1500000,
      } as Express.Multer.File;

      const result = await service.uploadLessonMedia(mockDocFile, 'courses/lessons');

      expect(result.type).toBe(LessonContentTypeEnum.DOCUMENT);
      expect(result.fileName).toBe('notes.pdf');
      expect(result.mimeType).toBe('application/pdf');
    });

    it('should reject unsupported file MIME types', async () => {
      const invalidFile = {
        buffer: Buffer.from('binary_bytes'),
        mimetype: 'application/x-msdownload',
        originalname: 'invalid.exe',
        size: 100,
      } as Express.Multer.File;

      await expect(service.uploadLessonMedia(invalidFile)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getPresignedStreamUrl', () => {
    it('should return signed URL for valid file key', async () => {
      const url = await service.getPresignedStreamUrl('courses/lessons/video.mp4');
      expect(url).toBe('http://localhost:9000/thc-datn-media/test-signed-url');
    });

    it('should strip publicUrl prefix if full URL is passed', async () => {
      const fullUrl = 'http://localhost:9000/thc-datn-media/courses/lessons/video.mp4';
      const url = await service.getPresignedStreamUrl(fullUrl);
      expect(url).toBe('http://localhost:9000/thc-datn-media/test-signed-url');
    });

    it('should throw BadRequestException if key is empty', async () => {
      await expect(service.getPresignedStreamUrl('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteFile', () => {
    it('should delete object from MinIO', async () => {
      const deleted = await service.deleteFile('courses/lessons/video.mp4');
      expect(sendSpy).toHaveBeenCalledTimes(1);
      const command = sendSpy.mock.calls[0][0];
      expect(command).toBeInstanceOf(DeleteObjectCommand);
      expect(deleted).toBe(true);
    });

    it('should extract key and delete object when full MinIO URL is passed', async () => {
      const fullUrl = 'http://localhost:9000/thc-datn-media/avatars/old-avatar.webp';
      const deleted = await service.deleteFile(fullUrl);
      expect(sendSpy).toHaveBeenCalledTimes(1);
      const command = sendSpy.mock.calls[0][0];
      expect(command).toBeInstanceOf(DeleteObjectCommand);
      expect((command as DeleteObjectCommand).input.Key).toBe('avatars/old-avatar.webp');
      expect(deleted).toBe(true);
    });

    it('should skip deletion and return false for external third-party URLs (e.g. Google OAuth)', async () => {
      const externalUrl = 'https://lh3.googleusercontent.com/a/ACg8ocTestAvatar123=s96-c';
      const deleted = await service.deleteFile(externalUrl);
      expect(sendSpy).not.toHaveBeenCalled();
      expect(deleted).toBe(false);
    });

    it('should return false if file key is empty', async () => {
      const deleted = await service.deleteFile('');
      expect(deleted).toBe(false);
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should return false and not throw when MinIO deletion encounters an error', async () => {
      sendSpy.mockRejectedValue(new Error('S3 connection failed'));
      const deleted = await service.deleteFile('avatars/failing-avatar.webp');
      expect(deleted).toBe(false);
    });
  });
});

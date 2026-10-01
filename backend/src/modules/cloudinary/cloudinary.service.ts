import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Readable } from 'stream';
import { ILessonContent, LessonContentTypeEnum } from 'share-lib';

export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export const MAX_VIDEO_SIZE_BYTES = 900 * 1024 * 1024; // 900MB
export const MAX_DOCUMENT_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {
    this.initCloudinary();
  }

  private initCloudinary(): void {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.isConfigured = true;
      this.logger.log('Cloudinary service initialized successfully.');
    } else {
      this.logger.warn(
        'Cloudinary credentials are not fully configured in environment variables. Upload features will be disabled until configured.',
      );
    }
  }

  private ensureConfigured(): void {
    if (!this.isConfigured) {
      this.initCloudinary();
      if (!this.isConfigured) {
        throw new BadRequestException(
          'Dịch vụ Cloudinary chưa được cấu hình. Vui lòng thêm CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET vào file backend/.env.',
        );
      }
    }
  }

  /**
   * Upload image buffer to Cloudinary (Dành cho Avatar cá nhân với Face Crop)
   */
  async uploadImage(
    file: Express.Multer.File,
    subFolder?: string,
  ): Promise<string> {
    this.ensureConfigured();

    if (!file || !file.buffer) {
      throw new BadRequestException('Không tìm thấy dữ liệu file tải lên');
    }

    const defaultFolder =
      this.configService.get<string>('CLOUDINARY_FOLDER') || 'thc_datn/avatars';
    const folder = subFolder || defaultFolder;

    return new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 500, height: 500, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
          if (error) {
            this.logger.error(`Cloudinary upload failed: ${error.message}`, error);
            return reject(new BadRequestException(`Lỗi upload ảnh lên Cloudinary: ${error.message}`));
          }
          if (!result || !result.secure_url) {
            return reject(new BadRequestException('Không nhận được URL từ Cloudinary'));
          }
          resolve(result.secure_url);
        },
      );

      const stream = Readable.from(file.buffer);
      stream.pipe(uploadStream);
    });
  }

  /**
   * Upload media buffer (Video hoặc Document) lên Cloudinary dành cho Lesson Content
   * Trả về metadata chuẩn ILessonContent
   */
  async uploadLessonMedia(
    file: Express.Multer.File,
    subFolder: string = 'courses/lessons',
  ): Promise<ILessonContent> {
    this.ensureConfigured();

    if (!file || !file.buffer) {
      throw new BadRequestException('Không tìm thấy dữ liệu file tải lên');
    }

    const isVideo = (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(file.mimetype);
    const resourceType = isVideo ? 'video' : 'raw';
    const contentType = isVideo
      ? LessonContentTypeEnum.VIDEO
      : LessonContentTypeEnum.DOCUMENT;

    return new Promise<ILessonContent>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: subFolder,
          resource_type: resourceType,
        },
        (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
          if (error) {
            this.logger.error(`Cloudinary media upload failed: ${error.message}`, error);
            return reject(new BadRequestException(`Lỗi upload file lên Cloudinary: ${error.message}`));
          }
          if (!result || !result.secure_url) {
            return reject(new BadRequestException('Không nhận được URL từ Cloudinary'));
          }

          const rawDuration = result.duration;
          const duration =
            isVideo && typeof rawDuration === 'number' && !Number.isNaN(rawDuration)
              ? Math.round(rawDuration)
              : undefined;

          const lessonContent: ILessonContent = {
            type: contentType,
            url: result.secure_url,
            publicId: result.public_id,
            fileName: file.originalname ? file.originalname.trim() : undefined,
            fileSize: result.bytes || file.size,
            mimeType: file.mimetype,
            ...(duration !== undefined ? { duration } : {}),
          };

          resolve(lessonContent);
        },
      );

      const stream = Readable.from(file.buffer);
      stream.pipe(uploadStream);
    });
  }
}

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import path from 'path';
import { ILessonContent, LessonContentTypeEnum } from 'share-lib';
import {
  ALLOWED_VIDEO_MIME_TYPES,
  ALLOWED_DOCUMENT_MIME_TYPES,
} from './storage.constants.js';
import {
  IStorageService,
  ImageUploadOptions,
} from './interfaces/storage.interface.js';

@Injectable()
export class StorageService implements IStorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.configService.get<number>('MINIO_PORT', 9000);
    const useSSL = this.configService.get<boolean>('MINIO_USE_SSL', false);
    const protocol = useSSL ? 'https' : 'http';
    const s3Endpoint = `${protocol}://${endpoint}:${port}`;

    this.bucketName = this.configService.get<string>(
      'MINIO_BUCKET_NAME',
      'thc-datn-media',
    );
    this.publicUrl = (
      this.configService.get<string>('MINIO_PUBLIC_URL') || s3Endpoint
    ).replace(/\/+$/, '');

    const accessKeyId = this.configService.get<string>(
      'MINIO_ROOT_USER',
      'minioadmin',
    );
    const secretAccessKey = this.configService.get<string>(
      'MINIO_ROOT_PASSWORD',
      'minioadmin123',
    );

    this.s3Client = new S3Client({
      endpoint: s3Endpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });

    this.logger.log(
      `MinIO StorageService initialized (endpoint: ${s3Endpoint}, bucket: ${this.bucketName})`,
    );
  }

  /**
   * Upload image to MinIO (Avatar or Thumbnail)
   * Automatically crops and compresses using Sharp (WebP format)
   */
  async uploadImage(
    file: Express.Multer.File,
    optionsOrSubFolder?: ImageUploadOptions | string,
  ): Promise<string> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Không tìm thấy dữ liệu file tải lên');
    }

    const options: ImageUploadOptions =
      typeof optionsOrSubFolder === 'string'
        ? { subFolder: optionsOrSubFolder }
        : optionsOrSubFolder || {};

    const subFolder = (options.subFolder || 'avatars').replace(/^\/+|\/+$/g, '');
    const width = options.width || 500;
    const height = options.height || 500;
    const quality = options.quality || 80;

    let processedBuffer: Buffer;
    try {
      processedBuffer = await sharp(file.buffer)
        .resize(width, height, { fit: 'cover', position: 'center' })
        .webp({ quality })
        .toBuffer();
    } catch (err) {
      this.logger.error('Lỗi khi xử lý hình ảnh với Sharp', err);
      throw new BadRequestException('Định dạng ảnh không hợp lệ hoặc bị lỗi');
    }

    const key = `${subFolder}/${randomUUID()}.webp`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: processedBuffer,
          ContentType: 'image/webp',
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Lỗi upload ảnh lên MinIO: ${message}`, error);
      throw new BadRequestException(`Không thể tải ảnh lên máy chủ lưu trữ: ${message}`);
    }

    return `${this.publicUrl}/${this.bucketName}/${key}`;
  }

  /**
   * Upload Lesson Media (Video or Document) to MinIO
   * Returns standard metadata ILessonContent
   */
  async uploadLessonMedia(
    file: Express.Multer.File,
    subFolder: string = 'courses/lessons',
  ): Promise<ILessonContent> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Không tìm thấy dữ liệu file tải lên');
    }

    const isVideo = (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(file.mimetype);
    const isDocument = (ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(file.mimetype);

    if (!isVideo && !isDocument) {
      throw new BadRequestException(
        'Định dạng file không được hỗ trợ. Chỉ chấp nhận video (MP4, WebM, QuickTime) hoặc tài liệu (PDF, Word DOCX).',
      );
    }

    const contentType = isVideo
      ? LessonContentTypeEnum.VIDEO
      : LessonContentTypeEnum.DOCUMENT;

    const cleanFolder = subFolder.replace(/^\/+|\/+$/g, '');
    const originalName = file.originalname ? file.originalname.trim() : 'media';
    const ext = path.extname(originalName) || (isVideo ? '.mp4' : '.pdf');
    const baseName = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 60);

    const key = `${cleanFolder}/${Date.now()}-${randomUUID().slice(0, 8)}-${baseName}${ext}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Lỗi upload media lên MinIO: ${message}`, error);
      throw new BadRequestException(`Không thể tải file lên máy chủ lưu trữ: ${message}`);
    }

    const directUrl = `${this.publicUrl}/${this.bucketName}/${key}`;

    return {
      type: contentType,
      url: directUrl,
      publicId: key,
      fileName: originalName,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  /**
   * Generate secure presigned URL for streaming video / accessing media with expiration
   */
  async getPresignedStreamUrl(
    fileKeyOrUrl: string,
    expiresInSeconds: number = 7200,
  ): Promise<string> {
    if (!fileKeyOrUrl || typeof fileKeyOrUrl !== 'string') {
      throw new BadRequestException('Khóa file (fileKey) không hợp lệ');
    }

    let key = fileKeyOrUrl.trim();
    const publicUrlPrefix = `${this.publicUrl}/${this.bucketName}/`;
    if (key.startsWith(publicUrlPrefix)) {
      key = key.slice(publicUrlPrefix.length);
    } else if (key.startsWith(`/${this.bucketName}/`)) {
      key = key.slice(`/${this.bucketName}/`.length);
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Lỗi tạo presigned URL từ MinIO: ${message}`, error);
      throw new BadRequestException(`Không thể tạo đường dẫn phát video: ${message}`);
    }
  }

  /**
   * Delete an object from MinIO
   */
  async deleteFile(fileKeyOrUrl: string): Promise<boolean> {
    if (!fileKeyOrUrl) return false;

    let key = fileKeyOrUrl.trim();
    const publicUrlPrefix = `${this.publicUrl}/${this.bucketName}/`;
    if (key.startsWith(publicUrlPrefix)) {
      key = key.slice(publicUrlPrefix.length);
    }

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      return true;
    } catch (error) {
      this.logger.warn(`Không thể xóa file ${key} trên MinIO`, error);
      return false;
    }
  }
}

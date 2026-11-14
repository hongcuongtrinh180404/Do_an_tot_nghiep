import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
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
import { ILessonContent, LessonContentTypeEnum, decodeUtf8FileName } from 'share-lib';
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
  private readonly privateBucketName: string;
  private readonly publicUrl: string;
  private readonly endpointUrl: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.configService.get<number>('MINIO_PORT', 9000);
    const sslSetting = this.configService.get<boolean | string>('MINIO_USE_SSL', false);
    const useSSL = sslSetting === true || sslSetting === 'true';
    const protocol = useSSL ? 'https' : 'http';
    const s3Endpoint = `${protocol}://${endpoint}:${port}`;

    this.bucketName = this.configService.get<string>(
      'MINIO_BUCKET_NAME',
      'thc-datn-media',
    );
    this.privateBucketName = this.configService.get<string>('MINIO_PRIVATE_BUCKET_NAME', `${this.bucketName}-private`);
    this.endpointUrl = s3Endpoint;
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

  /** Resolve only our two known buckets. Never sign arbitrary external URLs. */
  getMediaReference(fileKeyOrUrl: string): { bucket: string; key: string; url: string; isPrivate: boolean } {
    const value = fileKeyOrUrl?.trim();
    if (!value) throw new BadRequestException('Khóa file (fileKey) không hợp lệ');
    let bucket = this.bucketName;
    let key = value.replace(/^\/+/, '');
    if (/^https?:\/\//i.test(value)) {
      const parsed = new URL(value);
      const plainUrl = `${parsed.origin}${parsed.pathname}`;
      const match = [this.privateBucketName, this.bucketName].flatMap((candidate) =>
        [this.publicUrl, this.endpointUrl].map((base) => ({ candidate, prefix: `${base}/${candidate}/` })),
      ).find(({ prefix }) => plainUrl.startsWith(prefix));
      if (!match) throw new BadRequestException('File không thuộc kho lưu trữ của hệ thống');
      bucket = match.candidate;
      key = decodeURIComponent(plainUrl.slice(match.prefix.length));
    } else {
      for (const candidate of [this.privateBucketName, this.bucketName]) {
        if (key.startsWith(`${candidate}/`)) {
          bucket = candidate;
          key = key.slice(candidate.length + 1);
          break;
        }
      }
    }
    if (!key || key.includes('\\') || /[?#]/.test(key) || key.split('/').some((part) => part === '.' || part === '..')) {
      throw new BadRequestException('Khóa file (fileKey) không hợp lệ');
    }
    return { bucket, key, url: `${this.publicUrl}/${bucket}/${key}`, isPrivate: bucket === this.privateBucketName };
  }

  isPrivateMedia(fileKeyOrUrl: string): boolean {
    try { return this.getMediaReference(fileKeyOrUrl).isPrivate; } catch { return false; }
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
    const fit = options.fit || 'cover';

    let processedBuffer: Buffer;
    try {
      processedBuffer = await sharp(file.buffer)
        .resize(width, height, {
          fit,
          position: 'center',
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
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
    const rawOriginalName = file.originalname ? file.originalname.trim() : 'media';
    const originalName = decodeUtf8FileName(rawOriginalName) || 'media';
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
    const { bucket, key } = this.getMediaReference(fileKeyOrUrl);

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
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
   * Lấy Stream đọc file từ MinIO để xử lý ngầm (ví dụ: chuyển âm thanh sang AssemblyAI)
   */
  async getObjectStream(fileKeyOrUrl: string): Promise<Readable> {
    const { bucket, key } = this.getMediaReference(fileKeyOrUrl);

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      const response = await this.s3Client.send(command);
      if (!response.Body) {
        throw new NotFoundException(`Không tìm thấy file ${key} trên MinIO`);
      }
      return response.Body as Readable;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Lỗi khi lấy stream file ${key} từ MinIO: ${message}`, error);
      throw new BadRequestException(`Không thể đọc file từ MinIO: ${message}`);
    }
  }

  /**
   * Delete an object from MinIO
   */
  async deleteFile(fileKeyOrUrl: string): Promise<boolean> {
    if (!fileKeyOrUrl || typeof fileKeyOrUrl !== 'string') return false;

    let reference: ReturnType<StorageService['getMediaReference']>;
    try { reference = this.getMediaReference(fileKeyOrUrl); } catch { return false; }
    const { bucket, key } = reference;

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
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

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var StorageService_1;
import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import path from 'path';
import { LessonContentTypeEnum, decodeUtf8FileName } from 'share-lib';
import { ALLOWED_VIDEO_MIME_TYPES, ALLOWED_DOCUMENT_MIME_TYPES, } from './storage.constants.js';
let StorageService = StorageService_1 = class StorageService {
    configService;
    logger = new Logger(StorageService_1.name);
    s3Client;
    bucketName;
    privateBucketName;
    publicUrl;
    endpointUrl;
    constructor(configService) {
        this.configService = configService;
        const endpoint = this.configService.get('MINIO_ENDPOINT', 'localhost');
        const port = this.configService.get('MINIO_PORT', 9000);
        const sslSetting = this.configService.get('MINIO_USE_SSL', false);
        const useSSL = sslSetting === true || sslSetting === 'true';
        const protocol = useSSL ? 'https' : 'http';
        const s3Endpoint = `${protocol}://${endpoint}:${port}`;
        this.bucketName = this.configService.get('MINIO_BUCKET_NAME', 'thc-datn-media');
        this.privateBucketName = this.configService.get('MINIO_PRIVATE_BUCKET_NAME', `${this.bucketName}-private`);
        this.endpointUrl = s3Endpoint;
        this.publicUrl = (this.configService.get('MINIO_PUBLIC_URL') || s3Endpoint).replace(/\/+$/, '');
        const accessKeyId = this.configService.get('MINIO_ROOT_USER', 'minioadmin');
        const secretAccessKey = this.configService.get('MINIO_ROOT_PASSWORD', 'minioadmin123');
        this.s3Client = new S3Client({
            endpoint: s3Endpoint,
            region: 'us-east-1',
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
            forcePathStyle: true,
        });
        this.logger.log(`MinIO StorageService initialized (endpoint: ${s3Endpoint}, bucket: ${this.bucketName})`);
    }
    getMediaReference(fileKeyOrUrl) {
        const value = fileKeyOrUrl?.trim();
        if (!value)
            throw new BadRequestException('Khóa file (fileKey) không hợp lệ');
        let bucket = this.bucketName;
        let key = value.replace(/^\/+/, '');
        if (/^https?:\/\//i.test(value)) {
            const parsed = new URL(value);
            const plainUrl = `${parsed.origin}${parsed.pathname}`;
            const match = [this.privateBucketName, this.bucketName].flatMap((candidate) => [this.publicUrl, this.endpointUrl].map((base) => ({ candidate, prefix: `${base}/${candidate}/` }))).find(({ prefix }) => plainUrl.startsWith(prefix));
            if (!match)
                throw new BadRequestException('File không thuộc kho lưu trữ của hệ thống');
            bucket = match.candidate;
            key = decodeURIComponent(plainUrl.slice(match.prefix.length));
        }
        else {
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
    isPrivateMedia(fileKeyOrUrl) {
        try {
            return this.getMediaReference(fileKeyOrUrl).isPrivate;
        }
        catch {
            return false;
        }
    }
    async uploadImage(file, optionsOrSubFolder) {
        if (!file || !file.buffer) {
            throw new BadRequestException('Không tìm thấy dữ liệu file tải lên');
        }
        const options = typeof optionsOrSubFolder === 'string'
            ? { subFolder: optionsOrSubFolder }
            : optionsOrSubFolder || {};
        const subFolder = (options.subFolder || 'avatars').replace(/^\/+|\/+$/g, '');
        const width = options.width || 500;
        const height = options.height || 500;
        const quality = options.quality || 80;
        const fit = options.fit || 'cover';
        let processedBuffer;
        try {
            processedBuffer = await sharp(file.buffer)
                .resize(width, height, {
                fit,
                position: 'center',
                background: { r: 255, g: 255, b: 255, alpha: 0 },
            })
                .webp({ quality })
                .toBuffer();
        }
        catch (err) {
            this.logger.error('Lỗi khi xử lý hình ảnh với Sharp', err);
            throw new BadRequestException('Định dạng ảnh không hợp lệ hoặc bị lỗi');
        }
        const key = `${subFolder}/${randomUUID()}.webp`;
        try {
            await this.s3Client.send(new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: processedBuffer,
                ContentType: 'image/webp',
            }));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Lỗi upload ảnh lên MinIO: ${message}`, error);
            throw new BadRequestException(`Không thể tải ảnh lên máy chủ lưu trữ: ${message}`);
        }
        return `${this.publicUrl}/${this.bucketName}/${key}`;
    }
    async uploadLessonMedia(file, subFolder = 'courses/lessons') {
        if (!file || !file.buffer) {
            throw new BadRequestException('Không tìm thấy dữ liệu file tải lên');
        }
        const isVideo = ALLOWED_VIDEO_MIME_TYPES.includes(file.mimetype);
        const isDocument = ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype);
        if (!isVideo && !isDocument) {
            throw new BadRequestException('Định dạng file không được hỗ trợ. Chỉ chấp nhận video (MP4, WebM, QuickTime) hoặc tài liệu (PDF, Word DOCX).');
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
            await this.s3Client.send(new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            }));
        }
        catch (error) {
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
    async getPresignedStreamUrl(fileKeyOrUrl, expiresInSeconds = 7200) {
        const { bucket, key } = this.getMediaReference(fileKeyOrUrl);
        try {
            const command = new GetObjectCommand({
                Bucket: bucket,
                Key: key,
            });
            return await getSignedUrl(this.s3Client, command, {
                expiresIn: expiresInSeconds,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Lỗi tạo presigned URL từ MinIO: ${message}`, error);
            throw new BadRequestException(`Không thể tạo đường dẫn phát video: ${message}`);
        }
    }
    async getObjectStream(fileKeyOrUrl) {
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
            return response.Body;
        }
        catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Lỗi khi lấy stream file ${key} từ MinIO: ${message}`, error);
            throw new BadRequestException(`Không thể đọc file từ MinIO: ${message}`);
        }
    }
    async deleteFile(fileKeyOrUrl) {
        if (!fileKeyOrUrl || typeof fileKeyOrUrl !== 'string')
            return false;
        let reference;
        try {
            reference = this.getMediaReference(fileKeyOrUrl);
        }
        catch {
            return false;
        }
        const { bucket, key } = reference;
        try {
            await this.s3Client.send(new DeleteObjectCommand({
                Bucket: bucket,
                Key: key,
            }));
            return true;
        }
        catch (error) {
            this.logger.warn(`Không thể xóa file ${key} trên MinIO`, error);
            return false;
        }
    }
};
StorageService = StorageService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ConfigService])
], StorageService);
export { StorageService };
//# sourceMappingURL=storage.service.js.map
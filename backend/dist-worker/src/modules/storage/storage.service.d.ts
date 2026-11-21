import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import { ILessonContent } from 'share-lib';
import { IStorageService, ImageUploadOptions } from './interfaces/storage.interface.js';
export declare class StorageService implements IStorageService {
    private readonly configService;
    private readonly logger;
    private readonly s3Client;
    private readonly bucketName;
    private readonly privateBucketName;
    private readonly publicUrl;
    private readonly endpointUrl;
    constructor(configService: ConfigService);
    getMediaReference(fileKeyOrUrl: string): {
        bucket: string;
        key: string;
        url: string;
        isPrivate: boolean;
    };
    isPrivateMedia(fileKeyOrUrl: string): boolean;
    uploadImage(file: Express.Multer.File, optionsOrSubFolder?: ImageUploadOptions | string): Promise<string>;
    uploadLessonMedia(file: Express.Multer.File, subFolder?: string): Promise<ILessonContent>;
    getPresignedStreamUrl(fileKeyOrUrl: string, expiresInSeconds?: number): Promise<string>;
    getObjectStream(fileKeyOrUrl: string): Promise<Readable>;
    deleteFile(fileKeyOrUrl: string): Promise<boolean>;
}

import { ILessonContent } from 'share-lib';

export interface ImageUploadOptions {
  subFolder?: string;
  width?: number;
  height?: number;
  quality?: number;
}

export interface IStorageService {
  uploadImage(
    file: Express.Multer.File,
    optionsOrSubFolder?: ImageUploadOptions | string,
  ): Promise<string>;

  uploadLessonMedia(
    file: Express.Multer.File,
    subFolder?: string,
  ): Promise<ILessonContent>;

  getPresignedStreamUrl(
    fileKey: string,
    expiresInSeconds?: number,
  ): Promise<string>;

  deleteFile(fileKey: string): Promise<boolean>;
}

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {
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

  /**
   * Upload image buffer to Cloudinary
   */
  async uploadImage(
    file: Express.Multer.File,
    subFolder?: string,
  ): Promise<string> {
    if (!this.isConfigured) {
      // Re-check in case env vars were updated at runtime
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
      } else {
        throw new BadRequestException(
          'Dịch vụ Cloudinary chưa được cấu hình. Vui lòng thêm CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET vào file backend/.env.',
        );
      }
    }

    if (!file || !file.buffer) {
      throw new BadRequestException('Không tìm thấy dữ liệu file tải lên');
    }

    const defaultFolder =
      this.configService.get<string>('CLOUDINARY_FOLDER') || 'thc_datn/avatars';
    const folder = subFolder || defaultFolder;

    return new Promise((resolve, reject) => {
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
}

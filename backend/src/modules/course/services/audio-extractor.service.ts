import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile, ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import ffmpegStatic from 'ffmpeg-static';

class AsyncSemaphore {
  private running = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly maxConcurrency: number) {}

  async acquire(): Promise<void> {
    if (this.running < this.maxConcurrency) {
      this.running++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) {
      this.running++;
      next();
    }
  }

  get activeCount(): number {
    return this.running;
  }
}

export interface IAudioExtractorService {
  extractMp3FromVideo(videoUrlOrPath: string, lessonId: string): Promise<string>;
  cleanupTempFile(filePath: string): Promise<void>;
  getFfmpegBinaryPath(): string;
}

@Injectable()
export class AudioExtractorService implements IAudioExtractorService, OnModuleDestroy {
  private readonly logger = new Logger(AudioExtractorService.name);
  private readonly semaphore: AsyncSemaphore;
  private readonly activeProcesses = new Set<ChildProcess>();

  constructor(private readonly configService: ConfigService) {
    const configuredConcurrency = Number(this.configService.get<number>('FFMPEG_MAX_CONCURRENCY', 1)) || 1;
    const maxConcurrency = Math.max(1, configuredConcurrency);
    this.semaphore = new AsyncSemaphore(maxConcurrency);
    this.logger.log(`[FFmpeg] Initialized AudioExtractorService with max concurrency: ${maxConcurrency}`);
  }

  onModuleDestroy(): void {
    if (this.activeProcesses.size > 0) {
      this.logger.log(
        `[FFmpeg] Shutting down AudioExtractorService, terminating ${this.activeProcesses.size} active FFmpeg processes...`,
      );
      for (const process of this.activeProcesses) {
        try {
          process.kill('SIGTERM');
        } catch {
          // ignore error on kill
        }
      }
      this.activeProcesses.clear();
    }
  }

  /**
   * Phân giải đường dẫn binary FFmpeg theo thứ tự ưu tiên:
   * 1. Biến môi trường FFMPEG_PATH trong .env
   * 2. Package ffmpeg-static được cài đặt trong ứng dụng
   * 3. Lệnh toàn cục 'ffmpeg' trên hệ điều hành
   */
  getFfmpegBinaryPath(): string {
    const configuredPath = this.configService.get<string>('FFMPEG_PATH', '').trim();
    if (configuredPath) {
      return configuredPath;
    }

    if (ffmpegStatic && typeof ffmpegStatic === 'string') {
      return ffmpegStatic;
    }

    return 'ffmpeg';
  }

  /**
   * Trích xuất luồng âm thanh từ video sang tệp MP3 tối ưu cho AI Speech-to-Text
   * Các tham số tối ưu:
   * - -i: URL/đường dẫn video nguồn (hỗ trợ HTTP/HTTPS Range Requests)
   * - -vn: Bỏ hoàn toàn luồng hình ảnh
   * - -ac 1: Kênh Mono đơn
   * - -ar 16000: Hạ sample rate về 16.000Hz (native Whisper / ASR models)
   * - -c:a libmp3lame: Codec MP3
   * - -b:a 64k: Bitrate 64kbps (siêu nhẹ ~28MB/giờ bài giảng nhưng giữ trọn giọng nói)
   * - -y: Tự động ghi đè tệp tạm
   *
   * @param videoUrlOrPath URL (Presigned MinIO) hoặc đường dẫn file video đầu vào
   * @param lessonId ID bài học để sinh tên file tạm duy nhất
   * @returns Đường dẫn tệp MP3 tạm tại os.tmpdir()
   */
  async extractMp3FromVideo(videoUrlOrPath: string, lessonId: string): Promise<string> {
    const trimmedSource = videoUrlOrPath?.trim();
    const trimmedLessonId = lessonId?.trim();

    if (!trimmedSource) {
      throw new BadRequestException('Nguồn video không được để trống khi trích xuất âm thanh');
    }
    if (!trimmedLessonId) {
      throw new BadRequestException('ID bài học không được để trống khi trích xuất âm thanh');
    }

    const ffmpegPath = this.getFfmpegBinaryPath();
    const tempFileName = `audio-${trimmedLessonId}-${Date.now()}.mp3`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);

    const args = [
      '-i',
      trimmedSource,
      '-vn',
      '-ac',
      '1',
      '-ar',
      '16000',
      '-c:a',
      'libmp3lame',
      '-b:a',
      '64k',
      '-y',
      tempFilePath,
    ];

    this.logger.log(
      `[FFmpeg] Chờ slot trích xuất âm thanh cho bài học ${trimmedLessonId} (Active: ${this.semaphore.activeCount})...`,
    );

    await this.semaphore.acquire();
    try {
      this.logger.log(
        `[FFmpeg] Bắt đầu trích xuất âm thanh cho bài học ${trimmedLessonId} qua ${ffmpegPath}...`,
      );

      // Timeout 10 phút (600.000ms) đề phòng video dài hoặc mạng chậm
      let childProcessInstance: ChildProcess | null = null;
      let isFinished = false;

      await new Promise<void>((resolve, reject) => {
        const child = execFile(ffmpegPath, args, { timeout: 600000 }, (error) => {
          isFinished = true;
          if (childProcessInstance) {
            this.activeProcesses.delete(childProcessInstance);
          }
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
        childProcessInstance = child;
        if (child && !isFinished) {
          this.activeProcesses.add(child);
        }
      });

      const stats = await fs.promises.stat(tempFilePath).catch(() => null);
      if (!stats || stats.size === 0) {
        await this.cleanupTempFile(tempFilePath);
        throw new InternalServerErrorException(
          `Quá trình trích xuất âm thanh cho bài học ${trimmedLessonId} tạo ra file rỗng hoặc không tồn tại.`,
        );
      }

      const sizeInMb = (stats.size / (1024 * 1024)).toFixed(2);
      this.logger.log(
        `[FFmpeg] Trích xuất âm thanh thành công cho bài học ${trimmedLessonId}: ${tempFilePath} (${sizeInMb} MB)`,
      );

      return tempFilePath;
    } catch (error: unknown) {
      await this.cleanupTempFile(tempFilePath);

      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[FFmpeg] Lỗi khi thực thi tách âm thanh bài học ${trimmedLessonId}: ${message}`,
        error,
      );
      throw new InternalServerErrorException(
        `Không thể trích xuất âm thanh từ video bài học: ${message}`,
      );
    } finally {
      this.semaphore.release();
    }
  }

  /**
   * Dọn dẹp an toàn tệp âm thanh tạm tại os.tmpdir()
   */
  async cleanupTempFile(filePath: string): Promise<void> {
    if (!filePath || typeof filePath !== 'string') {
      return;
    }

    try {
      await fs.promises.unlink(filePath);
      this.logger.log(`[Cleanup] Đã dọn dẹp file âm thanh tạm: ${filePath}`);
    } catch (err: unknown) {
      // Bỏ qua lỗi ENOENT nếu file không tồn tại
      const code = (err as { code?: string })?.code;
      if (code !== 'ENOENT') {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`[Cleanup] Không thể xóa file tạm ${filePath}: ${message}`);
      }
    }
  }
}

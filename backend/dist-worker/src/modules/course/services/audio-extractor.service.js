var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AudioExtractorService_1;
import { Injectable, Logger, BadRequestException, InternalServerErrorException, } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import ffmpegStatic from 'ffmpeg-static';
class AsyncSemaphore {
    maxConcurrency;
    running = 0;
    queue = [];
    constructor(maxConcurrency) {
        this.maxConcurrency = maxConcurrency;
    }
    async acquire() {
        if (this.running < this.maxConcurrency) {
            this.running++;
            return;
        }
        return new Promise((resolve) => {
            this.queue.push(resolve);
        });
    }
    release() {
        this.running--;
        const next = this.queue.shift();
        if (next) {
            this.running++;
            next();
        }
    }
    get activeCount() {
        return this.running;
    }
}
let AudioExtractorService = AudioExtractorService_1 = class AudioExtractorService {
    configService;
    logger = new Logger(AudioExtractorService_1.name);
    semaphore;
    activeProcesses = new Set();
    constructor(configService) {
        this.configService = configService;
        const configuredConcurrency = Number(this.configService.get('FFMPEG_MAX_CONCURRENCY', 1)) || 1;
        const maxConcurrency = Math.max(1, configuredConcurrency);
        this.semaphore = new AsyncSemaphore(maxConcurrency);
        this.logger.log(`[FFmpeg] Initialized AudioExtractorService with max concurrency: ${maxConcurrency}`);
    }
    onModuleDestroy() {
        if (this.activeProcesses.size > 0) {
            this.logger.log(`[FFmpeg] Shutting down AudioExtractorService, terminating ${this.activeProcesses.size} active FFmpeg processes...`);
            for (const process of this.activeProcesses) {
                try {
                    process.kill('SIGTERM');
                }
                catch {
                }
            }
            this.activeProcesses.clear();
        }
    }
    getFfmpegBinaryPath() {
        const configuredPath = this.configService.get('FFMPEG_PATH', '').trim();
        if (configuredPath) {
            return configuredPath;
        }
        if (ffmpegStatic && typeof ffmpegStatic === 'string') {
            return ffmpegStatic;
        }
        return 'ffmpeg';
    }
    async extractMp3FromVideo(videoUrlOrPath, lessonId) {
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
        this.logger.log(`[FFmpeg] Chờ slot trích xuất âm thanh cho bài học ${trimmedLessonId} (Active: ${this.semaphore.activeCount})...`);
        await this.semaphore.acquire();
        try {
            this.logger.log(`[FFmpeg] Bắt đầu trích xuất âm thanh cho bài học ${trimmedLessonId} qua ${ffmpegPath}...`);
            let childProcessInstance = null;
            let isFinished = false;
            await new Promise((resolve, reject) => {
                const child = execFile(ffmpegPath, args, { timeout: 600000 }, (error) => {
                    isFinished = true;
                    if (childProcessInstance) {
                        this.activeProcesses.delete(childProcessInstance);
                    }
                    if (error) {
                        reject(error);
                    }
                    else {
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
                throw new InternalServerErrorException(`Quá trình trích xuất âm thanh cho bài học ${trimmedLessonId} tạo ra file rỗng hoặc không tồn tại.`);
            }
            const sizeInMb = (stats.size / (1024 * 1024)).toFixed(2);
            this.logger.log(`[FFmpeg] Trích xuất âm thanh thành công cho bài học ${trimmedLessonId}: ${tempFilePath} (${sizeInMb} MB)`);
            return tempFilePath;
        }
        catch (error) {
            await this.cleanupTempFile(tempFilePath);
            if (error instanceof BadRequestException ||
                error instanceof InternalServerErrorException) {
                throw error;
            }
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`[FFmpeg] Lỗi khi thực thi tách âm thanh bài học ${trimmedLessonId}: ${message}`, error);
            throw new InternalServerErrorException(`Không thể trích xuất âm thanh từ video bài học: ${message}`);
        }
        finally {
            this.semaphore.release();
        }
    }
    async cleanupTempFile(filePath) {
        if (!filePath || typeof filePath !== 'string') {
            return;
        }
        try {
            await fs.promises.unlink(filePath);
            this.logger.log(`[Cleanup] Đã dọn dẹp file âm thanh tạm: ${filePath}`);
        }
        catch (err) {
            const code = err?.code;
            if (code !== 'ENOENT') {
                const message = err instanceof Error ? err.message : String(err);
                this.logger.warn(`[Cleanup] Không thể xóa file tạm ${filePath}: ${message}`);
            }
        }
    }
};
AudioExtractorService = AudioExtractorService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ConfigService])
], AudioExtractorService);
export { AudioExtractorService };
//# sourceMappingURL=audio-extractor.service.js.map
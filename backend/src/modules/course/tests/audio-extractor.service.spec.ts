import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AudioExtractorService } from '../services/audio-extractor.service.js';
import * as fs from 'node:fs';
import * as childProcess from 'node:child_process';

vi.mock('node:child_process', () => {
  const execFileMock = vi.fn(
    (
      file: string,
      args: string[],
      options: unknown,
      callback: (error: Error | null, stdout: string, stderr: string) => void,
    ) => {
      // Mock successful execution by default
      callback(null, 'ffmpeg output', '');
    },
  );
  return {
    execFile: execFileMock,
  };
});

describe('AudioExtractorService', () => {
  let service: AudioExtractorService;
  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfigService = {
      get: vi.fn().mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'FFMPEG_PATH') {
          return '';
        }
        return defaultValue;
      }),
    };

    service = new AudioExtractorService(mockConfigService as unknown as ConfigService);
  });

  describe('getFfmpegBinaryPath', () => {
    it('should return configured FFMPEG_PATH when provided in config', () => {
      mockConfigService.get.mockReturnValue('C:\\custom\\ffmpeg.exe');
      const binaryPath = service.getFfmpegBinaryPath();
      expect(binaryPath).toBe('C:\\custom\\ffmpeg.exe');
    });

    it('should fallback to ffmpeg-static or ffmpeg when FFMPEG_PATH is empty', () => {
      mockConfigService.get.mockReturnValue('');
      const binaryPath = service.getFfmpegBinaryPath();
      expect(typeof binaryPath).toBe('string');
      expect(binaryPath.length).toBeGreaterThan(0);
    });
  });

  describe('extractMp3FromVideo', () => {
    it('should throw BadRequestException if videoUrlOrPath is empty', async () => {
      await expect(service.extractMp3FromVideo('', 'lesson_123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if lessonId is empty', async () => {
      await expect(
        service.extractMp3FromVideo('https://minio.example.com/video.mp4', '   '),
      ).rejects.toThrow(BadRequestException);
    });

    it('should call execFile with optimized speech-to-text parameters and return temp file path', async () => {
      const statSpy = vi.spyOn(fs.promises, 'stat').mockResolvedValue({
        size: 1024 * 1024 * 5, // 5MB
      } as fs.Stats);

      const videoSource = 'https://minio.example.com/video.mp4';
      const lessonId = 'lesson_123';

      const tempPath = await service.extractMp3FromVideo(videoSource, lessonId);

      expect(tempPath).toContain(`audio-${lessonId}`);
      expect(tempPath.endsWith('.mp3')).toBe(true);

      expect(childProcess.execFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          '-i',
          videoSource,
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
          tempPath,
        ]),
        expect.objectContaining({ timeout: 600000 }),
        expect.any(Function),
      );

      statSpy.mockRestore();
    });

    it('should throw InternalServerErrorException and clean up if output file has 0 size', async () => {
      vi.spyOn(fs.promises, 'stat').mockResolvedValue({
        size: 0,
      } as fs.Stats);
      const unlinkSpy = vi.spyOn(fs.promises, 'unlink').mockResolvedValue();

      await expect(
        service.extractMp3FromVideo('https://minio.example.com/video.mp4', 'lesson_123'),
      ).rejects.toThrow(InternalServerErrorException);

      expect(unlinkSpy).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException and clean up if execFile fails', async () => {
      const execFileMock = childProcess.execFile as unknown as ReturnType<typeof vi.fn>;
      execFileMock.mockImplementationOnce(
        (
          _file: string,
          _args: string[],
          _options: unknown,
          callback: (error: Error | null) => void,
        ) => {
          callback(new Error('FFmpeg process crashed'));
        },
      );
      const unlinkSpy = vi.spyOn(fs.promises, 'unlink').mockResolvedValue();

      await expect(
        service.extractMp3FromVideo('https://minio.example.com/video.mp4', 'lesson_123'),
      ).rejects.toThrow(InternalServerErrorException);

      expect(unlinkSpy).toHaveBeenCalled();
    });
  });

  describe('cleanupTempFile', () => {
    it('should ignore empty or invalid file path', async () => {
      const unlinkSpy = vi.spyOn(fs.promises, 'unlink');
      await service.cleanupTempFile('');
      expect(unlinkSpy).not.toHaveBeenCalled();
    });

    it('should delete file successfully when path is valid', async () => {
      const unlinkSpy = vi.spyOn(fs.promises, 'unlink').mockResolvedValue();
      await service.cleanupTempFile('/tmp/audio-test.mp3');
      expect(unlinkSpy).toHaveBeenCalledWith('/tmp/audio-test.mp3');
    });

    it('should ignore ENOENT error gracefully', async () => {
      const enoentError = new Error('File not found') as Error & { code?: string };
      enoentError.code = 'ENOENT';
      vi.spyOn(fs.promises, 'unlink').mockRejectedValue(enoentError);

      await expect(service.cleanupTempFile('/tmp/non-existent.mp3')).resolves.not.toThrow();
    });
  });
});

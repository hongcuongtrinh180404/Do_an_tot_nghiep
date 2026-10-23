import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs';
import { AssemblyAiService } from '../assemblyai.service.js';

const mockTranscripts = {
  transcribe: vi.fn(),
  sentences: vi.fn(),
  subtitles: vi.fn(),
  get: vi.fn(),
};

const mockFiles = {
  upload: vi.fn(),
};

vi.mock('assemblyai', () => {
  const MockAssemblyAI = vi.fn(function () {
    return {
      transcripts: mockTranscripts,
      files: mockFiles,
    };
  });
  return { AssemblyAI: MockAssemblyAI };
});

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
    createReadStream: vi.fn(),
  };
});

describe('AssemblyAiService', () => {
  let service: AssemblyAiService;
  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfigService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        if (key === 'ASSEMBLYAI_API_KEY') {
          return 'test-api-key-12345';
        }
        return defaultValue;
      }),
    };

    service = new AssemblyAiService(mockConfigService as unknown as ConfigService);
  });

  describe('Initialization and API Key Handling', () => {
    it('should throw BadRequestException if API key is not configured when transcribing', async () => {
      const emptyConfigService = {
        get: vi.fn().mockReturnValue(''),
      };
      const unconfiguredService = new AssemblyAiService(
        emptyConfigService as unknown as ConfigService,
      );

      await expect(
        unconfiguredService.transcribe('https://example.com/audio.mp3'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('transcribe', () => {
    it('should throw BadRequestException if audioUrl is empty or whitespace', async () => {
      await expect(service.transcribe('   ')).rejects.toThrow(BadRequestException);
    });

    it('should successfully transcribe audio with default Vietnamese language code', async () => {
      // Arrange
      const mockResult = {
        id: 'test-transcript-id',
        status: 'completed',
        text: ' Xin chào các bạn đến với khóa học lập trình web ',
        language_code: 'vi',
        audio_duration: 120.5,
        confidence: 0.95,
      };
      mockTranscripts.transcribe.mockResolvedValue(mockResult);
      mockTranscripts.sentences.mockResolvedValue({
        sentences: [
          { text: '  Xin chào các bạn đến với khóa học lập trình web.  ', start: 100, end: 900, confidence: 0.95 },
        ],
      });

      // Act
      const result = await service.transcribe('https://example.com/audio.mp3');

      // Assert
      expect(mockTranscripts.transcribe).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: 'https://example.com/audio.mp3',
          language_code: 'vi',
          punctuate: true,
          format_text: true,
        }),
      );
      expect(mockTranscripts.sentences).toHaveBeenCalledWith('test-transcript-id');
      expect(result.transcriptId).toBe('test-transcript-id');
      expect(result.rawTranscript).toBe('Xin chào các bạn đến với khóa học lập trình web');
      expect(result.languageCode).toBe('vi');
      expect(result.durationSeconds).toBe(121);
      expect(result.sentences).toHaveLength(1);
      expect(result.sentences[0]).toEqual({
        text: 'Xin chào các bạn đến với khóa học lập trình web.',
        start: 100,
        end: 900,
      });
      expect((result as unknown as Record<string, unknown>).confidence).toBeUndefined();
      expect((result as unknown as Record<string, unknown>).words).toBeUndefined();
    });

    it('should allow overriding languageCode and options', async () => {
      // Arrange
      const mockResult = {
        id: 'transcript-en',
        status: 'completed',
        text: 'Hello world',
        language_code: 'en',
        audio_duration: 30,
      };
      mockTranscripts.transcribe.mockResolvedValue(mockResult);
      mockTranscripts.sentences.mockResolvedValue({ sentences: [] });

      // Act
      const result = await service.transcribe('https://example.com/audio-en.mp3', {
        languageCode: 'en',
        speakerLabels: true,
      });

      // Assert
      expect(mockTranscripts.transcribe).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: 'https://example.com/audio-en.mp3',
          language_code: 'en',
          speaker_labels: true,
        }),
      );
      expect(result.transcriptId).toBe('transcript-en');
      expect(result.languageCode).toBe('en');
      expect(result.sentences).toEqual([]);
    });

    it('should throw InternalServerErrorException if transcript status is error', async () => {
      // Arrange
      const mockResult = {
        id: 'failed-transcript',
        status: 'error',
        error: 'Unsupported audio format or corrupt file',
      };
      mockTranscripts.transcribe.mockResolvedValue(mockResult);

      // Act & Assert
      await expect(
        service.transcribe('https://example.com/corrupt.mp3'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getSubtitles', () => {
    it('should throw BadRequestException if transcriptId is empty', async () => {
      await expect(service.getSubtitles('')).rejects.toThrow(BadRequestException);
    });

    it('should return subtitles in requested format', async () => {
      // Arrange
      const srtContent = '1\n00:00:01,000 --> 00:00:03,000\nXin chào';
      mockTranscripts.subtitles.mockResolvedValue(srtContent);

      // Act
      const result = await service.getSubtitles('transcript-123', 'srt');

      // Assert
      expect(mockTranscripts.subtitles).toHaveBeenCalledWith('transcript-123', 'srt');
      expect(result).toBe(srtContent);
    });
  });

  describe('getTranscript', () => {
    it('should throw BadRequestException if transcriptId is empty', async () => {
      await expect(service.getTranscript(' ')).rejects.toThrow(BadRequestException);
    });

    it('should return transcript object from AssemblyAI', async () => {
      // Arrange
      const mockTranscript = { id: 'test-123', status: 'completed' };
      mockTranscripts.get.mockResolvedValue(mockTranscript);

      // Act
      const result = await service.getTranscript('test-123');

      // Assert
      expect(mockTranscripts.get).toHaveBeenCalledWith('test-123');
      expect(result).toEqual(mockTranscript);
    });
  });

  describe('transcribeStream', () => {
    it('should throw BadRequestException if stream is null or undefined', async () => {
      await expect(
        service.transcribeStream(null as unknown as NodeJS.ReadableStream),
      ).rejects.toThrow(BadRequestException);
    });

    it('should upload stream to AssemblyAI and transcribe returned URL', async () => {
      // Arrange
      const mockStream = {} as NodeJS.ReadableStream;
      const uploadedUrl = 'https://cdn.assemblyai.com/upload/temp-upload-token';
      mockFiles.upload.mockResolvedValue(uploadedUrl);

      const mockResult = {
        id: 'transcript-from-stream',
        status: 'completed',
        text: 'Streamed video transcript content',
        language_code: 'vi',
        audio_duration: 60,
      };
      mockTranscripts.transcribe.mockResolvedValue(mockResult);
      mockTranscripts.sentences.mockResolvedValue({
        sentences: [
          { text: 'Streamed video transcript content', start: 0, end: 500 },
        ],
      });

      // Act
      const result = await service.transcribeStream(mockStream);

      // Assert
      expect(mockFiles.upload).toHaveBeenCalledWith(mockStream);
      expect(mockTranscripts.transcribe).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: uploadedUrl,
          language_code: 'vi',
        }),
      );
      expect(result.transcriptId).toBe('transcript-from-stream');
      expect(result.rawTranscript).toBe('Streamed video transcript content');
      expect(result.sentences).toHaveLength(1);
      expect(result.sentences[0]).toEqual({
        text: 'Streamed video transcript content',
        start: 0,
        end: 500,
      });
    });

    it('should throw InternalServerErrorException if upload fails', async () => {
      // Arrange
      const mockStream = {} as NodeJS.ReadableStream;
      mockFiles.upload.mockRejectedValue(new Error('Network upload failed'));

      // Act & Assert
      await expect(service.transcribeStream(mockStream)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('transcribeFile', () => {
    const sampleFilePath = '/tmp/audio-lesson-123.mp3';

    it('should throw BadRequestException if filePath is empty or whitespace', async () => {
      await expect(service.transcribeFile('   ')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if file does not exist on disk', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      await expect(service.transcribeFile('/non/existent/file.mp3')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should upload file stream and execute transcription successfully', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const mockReadStream = {} as fs.ReadStream;
      vi.mocked(fs.createReadStream).mockReturnValue(mockReadStream);

      const uploadedUrl = 'https://cdn.assemblyai.com/staging/test-file.mp3';
      mockFiles.upload.mockResolvedValue(uploadedUrl);

      const mockResult = {
        id: 'transcript-from-file',
        status: 'completed',
        text: 'Nội dung tệp âm thanh trích xuất từ video',
        language_code: 'vi',
        audio_duration: 90,
      };
      mockTranscripts.transcribe.mockResolvedValue(mockResult);
      mockTranscripts.sentences.mockResolvedValue({
        sentences: [
          { text: 'Nội dung tệp âm thanh trích xuất từ video.', start: 0, end: 1500 },
        ],
      });

      const result = await service.transcribeFile(sampleFilePath);

      expect(fs.createReadStream).toHaveBeenCalledWith(sampleFilePath);
      expect(mockFiles.upload).toHaveBeenCalledWith(mockReadStream);
      expect(mockTranscripts.transcribe).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: uploadedUrl,
          language_code: 'vi',
        }),
      );
      expect(result.transcriptId).toBe('transcript-from-file');
      expect(result.rawTranscript).toBe('Nội dung tệp âm thanh trích xuất từ video');
      expect(result.sentences).toHaveLength(1);
    });

    it('should throw InternalServerErrorException if upload of file fails', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.createReadStream).mockReturnValue({} as fs.ReadStream);
      mockFiles.upload.mockRejectedValue(new Error('S3 staging upload rejected'));

      await expect(service.transcribeFile(sampleFilePath)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});

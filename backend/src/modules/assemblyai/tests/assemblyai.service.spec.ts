import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssemblyAI } from 'assemblyai';
import { AssemblyAiService } from '../assemblyai.service.js';

const mockTranscripts = {
  transcribe: vi.fn(),
  subtitles: vi.fn(),
  get: vi.fn(),
};

vi.mock('assemblyai', () => {
  const MockAssemblyAI = vi.fn(function () {
    return {
      transcripts: mockTranscripts,
    };
  });
  return { AssemblyAI: MockAssemblyAI };
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
        text: 'Xin chào các bạn đến với khóa học lập trình web',
        language_code: 'vi',
        audio_duration: 120.5,
        confidence: 0.95,
        words: [
          { text: 'Xin', start: 100, end: 300, confidence: 0.98 },
          { text: 'chào', start: 310, end: 500, confidence: 0.96 },
          { text: 'các', start: 510, end: 700, confidence: 0.94 },
          { text: 'bạn', start: 710, end: 900, confidence: 0.95 },
        ],
      };
      mockTranscripts.transcribe.mockResolvedValue(mockResult);

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
      expect(result.transcriptId).toBe('test-transcript-id');
      expect(result.rawTranscript).toBe('Xin chào các bạn đến với khóa học lập trình web');
      expect(result.languageCode).toBe('vi');
      expect(result.durationSeconds).toBe(121);
      expect(result.words).toHaveLength(4);
      expect(result.words[0]).toEqual({
        word: 'Xin',
        start: 100,
        end: 300,
        confidence: 0.98,
      });
    });

    it('should allow overriding languageCode and options', async () => {
      // Arrange
      const mockResult = {
        id: 'transcript-en',
        status: 'completed',
        text: 'Hello world',
        language_code: 'en',
        audio_duration: 30,
        words: [],
      };
      mockTranscripts.transcribe.mockResolvedValue(mockResult);

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
});

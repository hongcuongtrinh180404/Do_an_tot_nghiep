import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { LessonFileValidationPipe } from '../pipes/lesson-file-validation.pipe.js';
import {
  MAX_VIDEO_SIZE_BYTES,
  MAX_DOCUMENT_SIZE_BYTES,
} from '../../storage/index.js';

describe('LessonFileValidationPipe', () => {
  let pipe: LessonFileValidationPipe;

  beforeEach(() => {
    pipe = new LessonFileValidationPipe();
  });

  it('should throw BadRequestException when file is undefined or missing buffer', () => {
    expect(() => pipe.transform(undefined as unknown as Express.Multer.File)).toThrow(
      new BadRequestException('Vui lòng chọn file tải lên'),
    );

    expect(() =>
      pipe.transform({
        originalname: 'test.mp4',
        mimetype: 'video/mp4',
      } as Express.Multer.File),
    ).toThrow(new BadRequestException('Vui lòng chọn file tải lên'));
  });

  it('should throw BadRequestException when MIME type is not supported', () => {
    const invalidFiles = [
      { mimetype: 'application/msword', originalname: 'old_doc.doc' },
      { mimetype: 'image/jpeg', originalname: 'photo.jpg' },
      { mimetype: 'application/zip', originalname: 'archive.zip' },
      { mimetype: 'text/plain', originalname: 'notes.txt' },
    ];

    for (const file of invalidFiles) {
      expect(() =>
        pipe.transform({
          ...file,
          buffer: Buffer.from('content'),
          size: 100,
        } as Express.Multer.File),
      ).toThrow(BadRequestException);
    }
  });

  it('should throw BadRequestException when video exceeds 900MB limit', () => {
    const oversizedVideo = {
      originalname: 'huge_lecture.mp4',
      mimetype: 'video/mp4',
      buffer: Buffer.from('data'),
      size: MAX_VIDEO_SIZE_BYTES + 1024,
    } as Express.Multer.File;

    expect(() => pipe.transform(oversizedVideo)).toThrow(BadRequestException);
  });

  it('should throw BadRequestException when document exceeds 50MB limit', () => {
    const oversizedDoc = {
      originalname: 'heavy_doc.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('data'),
      size: MAX_DOCUMENT_SIZE_BYTES + 1024,
    } as Express.Multer.File;

    expect(() => pipe.transform(oversizedDoc)).toThrow(BadRequestException);
  });

  it('should pass and sanitize originalname for valid MP4, WebM, and QuickTime videos', () => {
    const validVideos = [
      { mimetype: 'video/mp4', originalname: 'lesson../01?.mp4', size: 100 * 1024 * 1024 },
      { mimetype: 'video/webm', originalname: 'lesson_web.webm', size: 50 * 1024 * 1024 },
      { mimetype: 'video/quicktime', originalname: 'lesson_apple.mov', size: 800 * 1024 * 1024 },
    ];

    for (const v of validVideos) {
      const file = {
        ...v,
        buffer: Buffer.from('video_bytes'),
      } as Express.Multer.File;

      const result = pipe.transform(file);
      expect(result).toBeDefined();
      expect(result.originalname).not.toContain('..');
      expect(result.originalname).not.toContain('?');
    }
  });

  it('should pass and sanitize originalname for valid PDF and Word DOCX documents', () => {
    const validDocs = [
      { mimetype: 'application/pdf', originalname: '../../malicious.pdf', size: 10 * 1024 * 1024 },
      {
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        originalname: 'syllabus:final.docx',
        size: 5 * 1024 * 1024,
      },
    ];

    for (const d of validDocs) {
      const file = {
        ...d,
        buffer: Buffer.from('doc_bytes'),
      } as Express.Multer.File;

      const result = pipe.transform(file);
      expect(result).toBeDefined();
      expect(result.originalname).not.toContain('..');
      expect(result.originalname).not.toContain(':');
    }
  });
});

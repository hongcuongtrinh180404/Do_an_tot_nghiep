import { describe, expect, it } from 'vitest';
import {
  createLessonSchema, MAX_DOCUMENT_FILE_SIZE, MAX_VIDEO_FILE_SIZE,
} from '../schemas/create-lesson.schema';

const base = { title: ' Bài học mới ', order: 0, contentType: 'video', isPreview: false };
const video = new File(['video'], 'lecture.mp4', { type: 'video/mp4' });
const document = new File(['%PDF-test'], 'slides.pdf', { type: 'application/pdf' });

describe('Create lesson requires a video or document, not key points', () => {
  it('accepts a video without key points or description', () => {
    const result = createLessonSchema.parse({ ...base, contentFile: video });
    expect(result.title).toBe('Bài học mới');
    expect(result).not.toHaveProperty('keyPoints');
    expect(result).not.toHaveProperty('description');
  });

  it.each(['slides.pdf', 'notes.docx'])('accepts a document: %s', (name) => {
    expect(createLessonSchema.safeParse({
      ...base, contentType: 'document', contentFile: new File(['document'], name),
    }).success).toBe(true);
  });

  it.each([undefined, null, {}, 'video.mp4'])('rejects missing or fake files: %s', (contentFile) => {
    const result = createLessonSchema.safeParse({ ...base, contentFile });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === 'contentFile')).toBe(true);
  });

  it('rejects a missing file property entirely', () => {
    expect(createLessonSchema.safeParse(base).success).toBe(false);
  });

  it('rejects a document in video mode and a video in document mode', () => {
    expect(createLessonSchema.safeParse({ ...base, contentFile: document }).success).toBe(false);
    expect(createLessonSchema.safeParse({ ...base, contentType: 'document', contentFile: video }).success).toBe(false);
  });

  it('rejects empty files', () => {
    expect(createLessonSchema.safeParse({ ...base, contentFile: new File([], 'empty.mp4') }).success).toBe(false);
  });

  it.each([
    ['video', video, MAX_VIDEO_FILE_SIZE],
    ['document', document, MAX_DOCUMENT_FILE_SIZE],
  ])('checks the size limit for %s', (contentType, original, limit) => {
    const file = new File([original], original.name, { type: original.type });
    Object.defineProperty(file, 'size', { value: limit + 1, configurable: true });
    expect(createLessonSchema.safeParse({ ...base, contentType, contentFile: file }).success).toBe(false);
    Object.defineProperty(file, 'size', { value: limit });
    expect(createLessonSchema.safeParse({ ...base, contentType, contentFile: file }).success).toBe(true);
  });

  it('still requires a non-blank lesson title', () => {
    expect(createLessonSchema.safeParse({ ...base, title: '   ', contentFile: video }).success).toBe(false);
  });
});

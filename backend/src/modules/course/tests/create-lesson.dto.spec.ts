import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { LessonContentTypeEnum } from 'share-lib';
import { CreateLessonDto } from '../dto/create-lesson.dto.js';

const content = {
  type: LessonContentTypeEnum.VIDEO,
  url: 'http://localhost:9000/media/lecture.mp4',
  publicId: 'media/lecture.mp4', fileName: 'lecture.mp4',
  fileSize: 1024, mimeType: 'video/mp4', duration: 120,
};
const base = { title: ' Bài học mới ', order: 0, content };
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const transform = (body: unknown) => pipe.transform(body, { type: 'body', metatype: CreateLessonDto });

describe('CreateLessonDto', () => {
  it('accepts uploaded video without manual core content and trims the title', async () => {
    const dto = await transform(base);
    expect(dto.title).toBe('Bài học mới');
    expect(dto.content).toEqual(content);
    expect(dto).not.toHaveProperty('description');
  });

  it('accepts a PDF document and coerces order', async () => {
    const dto = await transform({
      ...base, order: '2', content: { type: LessonContentTypeEnum.DOCUMENT, url: '/slides.pdf' },
    });
    expect(dto.order).toBe(2);
    expect(dto.content.type).toBe(LessonContentTypeEnum.DOCUMENT);
  });

  it.each([undefined, null, {}, [], '', 'video.mp4', 42])('rejects absent or invalid content: %j', async (invalidContent) => {
    await expect(transform({ ...base, content: invalidContent })).rejects.toThrow(BadRequestException);
  });

  it('rejects an omitted content property', async () => {
    await expect(transform({ title: 'Bài học', order: 0 })).rejects.toThrow(BadRequestException);
  });

  it.each([
    { type: 'audio', url: '/audio.mp3' },
    { url: '/lecture.mp4' },
    { type: 'video' },
    { type: 'video', url: '' },
    { type: 'video', url: '   ' },
    { type: 'video', url: 123 },
    { ...content, duration: -1 },
    { ...content, fileSize: -1 },
    { ...content, fileSize: 1.5 },
  ])('rejects invalid content metadata: %j', async (invalidContent) => {
    await expect(transform({ ...base, content: invalidContent })).rejects.toThrow(BadRequestException);
  });

  it.each([undefined, '', '  ', 123, 'a'.repeat(201)])('rejects invalid titles: %j', async (title) => {
    await expect(transform({ ...base, title })).rejects.toThrow(BadRequestException);
  });

  it.each([undefined, -1, 0.5, 'not a number'])('rejects invalid order: %j', async (order) => {
    await expect(transform({ ...base, order })).rejects.toThrow(BadRequestException);
  });

  it.each([true, false])('accepts isPreview=%s', async (isPreview) => {
    expect((await transform({ ...base, isPreview })).isPreview).toBe(isPreview);
  });

  it('rejects non-boolean preview', async () => {
    await expect(transform({ ...base, isPreview: 'true' })).rejects.toThrow(BadRequestException);
  });

  it.each([
    { description: 'Old manual core content' },
    { keyPoints: ['Old manual point'] },
    { sectionId: '607f1f77bcf86cd799439022' },
  ])('does not accept retired fields or client-supplied sectionId: %j', async (extra) => {
    await expect(transform({ ...base, ...extra })).rejects.toThrow(BadRequestException);
  });

  it('trims URLs and decodes Vietnamese filenames', async () => {
    const name = 'Tài liệu hướng dẫn.pdf';
    const dto = plainToInstance(CreateLessonDto, {
      ...base, content: { ...content, url: `  ${content.url}  `, fileName: Buffer.from(name, 'utf8').toString('latin1') },
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.content.url).toBe(content.url);
    expect(dto.content.fileName).toBe(name);
  });
});

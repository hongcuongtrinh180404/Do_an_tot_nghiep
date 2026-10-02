import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LessonContentTypeEnum } from 'share-lib';
import { CreateLessonDto } from '../dto/create-lesson.dto.js';

describe('CreateLessonDto', () => {
  describe('Happy Path & Data Transformation', () => {
    it('1. should validate successfully with all valid fields', async () => {
      const payload = {
        title: 'Bài học 1: Giới thiệu khóa học',
        description: 'Mô tả chi tiết nội dung bài học',
        order: 0,
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.title).toBe('Bài học 1: Giới thiệu khóa học');
      expect(dto.description).toBe('Mô tả chi tiết nội dung bài học');
      expect(dto.order).toBe(0);
    });

    it('2. should validate successfully when optional description is omitted', async () => {
      const payload = {
        title: 'Bài học 2: Cài đặt môi trường',
        order: 1,
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.title).toBe('Bài học 2: Cài đặt môi trường');
      expect(dto.description).toBeUndefined();
      expect(dto.order).toBe(1);
    });

    it('3. should automatically trim whitespace in title', async () => {
      const payload = {
        title: '   Bài học có khoảng trắng đầu cuối   ',
        order: 2,
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.title).toBe('Bài học có khoảng trắng đầu cuối');
    });

    it('4. should transform empty or whitespace-only description to undefined', async () => {
      const payload = {
        title: 'Bài học 3',
        description: '    ',
        order: 3,
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.description).toBeUndefined();
    });

    it('5. should coerce valid numeric string order into number via @Type', async () => {
      const payload = {
        title: 'Bài học 4',
        order: '5',
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.order).toBe(5);
    });
  });

  describe('Validation: title', () => {
    it('6. should fail if title is missing', async () => {
      const payload = {
        order: 0,
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto);

      const titleError = errors.find((e) => e.property === 'title');
      expect(titleError).toBeDefined();
      expect(titleError?.constraints).toHaveProperty('isNotEmpty');
      expect(titleError?.constraints?.isNotEmpty).toBe('Tiêu đề bài học không được để trống');
    });

    it('7. should fail if title is an empty string', async () => {
      const payload = {
        title: '',
        order: 0,
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto);

      const titleError = errors.find((e) => e.property === 'title');
      expect(titleError).toBeDefined();
    });

    it('8. should fail if title consists only of whitespace', async () => {
      const payload = {
        title: '     ',
        order: 0,
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto);

      const titleError = errors.find((e) => e.property === 'title');
      expect(titleError).toBeDefined();
    });

    it('9. should fail if title is not a string', async () => {
      const payload = {
        title: 12345,
        order: 0,
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto);

      const titleError = errors.find((e) => e.property === 'title');
      expect(titleError).toBeDefined();
      expect(titleError?.constraints).toHaveProperty('isString');
      expect(titleError?.constraints?.isString).toBe('Tiêu đề bài học phải là chuỗi ký tự');
    });

    it('10. should fail if title exceeds 200 characters', async () => {
      const payload = {
        title: 'a'.repeat(201),
        order: 0,
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto);

      const titleError = errors.find((e) => e.property === 'title');
      expect(titleError).toBeDefined();
      expect(titleError?.constraints).toHaveProperty('maxLength');
      expect(titleError?.constraints?.maxLength).toBe(
        'Tiêu đề bài học không được vượt quá 200 ký tự',
      );
    });
  });

  describe('Validation: description', () => {
    it('11. should fail if description is not a string', async () => {
      const payload = {
        title: 'Bài học 1',
        description: 99999,
        order: 0,
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto);

      const descError = errors.find((e) => e.property === 'description');
      expect(descError).toBeDefined();
      expect(descError?.constraints).toHaveProperty('isString');
      expect(descError?.constraints?.isString).toBe('Mô tả bài học phải là chuỗi ký tự');
    });

    it('12. should fail if description exceeds 1000 characters', async () => {
      const payload = {
        title: 'Bài học 1',
        description: 'a'.repeat(1001),
        order: 0,
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto);

      const descError = errors.find((e) => e.property === 'description');
      expect(descError).toBeDefined();
      expect(descError?.constraints).toHaveProperty('maxLength');
      expect(descError?.constraints?.maxLength).toBe(
        'Mô tả bài học không được vượt quá 1000 ký tự',
      );
    });
  });

  describe('Validation: order', () => {
    it('13. should fail if order is missing', async () => {
      const payload = {
        title: 'Bài học 1',
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto);

      const orderError = errors.find((e) => e.property === 'order');
      expect(orderError).toBeDefined();
      expect(orderError?.constraints).toHaveProperty('isNotEmpty');
      expect(orderError?.constraints?.isNotEmpty).toBe('Thứ tự bài học không được để trống');
    });

    it('14. should fail if order is negative (< 0)', async () => {
      const payload = {
        title: 'Bài học 1',
        order: -1,
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto);

      const orderError = errors.find((e) => e.property === 'order');
      expect(orderError).toBeDefined();
      expect(orderError?.constraints).toHaveProperty('min');
      expect(orderError?.constraints?.min).toBe('Thứ tự bài học phải lớn hơn hoặc bằng 0');
    });

    it('15. should fail if order is a non-integer float number', async () => {
      const payload = {
        title: 'Bài học 1',
        order: 1.5,
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto);

      const orderError = errors.find((e) => e.property === 'order');
      expect(orderError).toBeDefined();
      expect(orderError?.constraints).toHaveProperty('isInt');
      expect(orderError?.constraints?.isInt).toBe('Thứ tự bài học phải là số nguyên');
    });
  });

  describe('Validation: content (LessonContentDto)', () => {
    it('16. should validate successfully with valid video content and isPreview = true', async () => {
      const payload = {
        title: 'Bài học 1: Video Giới thiệu',
        order: 0,
        content: {
          type: LessonContentTypeEnum.VIDEO,
          url: 'https://res.cloudinary.com/demo/video/upload/v123456/intro.mp4',
          publicId: 'courses/lessons/intro_123',
          fileName: 'intro.mp4',
          fileSize: 15485760,
          mimeType: 'video/mp4',
          duration: 360,
        },
        isPreview: true,
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.content?.type).toBe(LessonContentTypeEnum.VIDEO);
      expect(dto.content?.url).toBe('https://res.cloudinary.com/demo/video/upload/v123456/intro.mp4');
      expect(dto.content?.duration).toBe(360);
      expect(dto.isPreview).toBe(true);
    });

    it('17. should validate successfully with valid document content', async () => {
      const payload = {
        title: 'Tài liệu hướng dẫn',
        order: 1,
        content: {
          type: LessonContentTypeEnum.DOCUMENT,
          url: 'https://res.cloudinary.com/demo/raw/upload/v123456/guide.pdf',
          fileName: 'guide.pdf',
          fileSize: 204800,
          mimeType: 'application/pdf',
        },
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.content?.type).toBe(LessonContentTypeEnum.DOCUMENT);
      expect(dto.content?.fileName).toBe('guide.pdf');
    });

    it('17b. should transform and decode mojibake fileName in content', async () => {
      const rawVietnamese = 'Tài liệu hướng dẫn môn học.pdf';
      const latin1FileName = Buffer.from(rawVietnamese, 'utf8').toString('latin1');

      const payload = {
        title: 'Tài liệu môn học',
        order: 1,
        content: {
          type: LessonContentTypeEnum.DOCUMENT,
          url: 'https://storage.example.com/guide.pdf',
          fileName: latin1FileName,
        },
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.content?.fileName).toBe('Tài liệu hướng dẫn môn học.pdf');
    });

    it('18. should validate successfully when content is null or omitted', async () => {
      const payloadNull = {
        title: 'Bài học chưa có media',
        order: 2,
        content: null,
      };

      const dtoNull = plainToInstance(CreateLessonDto, payloadNull);
      const errorsNull = await validate(dtoNull);
      expect(errorsNull).toHaveLength(0);

      const payloadOmitted = {
        title: 'Bài học chưa có media 2',
        order: 3,
      };

      const dtoOmitted = plainToInstance(CreateLessonDto, payloadOmitted);
      const errorsOmitted = await validate(dtoOmitted);
      expect(errorsOmitted).toHaveLength(0);
    });

    it('19. should FAIL when content is an empty object {} (missing required type and url)', async () => {
      const payload = {
        title: 'Bài học có content rỗng',
        order: 4,
        content: {},
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto);

      const contentError = errors.find((e) => e.property === 'content');
      expect(contentError).toBeDefined();
      expect(contentError?.children?.length).toBeGreaterThan(0);

      const typeError = contentError?.children?.find((c) => c.property === 'type');
      expect(typeError?.constraints).toHaveProperty('isNotEmpty');

      const urlError = contentError?.children?.find((c) => c.property === 'url');
      expect(urlError?.constraints).toHaveProperty('isNotEmpty');
    });

    it('20. should FAIL when content.type is not a valid enum value', async () => {
      const payload = {
        title: 'Bài học',
        order: 0,
        content: {
          type: 'audio',
          url: 'https://example.com/audio.mp3',
        },
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto);

      const contentError = errors.find((e) => e.property === 'content');
      const typeError = contentError?.children?.find((c) => c.property === 'type');
      expect(typeError?.constraints).toHaveProperty('isEnum');
      expect(typeError?.constraints?.isEnum).toBe(
        'Loại nội dung bài học phải là video hoặc document',
      );
    });

    it('21. should FAIL when content.url is not a string', async () => {
      const payload = {
        title: 'Bài học',
        order: 0,
        content: {
          type: LessonContentTypeEnum.VIDEO,
          url: 12345,
        },
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto);

      const contentError = errors.find((e) => e.property === 'content');
      const urlError = contentError?.children?.find((c) => c.property === 'url');
      expect(urlError?.constraints).toHaveProperty('isString');
      expect(urlError?.constraints?.isString).toBe('URL nội dung phải là chuỗi ký tự');
    });

    it('22. should FAIL when content.duration is negative (< 0)', async () => {
      const payload = {
        title: 'Bài học',
        order: 0,
        content: {
          type: LessonContentTypeEnum.VIDEO,
          url: 'https://example.com/video.mp4',
          duration: -10,
        },
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto);

      const contentError = errors.find((e) => e.property === 'content');
      const durationError = contentError?.children?.find((c) => c.property === 'duration');
      expect(durationError?.constraints).toHaveProperty('min');
    });
  });

  describe('Validation: isPreview', () => {
    it('23. should validate successfully when isPreview is true or false', async () => {
      const payloadTrue = {
        title: 'Bài học thử miễn phí',
        order: 0,
        isPreview: true,
      };

      const dtoTrue = plainToInstance(CreateLessonDto, payloadTrue);
      const errorsTrue = await validate(dtoTrue);
      expect(errorsTrue).toHaveLength(0);
      expect(dtoTrue.isPreview).toBe(true);

      const payloadFalse = {
        title: 'Bài học có phí',
        order: 1,
        isPreview: false,
      };

      const dtoFalse = plainToInstance(CreateLessonDto, payloadFalse);
      const errorsFalse = await validate(dtoFalse);
      expect(errorsFalse).toHaveLength(0);
      expect(dtoFalse.isPreview).toBe(false);
    });

    it('24. should FAIL when isPreview is not a boolean', async () => {
      const payload = {
        title: 'Bài học',
        order: 0,
        isPreview: 'yes',
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto);

      const previewError = errors.find((e) => e.property === 'isPreview');
      expect(previewError).toBeDefined();
      expect(previewError?.constraints).toHaveProperty('isBoolean');
      expect(previewError?.constraints?.isBoolean).toBe('isPreview phải là giá trị boolean');
    });
  });

  describe('Validation: Security & Whitelist (sectionId not allowed in body)', () => {
    it('25. should fail validation if sectionId is passed in body when forbidNonWhitelisted is true', async () => {
      const payload = {
        title: 'Bài học',
        order: 0,
        sectionId: '607f1f77bcf86cd799439022',
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      const sectionIdError = errors.find((e) => e.property === 'sectionId');
      expect(sectionIdError).toBeDefined();
      expect(sectionIdError?.constraints).toHaveProperty('whitelistValidation');
    });
  });

  describe('Validation: content (LessonContentDto)', () => {
    it('26. should accept valid content with local MinIO URL', async () => {
      const payload = {
        title: 'Bài học 1',
        order: 0,
        content: {
          type: LessonContentTypeEnum.VIDEO,
          url: 'http://localhost:9000/thc-datn-media/courses/lessons/test-video.mp4',
          fileName: 'test-video.mp4',
          fileSize: 1048576,
          mimeType: 'video/mp4',
        },
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.content?.url).toBe(
        'http://localhost:9000/thc-datn-media/courses/lessons/test-video.mp4',
      );
    });

    it('27. should fail if content.url is empty or whitespace only', async () => {
      const payload = {
        title: 'Bài học 1',
        order: 0,
        content: {
          type: LessonContentTypeEnum.VIDEO,
          url: '   ',
        },
      };

      const dto = plainToInstance(CreateLessonDto, payload);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const contentError = errors.find((e) => e.property === 'content');
      expect(contentError).toBeDefined();
    });
  });
});

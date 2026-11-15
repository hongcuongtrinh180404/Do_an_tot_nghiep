import { BadRequestException, ValidationPipe } from '@nestjs/common';
import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { CreateCourseDto } from '../dto/create-course.dto.js';
import { UpdateCourseDto } from '../dto/update-course.dto.js';
import { CourseSchema } from '../schemas/course.schema.js';

describe('Course contract without short descriptions', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const description = `<p>${'Nội dung chi tiết được giữ nguyên. '.repeat(30)}</p>`;

  for (const dto of [CreateCourseDto, UpdateCourseDto]) {
    describe(dto.name, () => {
      it('still accepts and preserves the detailed description', async () => {
        const result = await pipe.transform(
          { title: 'Khóa học lập trình', description },
          { type: 'body', metatype: dto },
        );
        expect(result.description).toBe(description);
        expect(result).not.toHaveProperty('shortDescription');
      });

      it.each(['Legacy summary', '', null])('rejects the retired field with value %s', async (shortDescription) => {
        await expect(pipe.transform(
          { title: 'Khóa học lập trình', shortDescription },
          { type: 'body', metatype: dto },
        )).rejects.toThrow(BadRequestException);
      });
    });
  }

  it('has no schema default/path and does not persist the retired field in new documents', () => {
    expect(CourseSchema.path('shortDescription')).toBeUndefined();
    const CourseModel = mongoose.models.CourseWithoutShortDescriptionTest
      ?? mongoose.model('CourseWithoutShortDescriptionTest', CourseSchema);
    const course = new CourseModel({
      title: 'Khóa học lập trình',
      slug: 'khoa-hoc-lap-trinh',
      instructorId: new mongoose.Types.ObjectId(),
      description,
      shortDescription: 'Not persisted',
    }).toObject();

    expect(course).not.toHaveProperty('shortDescription');
    expect(course.description).toBe(description);
  });
});

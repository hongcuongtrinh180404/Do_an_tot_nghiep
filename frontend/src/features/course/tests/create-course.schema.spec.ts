import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CourseLevelEnum } from 'share-lib';
import { createCourseSchema } from '../schemas/create-course.schema';

describe('createCourseSchema Unit Tests', () => {
  const baseValidCourse = {
    title: 'Lập trình Python cơ bản',
    price: 0,
    level: CourseLevelEnum.ALL_LEVELS,
  };

  it('1. should validate successfully without slug field (system auto-generates slug)', () => {
    const result = createCourseSchema.safeParse(baseValidCourse);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.title, 'Lập trình Python cơ bản');
      assert.equal(result.data.slug, undefined);
    }
  });

  it('2. should trim whitespace from title and accept optional slug if provided', () => {
    const result = createCourseSchema.safeParse({
      ...baseValidCourse,
      title: '   Lập trình Python cơ bản   ',
      slug: '  lap-trinh-python-co-ban  ',
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.title, 'Lập trình Python cơ bản');
      assert.equal(result.data.slug, 'lap-trinh-python-co-ban');
    }
  });

  it('3. should reject when title is shorter than 3 characters', () => {
    const result = createCourseSchema.safeParse({
      ...baseValidCourse,
      title: 'Py',
    });
    assert.equal(result.success, false);
  });

  it('4. should reject when slug has invalid format (not kebab-case)', () => {
    const result = createCourseSchema.safeParse({
      ...baseValidCourse,
      slug: 'Invalid Slug!',
    });
    assert.equal(result.success, false);
  });
});

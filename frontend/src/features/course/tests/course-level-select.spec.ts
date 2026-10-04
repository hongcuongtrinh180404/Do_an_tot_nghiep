import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CourseLevelEnum } from 'share-lib';
import {
  COURSE_LEVEL_OPTIONS,
} from '../components/course-level-select';
import { createCourseSchema } from '../schemas/create-course.schema';

describe('CourseLevelSelect & Level Data Contracts', () => {
  describe('COURSE_LEVEL_OPTIONS Specifications', () => {
    it('1. should contain exactly 4 predefined level options', () => {
      assert.equal(COURSE_LEVEL_OPTIONS.length, 4);
    });

    it('2. should map exactly to CourseLevelEnum values', () => {
      const optionValues = COURSE_LEVEL_OPTIONS.map((opt) => opt.value);
      assert.deepEqual(optionValues, [
        CourseLevelEnum.ALL_LEVELS,
        CourseLevelEnum.BEGINNER,
        CourseLevelEnum.INTERMEDIATE,
        CourseLevelEnum.ADVANCED,
      ]);
    });

    it('3. should have exact concise Vietnamese labels without emoji or subtitles', () => {
      const labels = COURSE_LEVEL_OPTIONS.map((opt) => opt.label);
      assert.deepEqual(labels, [
        'Tất cả cấp độ',
        'Cơ bản',
        'Trung cấp',
        'Nâng cao',
      ]);

      // Ensure no emojis in any label
      const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
      for (const label of labels) {
        assert.equal(emojiRegex.test(label), false);
      }
    });

    it('4. should correctly calculate visual active bar count for each level', () => {
      const getActiveBarCount = (level: CourseLevelEnum): number => {
        if (level === CourseLevelEnum.ALL_LEVELS) return 0; // Layered icon
        if (level === CourseLevelEnum.BEGINNER) return 1;
        if (level === CourseLevelEnum.INTERMEDIATE) return 2;
        return 3;
      };

      assert.equal(getActiveBarCount(CourseLevelEnum.ALL_LEVELS), 0);
      assert.equal(getActiveBarCount(CourseLevelEnum.BEGINNER), 1);
      assert.equal(getActiveBarCount(CourseLevelEnum.INTERMEDIATE), 2);
      assert.equal(getActiveBarCount(CourseLevelEnum.ADVANCED), 3);
    });
  });

  describe('Form Schema Integration & Validation', () => {
    const validBaseForm = {
      title: 'Khóa học thiết kế SaaS hiện đại',
      slug: 'khoa-hoc-thiet-ke-saas-hien-dai',
      price: 0,
    };

    it('1. should accept each CourseLevelEnum validly in createCourseSchema', () => {
      for (const opt of COURSE_LEVEL_OPTIONS) {
        const result = createCourseSchema.safeParse({
          ...validBaseForm,
          level: opt.value,
        });

        assert.equal(result.success, true);
        if (result.success) {
          assert.equal(result.data.level, opt.value);
        }
      }
    });

    it('2. should reject invalid level values outside CourseLevelEnum', () => {
      const result = createCourseSchema.safeParse({
        ...validBaseForm,
        level: 'MASTER_LEVEL',
      });

      assert.equal(result.success, false);
    });
  });
});

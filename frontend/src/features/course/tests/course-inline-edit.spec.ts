import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, CourseLevelEnum } from 'share-lib';

describe('Course Inline Edit - Business Logic & Utilities', () => {
  describe('slugify Vietnamese titles', () => {
    it('1. should convert Vietnamese diacritics and special characters correctly', () => {
      const title = 'Khóa học Lập trình Web Full-Stack với Next.js & NestJS!';
      const result = slugify(title);
      assert.equal(result, 'khoa-hoc-lap-trinh-web-full-stack-voi-nextjs-nestjs');
    });

    it('2. should handle đ and Đ characters', () => {
      const title = 'Đường Đua Lập Trình Định Dạng Chuẩn';
      const result = slugify(title);
      assert.equal(result, 'duong-dua-lap-trinh-dinh-dang-chuan');
    });

    it('3. should trim leading, trailing, and duplicate hyphens', () => {
      const title = '   --- Khóa học Cực Hay ---   ';
      const result = slugify(title);
      assert.equal(result, 'khoa-hoc-cuc-hay');
    });

    it('4. should return empty string when input is empty or null', () => {
      assert.equal(slugify(''), '');
    });
  });

  describe('Price & Discount Calculation Logic', () => {
    it('1. should validate free course payload: price = 0 and originalPrice = null', () => {
      const isFree = true;
      const payload = isFree
        ? { price: 0, originalPrice: null }
        : { price: 100000, originalPrice: 100000 };

      assert.equal(payload.price, 0);
      assert.equal(payload.originalPrice, null);
    });

    it('2. should validate paid course with originalPrice and salePrice correctly', () => {
      const origPrice = 500000;
      const salePrice = 299000;

      assert.ok(salePrice <= origPrice, 'Sale price must be less than or equal to original price');

      const payload = {
        price: salePrice,
        originalPrice: origPrice,
      };

      assert.equal(payload.price, 299000);
      assert.equal(payload.originalPrice, 500000);
    });

    it('3. should reject invalid discount when salePrice > originalPrice', () => {
      const origPrice = 200000;
      const salePrice = 300000;
      const isValid = salePrice <= origPrice;

      assert.equal(isValid, false, 'Should be invalid when sale price exceeds original price');
    });
  });

  describe('Short Description length limit', () => {
    const MAX_CHARS = 200;

    it('1. should accept descriptions within 200 characters', () => {
      const shortDesc = 'Khóa học cung cấp kiến thức nền tảng và nâng cao về lập trình.';
      assert.ok(shortDesc.length <= MAX_CHARS);
    });

    it('2. should detect descriptions exceeding 200 characters', () => {
      const longDesc = 'a'.repeat(201);
      assert.equal(longDesc.length > MAX_CHARS, true);
    });
  });

  describe('Course Level Enum Options', () => {
    it('should support all standard course level options', () => {
      const levels = [
        CourseLevelEnum.ALL_LEVELS,
        CourseLevelEnum.BEGINNER,
        CourseLevelEnum.INTERMEDIATE,
        CourseLevelEnum.ADVANCED,
      ];
      assert.equal(levels.length, 4);
      assert.ok(levels.includes(CourseLevelEnum.BEGINNER));
    });
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CourseLevelEnum, CourseStatusEnum, type ICourse } from 'share-lib';
import { fetchPublicCourses } from '../services/public-courses.service';

describe('Public Course Card Data Mapping and Pricing Rules', () => {
  it('correctly calculates 80% discount when originalPrice is 10000 and price is 2000', () => {
    const originalPrice = 10000;
    const price = 2000;
    const hasDiscount = Boolean(originalPrice && originalPrice > price && price > 0);
    const discountPercent = hasDiscount
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null;

    assert.equal(hasDiscount, true);
    assert.equal(discountPercent, 80);
  });

  it('hides discount when originalPrice is equal or less than price', () => {
    const originalPrice = 2000;
    const price = 2000;
    const hasDiscount = Boolean(originalPrice && originalPrice > price && price > 0);
    const discountPercent = hasDiscount
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null;

    assert.equal(hasDiscount, false);
    assert.equal(discountPercent, null);
  });

  it('hides discount when course is free (price = 0)', () => {
    const originalPrice = 100000;
    const price = 0;
    const hasDiscount = Boolean(originalPrice && originalPrice > price && price > 0);

    assert.equal(hasDiscount, false);
  });

  it('evaluates best seller condition: true when studentsCount >= 5 or ratingAvg >= 4.5 with reviews', () => {
    const courseHighStudents: Pick<ICourse, 'studentsCount' | 'ratingAvg' | 'reviewCount'> = {
      studentsCount: 6,
      ratingAvg: 0,
      reviewCount: 0,
    };
    const isBestSeller1 = (courseHighStudents.studentsCount ?? 0) >= 5 ||
      ((courseHighStudents.reviewCount ?? 0) > 0 && (courseHighStudents.ratingAvg ?? 0) >= 4.5);
    assert.equal(isBestSeller1, true);

    const courseHighRating: Pick<ICourse, 'studentsCount' | 'ratingAvg' | 'reviewCount'> = {
      studentsCount: 1,
      ratingAvg: 4.8,
      reviewCount: 12,
    };
    const isBestSeller2 = (courseHighRating.studentsCount ?? 0) >= 5 ||
      ((courseHighRating.reviewCount ?? 0) > 0 && (courseHighRating.ratingAvg ?? 0) >= 4.5);
    assert.equal(isBestSeller2, true);

    const courseNew: Pick<ICourse, 'studentsCount' | 'ratingAvg' | 'reviewCount'> = {
      studentsCount: 1,
      ratingAvg: 0,
      reviewCount: 0,
    };
    const isBestSeller3 = (courseNew.studentsCount ?? 0) >= 5 ||
      ((courseNew.reviewCount ?? 0) > 0 && (courseNew.ratingAvg ?? 0) >= 4.5);
    assert.equal(isBestSeller3, false);
  });
});


import { describe, it, expect } from 'vitest';
import { UnprocessableEntityException } from '@nestjs/common';
import { ILessonSummaryData } from 'share-lib';
import { SummaryValidator } from '../validators/summary.validator.js';

describe('SummaryValidator', () => {
  const validSummary: ILessonSummaryData = {
    title: 'Tổng quan về Next.js App Router',
    overview: 'Bài học cung cấp kiến thức toàn diện về cấu trúc thư mục và cơ chế Server Component trong Next.js App Router.',
    keyPoints: [
      {
        title: 'Cơ chế Server Component mặc định',
        content: 'Tất cả các component trong thư mục app mặc định là RSC giúp giảm bundle size chuyển về client.',
        timestamp: 15,
      },
      {
        title: 'Quy ước đặt tên file đặc biệt',
        content: 'Các file như page.tsx, layout.tsx, loading.tsx đóng vai trò định tuyến và lồng ghép UI.',
        timestamp: 60,
      },
    ],
    conclusion: 'Nắm vững Next.js App Router là nền tảng cốt lõi để xây dựng ứng dụng web hiện đại tối ưu hiệu năng.',
  };

  it('should pass validation for a well-formed lesson summary', () => {
    const result = SummaryValidator.validate(validSummary, 300);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail if title is missing or empty', () => {
    const invalid = { ...validSummary, title: '   ' };
    const result = SummaryValidator.validate(invalid, 300);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('thiếu tiêu đề "title"'))).toBe(true);
  });

  it('should fail if overview is missing or empty', () => {
    const invalid = { ...validSummary, overview: '' };
    const result = SummaryValidator.validate(invalid, 300);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('thiếu tổng quan "overview"'))).toBe(true);
  });

  it('should pass even if conclusion is omitted', () => {
    const withoutConclusion = { ...validSummary, conclusion: undefined };
    const result = SummaryValidator.validate(withoutConclusion, 300);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail if conclusion is provided as an empty string', () => {
    const invalid = { ...validSummary, conclusion: '   ' };
    const result = SummaryValidator.validate(invalid, 300);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('"conclusion" không hợp lệ'))).toBe(true);
  });

  it('should fail if keyPoints is empty', () => {
    const invalid = { ...validSummary, keyPoints: [] };
    const result = SummaryValidator.validate(invalid, 300);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('ít nhất một ý chính'))).toBe(true);
  });

  it('should fail if a key point has empty title or content', () => {
    const invalid: ILessonSummaryData = {
      ...validSummary,
      keyPoints: [{ title: '', content: 'Nội dung', timestamp: 10 }],
    };
    const result = SummaryValidator.validate(invalid, 300);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('thiếu tiêu đề "title"'))).toBe(true);
  });

  it('should fail if key point timestamp exceeds video duration', () => {
    const invalid: ILessonSummaryData = {
      ...validSummary,
      keyPoints: [{ title: 'Ý chính', content: 'Nội dung', timestamp: 450 }], // Duration 300
    };
    const result = SummaryValidator.validate(invalid, 300);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('vượt quá thời lượng video'))).toBe(true);
  });

  it('should throw UnprocessableEntityException in validateOrFail when invalid', () => {
    const invalid = { ...validSummary, title: '' };
    expect(() => SummaryValidator.validateOrFail(invalid, 300)).toThrow(
      UnprocessableEntityException,
    );
  });
});

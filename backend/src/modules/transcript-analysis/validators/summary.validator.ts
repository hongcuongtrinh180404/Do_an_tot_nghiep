import { UnprocessableEntityException } from '@nestjs/common';
import { ILessonSummaryData } from 'share-lib';

export interface SummaryValidationResult {
  isValid: boolean;
  errors: string[];
}

export class SummaryValidator {
  /**
   * Kiểm tra toàn diện tính hợp lệ của bản tóm tắt bài học do AI sinh ra
   * @param data Dữ liệu tóm tắt bài học
   * @param maxDurationSeconds Thời lượng tối đa của video (giây) để chặn trên timestamp
   */
  static validate(
    data: ILessonSummaryData,
    maxDurationSeconds: number,
  ): SummaryValidationResult {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Dữ liệu summary không phải là một object hợp lệ.');
      return { isValid: false, errors };
    }

    // 1. Kiểm tra title
    if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
      errors.push('Bản tóm tắt thiếu tiêu đề "title" hoặc nội dung rỗng.');
    }

    // 2. Kiểm tra overview
    if (!data.overview || typeof data.overview !== 'string' || !data.overview.trim()) {
      errors.push('Bản tóm tắt thiếu tổng quan "overview" hoặc nội dung rỗng.');
    }

    // 3. Kiểm tra conclusion (tùy chọn)
    if (data.conclusion !== undefined && data.conclusion !== null) {
      if (typeof data.conclusion !== 'string' || !data.conclusion.trim()) {
        errors.push('Bản tóm tắt có trường "conclusion" không hợp lệ.');
      }
    }

    // 4. Kiểm tra keyPoints
    if (!Array.isArray(data.keyPoints) || data.keyPoints.length === 0) {
      errors.push('Bản tóm tắt phải có ít nhất một ý chính trong danh sách "keyPoints".');
    } else {
      data.keyPoints.forEach((point, index) => {
        const pointIdx = index + 1;
        if (!point.title || typeof point.title !== 'string' || !point.title.trim()) {
          errors.push(`Ý chính thứ ${pointIdx} thiếu tiêu đề "title".`);
        }
        if (!point.content || typeof point.content !== 'string' || !point.content.trim()) {
          errors.push(`Ý chính thứ ${pointIdx} thiếu nội dung "content".`);
        }
        if (point.timestamp !== undefined && point.timestamp !== null) {
          if (typeof point.timestamp !== 'number' || isNaN(point.timestamp)) {
            errors.push(`Ý chính thứ ${pointIdx} có timestamp không phải là số hợp lệ.`);
          } else {
            if (point.timestamp < 0) {
              errors.push(`Ý chính thứ ${pointIdx} có timestamp âm (${point.timestamp}s).`);
            }
            if (maxDurationSeconds > 0 && point.timestamp > maxDurationSeconds + 5) {
              errors.push(
                `Ý chính thứ ${pointIdx} có timestamp (${point.timestamp}s) vượt quá thời lượng video (${maxDurationSeconds}s).`,
              );
            }
          }
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Kiểm tra hợp lệ hoặc ném UnprocessableEntityException nếu có lỗi
   */
  static validateOrFail(
    data: ILessonSummaryData,
    maxDurationSeconds: number,
  ): void {
    const result = this.validate(data, maxDurationSeconds);
    if (!result.isValid) {
      throw new UnprocessableEntityException(
        `Cấu trúc bản tóm tắt bài học không hợp lệ: ${result.errors.join('; ')}`,
      );
    }
  }
}

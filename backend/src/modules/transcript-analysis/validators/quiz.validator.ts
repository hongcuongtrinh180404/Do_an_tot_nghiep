import { UnprocessableEntityException } from '@nestjs/common';
import { IGeneratedQuizItem, QuizQuestionTypeEnum } from 'share-lib';

export interface QuizValidationResult {
  isValid: boolean;
  errors: string[];
}

export class QuizValidator {
  /**
   * Kiểm tra toàn diện tính hợp lệ của danh sách câu hỏi trắc nghiệm do AI sinh ra
   * @param quizzes Danh sách câu hỏi
   * @param maxDurationSeconds Thời lượng tối đa của video (giây) để chặn trên timestamp
   * @param expectedCount Số lượng câu hỏi yêu cầu (mặc định 10 câu)
   */
  static validate(
    quizzes: IGeneratedQuizItem[],
    maxDurationSeconds: number,
    expectedCount = 10,
  ): QuizValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(quizzes)) {
      errors.push('Dữ liệu quizzes phải là một mảng câu hỏi.');
      return { isValid: false, errors };
    }

    if (quizzes.length !== expectedCount) {
      errors.push(
        `Số lượng câu hỏi không đúng yêu cầu: nhận được ${quizzes.length} câu, yêu cầu ${expectedCount} câu.`,
      );
    }

    quizzes.forEach((item, index) => {
      const qIndex = index + 1;

      // 1. Kiểm tra question text
      if (!item.question || typeof item.question !== 'string' || !item.question.trim()) {
        errors.push(`Câu hỏi số ${qIndex} thiếu nội dung "question" hoặc bị rỗng.`);
      }

      // 2. Kiểm tra timestamp
      if (typeof item.timestamp !== 'number' || isNaN(item.timestamp)) {
        errors.push(`Câu hỏi số ${qIndex} có "timestamp" không phải là số hợp lệ.`);
      } else {
        if (item.timestamp < 0) {
          errors.push(`Câu hỏi số ${qIndex} có timestamp âm (${item.timestamp}s).`);
        }
        if (maxDurationSeconds > 0 && item.timestamp > maxDurationSeconds + 5) {
          errors.push(
            `Câu hỏi số ${qIndex} có timestamp (${item.timestamp}s) vượt quá thời lượng video (${maxDurationSeconds}s).`,
          );
        }
      }

      // 3. Kiểm tra questionType (chấp nhận cả 'single' và 'SINGLE')
      const qType = (item.questionType || '').toString().toLowerCase();
      if (qType && qType !== QuizQuestionTypeEnum.SINGLE) {
        errors.push(
          `Câu hỏi số ${qIndex} có questionType không hợp lệ (yêu cầu "${QuizQuestionTypeEnum.SINGLE}").`,
        );
      }

      // 4. Kiểm tra options
      if (!Array.isArray(item.options) || item.options.length !== 4) {
        errors.push(
          `Câu hỏi số ${qIndex} phải có đúng 4 lựa chọn (options). Hiện tại có: ${item.options?.length ?? 0}.`,
        );
      } else {
        let correctCount = 0;
        item.options.forEach((opt, optIdx) => {
          if (!opt.text || typeof opt.text !== 'string' || !opt.text.trim()) {
            errors.push(
              `Câu hỏi số ${qIndex}, lựa chọn thứ ${optIdx + 1} (${opt.label || 'unknown'}) thiếu nội dung "text".`,
            );
          }
          const isCorrect =
            opt.isCorrect === true ||
            (opt.isCorrect as unknown) === 'true' ||
            (opt.isCorrect as unknown) === 1;
          if (isCorrect) {
            correctCount++;
          }
        });

        if (correctCount !== 1) {
          errors.push(
            `Câu hỏi số ${qIndex} phải có đúng 1 đáp án chính xác (isCorrect = true). Hiện có: ${correctCount}.`,
          );
        }
      }

      // 5. Kiểm tra explanation
      if (!item.explanation || typeof item.explanation !== 'string' || !item.explanation.trim()) {
        errors.push(`Câu hỏi số ${qIndex} thiếu phần giải thích "explanation".`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Kiểm tra hợp lệ hoặc ném UnprocessableEntityException nếu có lỗi
   */
  static validateOrFail(
    quizzes: IGeneratedQuizItem[],
    maxDurationSeconds: number,
    expectedCount = 10,
  ): void {
    const result = this.validate(quizzes, maxDurationSeconds, expectedCount);
    if (!result.isValid) {
      throw new UnprocessableEntityException(
        `Danh sách câu hỏi trắc nghiệm không hợp lệ: ${result.errors.join('; ')}`,
      );
    }
  }
}

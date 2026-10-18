import { UnprocessableEntityException } from '@nestjs/common';
import { ILessonMindmapData, ILessonMindmapNode } from 'share-lib';

export interface MindmapValidationResult {
  isValid: boolean;
  errors: string[];
}

export class MindmapValidator {
  /**
   * Kiểm tra toàn diện tính hợp lệ của cấu trúc cây Mindmap do Gemini sinh ra
   * @param data Dữ liệu cây Mindmap
   * @param maxDurationSeconds Thời lượng tối đa của video (giây) để chặn trên timestamp
   * @param maxDepth Số cấp tối đa tính từ root (mặc định: 3 cấp)
   */
  static validate(
    data: ILessonMindmapData,
    maxDurationSeconds: number,
    maxDepth = 3,
  ): MindmapValidationResult {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Dữ liệu mindmap không phải là một object hợp lệ.');
      return { isValid: false, errors };
    }

    if (!data.root || typeof data.root !== 'object') {
      errors.push('Cấu trúc mindmap thiếu node gốc "root".');
      return { isValid: false, errors };
    }

    // Duyệt và kiểm tra đệ quy từng node trong cây
    this.validateNode(data.root, 0, maxDepth, maxDurationSeconds, errors);

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Kiểm tra hợp lệ hoặc ném UnprocessableEntityException nếu có lỗi
   */
  static validateOrFail(
    data: ILessonMindmapData,
    maxDurationSeconds: number,
    maxDepth = 3,
  ): void {
    const result = this.validate(data, maxDurationSeconds, maxDepth);
    if (!result.isValid) {
      throw new UnprocessableEntityException(
        `Cấu trúc cây Mindmap không hợp lệ: ${result.errors.join('; ')}`,
      );
    }
  }

  private static validateNode(
    node: ILessonMindmapNode,
    currentDepth: number,
    maxDepth: number,
    maxDurationSeconds: number,
    errors: string[],
  ): void {
    // 1. Kiểm tra trường id
    if (!node.id || typeof node.id !== 'string' || !node.id.trim()) {
      errors.push(`Node tại cấp ${currentDepth} thiếu trường "id" hợp lệ.`);
    }

    // 2. Kiểm tra trường title
    if (!node.title || typeof node.title !== 'string' || !node.title.trim()) {
      errors.push(`Node "${node.id || 'unknown'}" thiếu trường "title" hoặc nội dung rỗng.`);
    }

    // 3. Kiểm tra timestamp
    if (typeof node.timestamp !== 'number' || isNaN(node.timestamp)) {
      errors.push(`Node "${node.title || node.id}" có timestamp không phải là một số hợp lệ.`);
    } else {
      if (node.timestamp < 0) {
        errors.push(`Node "${node.title}" có timestamp âm (${node.timestamp}s).`);
      }
      if (maxDurationSeconds > 0 && node.timestamp > maxDurationSeconds + 5) {
        // Cho phép dung sai 5s cho việc làm tròn
        errors.push(
          `Node "${node.title}" có timestamp (${node.timestamp}s) vượt quá thời lượng video (${maxDurationSeconds}s).`,
        );
      }
    }

    // 4. Kiểm tra độ sâu tối đa (maxDepth tính từ root = cấp 0)
    if (currentDepth > maxDepth) {
      errors.push(
        `Cây mindmap vượt quá độ sâu tối đa cho phép (tối đa 4 level). Node vi phạm: "${node.title}" tại level ${currentDepth + 1}.`,
      );
    }

    // 5. Kiểm tra node con (children)
    if (node.children) {
      if (!Array.isArray(node.children)) {
        errors.push(`Trường "children" của node "${node.title}" phải là một mảng.`);
      } else {
        // Nếu đã ở cấp tối đa (Level 3) thì không được phép có node con nữa
        if (currentDepth >= maxDepth && node.children.length > 0) {
          errors.push(
            `Node "${node.title}" ở level ${currentDepth + 1} (level tối đa: 4) không được có node con thêm.`,
          );
        }

        for (const child of node.children) {
          this.validateNode(child, currentDepth + 1, maxDepth, maxDurationSeconds, errors);
        }
      }
    }
  }
}

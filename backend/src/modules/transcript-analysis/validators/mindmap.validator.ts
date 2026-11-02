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
   * @param maxDepth Số cấp tối đa tính từ root (mặc định: 4 cấp - tức tối đa 5 level)
   */
  static validate(
    data: ILessonMindmapData,
    maxDurationSeconds: number,
    maxDepth = 4,
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
    maxDepth = 4,
  ): void {
    const result = this.validate(data, maxDurationSeconds, maxDepth);
    if (!result.isValid) {
      throw new UnprocessableEntityException(
        `Cấu trúc cây Mindmap không hợp lệ: ${result.errors.join('; ')}`,
      );
    }
  }

  /**
   * Tự động chuẩn hóa và cắt tỉa (Auto-Sanitize / Pruning) cấu trúc cây Mindmap do AI sinh ra
   * Đảm bảo an toàn tuyệt đối (Fail-safe):
   * 1. Hỗ trợ bóc tách các dạng envelope khác nhau từ LLM (root, mindmap.root, data.root).
   * 2. Chuẩn hóa ID, Title (trim whitespace, sinh fallback khi rỗng).
   * 3. Ràng buộc timestamp hợp lệ trong khoảng [0, maxDurationSeconds].
   * 4. Cắt tỉa (prune) triệt để các nhánh con vượt quá maxDepth (mặc định 4 = 5 Level),
   *    xóa bỏ trường children tại node lá để bảo đảm 100% không vi phạm ràng buộc độ sâu.
   *
   * @param data Dữ liệu nhận từ AI
   * @param maxDurationSeconds Thời lượng video tính bằng giây
   * @param maxDepth Độ sâu tối đa tính từ root (mặc định: 4 - tương đương 5 level)
   * @param fallbackTitle Tiêu đề bài học dự phòng cho root nếu bị thiếu
   */
  static sanitize(
    data: unknown,
    maxDurationSeconds: number,
    maxDepth = 4,
    fallbackTitle = 'Bài học',
  ): ILessonMindmapData {
    if (!data || typeof data !== 'object') {
      return {
        root: {
          id: 'root',
          title: fallbackTitle.trim() || 'Bài học',
          timestamp: 0,
        },
      };
    }

    const rawRecord = data as Record<string, unknown>;

    // 1. Phục hồi cấu trúc root nếu LLM bao bọc trong envelope { mindmap: { root: ... } } hoặc { data: { root: ... } }
    let rawRoot: unknown = rawRecord.root;
    if (!rawRoot && rawRecord.mindmap && typeof rawRecord.mindmap === 'object') {
      rawRoot = (rawRecord.mindmap as Record<string, unknown>).root;
    }
    if (!rawRoot && rawRecord.data && typeof rawRecord.data === 'object') {
      rawRoot = (rawRecord.data as Record<string, unknown>).root;
    }
    // Nếu LLM trả về trực tiếp đối tượng node gốc { id: 'root', title: '...', children: [...] }
    if (!rawRoot && typeof rawRecord.title === 'string') {
      rawRoot = rawRecord;
    }

    if (!rawRoot || typeof rawRoot !== 'object') {
      return {
        root: {
          id: 'root',
          title: fallbackTitle.trim() || 'Bài học',
          timestamp: 0,
        },
      };
    }

    const sanitizedRoot = this.sanitizeNode(
      rawRoot as Record<string, unknown>,
      0,
      maxDepth,
      maxDurationSeconds,
      0,
      0,
      fallbackTitle,
    );

    // Node root luôn có id là 'root' và timestamp là 0
    sanitizedRoot.id = 'root';
    sanitizedRoot.timestamp = 0;

    return {
      root: sanitizedRoot,
    };
  }

  private static sanitizeNode(
    rawNode: Record<string, unknown>,
    currentDepth: number,
    maxDepth: number,
    maxDurationSeconds: number,
    parentTimestamp: number,
    index: number,
    fallbackTitle?: string,
  ): ILessonMindmapNode {
    // 1. Chuẩn hóa ID
    const id =
      typeof rawNode.id === 'string' && rawNode.id.trim()
        ? rawNode.id.trim()
        : `node-${currentDepth}-${index}`;

    // 2. Chuẩn hóa Title
    const title =
      typeof rawNode.title === 'string' && rawNode.title.trim()
        ? rawNode.title.trim()
        : fallbackTitle?.trim() || `Nội dung cấp ${currentDepth + 1}`;

    // 3. Chuẩn hóa Timestamp
    let timestamp =
      typeof rawNode.timestamp === 'number' && !isNaN(rawNode.timestamp)
        ? rawNode.timestamp
        : parentTimestamp;

    if (timestamp < 0) {
      timestamp = 0;
    }
    if (maxDurationSeconds > 0 && timestamp > maxDurationSeconds) {
      timestamp = maxDurationSeconds;
    }

    const node: ILessonMindmapNode = {
      id,
      title,
      timestamp,
    };

    // 4. Cắt tỉa (Pruning) độ sâu cây:
    // Nếu node đã ở cấp tối đa (currentDepth >= maxDepth), TUYỆT ĐỐI KHÔNG ĐƯỢC có children
    if (currentDepth >= maxDepth) {
      // Đã ở level tối đa (Level 5 khi maxDepth = 4), loại bỏ hoàn toàn children
      return node;
    }

    // Nếu chưa ở cấp tối đa và có mảng children hợp lệ
    if (Array.isArray(rawNode.children) && rawNode.children.length > 0) {
      const sanitizedChildren: ILessonMindmapNode[] = [];

      rawNode.children.forEach((child, childIndex) => {
        if (child && typeof child === 'object') {
          sanitizedChildren.push(
            this.sanitizeNode(
              child as Record<string, unknown>,
              currentDepth + 1,
              maxDepth,
              maxDurationSeconds,
              timestamp,
              childIndex,
            ),
          );
        }
      });

      if (sanitizedChildren.length > 0) {
        node.children = sanitizedChildren;
      }
    }

    return node;
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
        `Cây mindmap vượt quá độ sâu tối đa cho phép (tối đa ${maxDepth + 1} level). Node vi phạm: "${node.title}" tại level ${currentDepth + 1}.`,
      );
    }

    // 5. Kiểm tra node con (children)
    if (node.children) {
      if (!Array.isArray(node.children)) {
        errors.push(`Trường "children" của node "${node.title}" phải là một mảng.`);
      } else {
        // Nếu đã ở cấp tối đa thì không được phép có node con thêm
        if (currentDepth >= maxDepth && node.children.length > 0) {
          errors.push(
            `Node "${node.title}" ở level ${currentDepth + 1} (level tối đa: ${maxDepth + 1}) không được có node con thêm.`,
          );
        }

        for (const child of node.children) {
          this.validateNode(child, currentDepth + 1, maxDepth, maxDurationSeconds, errors);
        }
      }
    }
  }
}

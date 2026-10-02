/**
 * Bảng màu pastel xoay vòng (5 màu) cho giao diện nhập Ý cốt lõi của bài học (Lesson Key Points).
 * Lưu ý: Màu sắc chỉ phục vụ tầng hiển thị UI, không lưu trữ trong cơ sở dữ liệu.
 * Tuyệt đối không sử dụng màu tím theo quy tắc Purple Ban.
 */
export interface KeyPointColorTheme {
  name: string;
  bg: string;
  border: string;
  dot: string;
  text: string;
}

export const PASTEL_KEY_POINT_PALETTE: readonly KeyPointColorTheme[] = [
  {
    name: 'Vàng kem ấm',
    bg: '#FFF8E6',
    border: '#F3E0B5',
    dot: '#C49B3E',
    text: '#1E293B',
  },
  {
    name: 'Hồng cam pastel',
    bg: '#FFE2DE',
    border: '#F0C4BF',
    dot: '#D97368',
    text: '#1E293B',
  },
  {
    name: 'Lam xám dịu',
    bg: '#ADB2C5',
    border: '#9297AC',
    dot: '#5F677D',
    text: '#1E293B',
  },
  {
    name: 'Xanh xám nhạt',
    bg: '#B5CFD1',
    border: '#9BB7B9',
    dot: '#4E7A7D',
    text: '#1E293B',
  },
  {
    name: 'Xanh sương mù',
    bg: '#D9E4E6',
    border: '#C1D0D3',
    dot: '#6E888C',
    text: '#1E293B',
  },
] as const;

/**
 * Lấy mã màu pastel dựa vào index (xoay vòng index % 5)
 */
export function getKeyPointColor(index: number): KeyPointColorTheme {
  const safeIndex = Math.max(0, Math.floor(index));
  return PASTEL_KEY_POINT_PALETTE[safeIndex % PASTEL_KEY_POINT_PALETTE.length];
}

/**
 * Gợi ý placeholder theo thứ tự để người dùng dễ hình dung cấu trúc nhánh Mindmap
 */
export const KEY_POINT_PLACEHOLDERS: readonly string[] = [
  'Ví dụ: Khái niệm vòng lặp for và cơ chế hoạt động',
  'Cú pháp cơ bản và các tham số điều khiển',
  'Ứng dụng duyệt mảng và xử lý dữ liệu thực tế',
  'Các lỗi thường gặp và cách tối ưu hiệu năng',
  'Thực hành bài tập tổng hợp và lưu ý trọng tâm',
] as const;

export function getKeyPointPlaceholder(index: number): string {
  const safeIndex = Math.max(0, Math.floor(index));
  return KEY_POINT_PLACEHOLDERS[safeIndex % KEY_POINT_PLACEHOLDERS.length];
}

/**
 * Cấu trúc đối tượng Ý cốt lõi của bài học với ID riêng biệt (UUID v4)
 */
export interface ILessonKeyPoint {
  id: string;
  text: string;
}

/**
 * Sinh UUID v4 chuẩn quốc tế cho từng ý cốt lõi.
 * Sử dụng crypto.randomUUID() chuẩn của trình duyệt/Node.js, kèm fallback an toàn.
 */
export function generateKeyPointId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Chuyển mảng các ý cốt lõi thành chuỗi JSON stringify để lưu trữ vào trường description.
 * Đảm bảo mỗi ý có ID duy nhất và tự động loại bỏ các chuỗi rỗng hoặc chỉ toàn khoảng trắng.
 */
export function serializeKeyPoints(
  points?: (ILessonKeyPoint | string | null | undefined)[],
): string {
  if (!points || !Array.isArray(points)) {
    return '[]';
  }

  const cleaned: ILessonKeyPoint[] = points
    .filter((p): p is ILessonKeyPoint | string => Boolean(p))
    .map((p) => {
      if (typeof p === 'string') {
        return {
          id: generateKeyPointId(),
          text: p.trim(),
        };
      }
      return {
        id:
          p.id && typeof p.id === 'string' && p.id.trim()
            ? p.id.trim()
            : generateKeyPointId(),
        text: typeof p.text === 'string' ? p.text.trim() : '',
      };
    })
    .filter((p) => p.text.length > 0);

  return JSON.stringify(cleaned);
}

/**
 * Giải mã trường description thành mảng các ý cốt lõi có ID (ILessonKeyPoint[]).
 * Hỗ trợ cả dữ liệu chuỗi JSON mới [{ id, text }], dữ liệu cũ string[] và văn bản thuần legacy.
 */
export function deserializeKeyPoints(
  description?: string | null,
): ILessonKeyPoint[] {
  if (!description || typeof description !== 'string') {
    return [];
  }

  const trimmed = description.trim();
  if (!trimmed) {
    return [];
  }

  // Trường hợp 1: Chuỗi là JSON array hợp lệ
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map((item): ILessonKeyPoint | null => {
            // Định dạng mới: { id, text }
            if (
              item &&
              typeof item === 'object' &&
              'text' in item &&
              typeof (item as { text: unknown }).text === 'string'
            ) {
              const obj = item as { id?: unknown; text: string };
              const id =
                typeof obj.id === 'string' && obj.id.trim()
                  ? obj.id.trim()
                  : generateKeyPointId();
              const text = obj.text.trim();
              return text ? { id, text } : null;
            }

            // Định dạng cũ (chuỗi string): "Khái niệm..." -> Tự động cấp UUID
            if (typeof item === 'string') {
              const text = item.trim();
              return text ? { id: generateKeyPointId(), text } : null;
            }

            return null;
          })
          .filter((item): item is ILessonKeyPoint => item !== null);
      }
    } catch {
      // Fallback xuống cách tách dòng thông thường nếu parse JSON lỗi
    }
  }

  // Trường hợp 2: Dữ liệu văn bản tự do legacy (tách theo từng dòng)
  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((text) => ({
      id: generateKeyPointId(),
      text,
    }));
}


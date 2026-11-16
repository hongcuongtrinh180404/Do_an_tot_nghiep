import { describe, it, expect } from 'vitest';
import { CourseStatusEnum, type ICourse } from 'share-lib';
import {
  extractPlainTextFromHtml,
  formatCourseDescription,
} from '../utils/format-course-description.util';

/**
 * Pure functions matching the CourseCard logic for verification
 */
export function getCategoryIcon(name?: string | null): string {
  if (!name) return '💻';
  const lower = name.toLowerCase();
  if (lower.includes('thiết kế') || lower.includes('design') || lower.includes('figma') || lower.includes('đồ họa')) {
    return '🎨';
  }
  if (lower.includes('marketing') || lower.includes('seo') || lower.includes('kinh doanh') || lower.includes('kinh tế')) {
    return '📈';
  }
  if (lower.includes('ngoại ngữ') || lower.includes('tiếng') || lower.includes('language') || lower.includes('english')) {
    return '🌐';
  }
  if (lower.includes('âm nhạc') || lower.includes('music')) {
    return '🎵';
  }
  return '💻';
}

export function getCategoryThemedBackground(categoryName?: string | null): {
  bgClass: string;
  badgeEmoji: string;
  badgeLabel: string;
} {
  if (!categoryName) {
    return {
      bgClass: 'bg-gradient-to-br from-slate-900 via-neutral-900 to-slate-950',
      badgeEmoji: '💻',
      badgeLabel: 'Công nghệ thông tin',
    };
  }

  const lower = categoryName.toLowerCase();
  if (lower.includes('thiết kế') || lower.includes('design') || lower.includes('figma') || lower.includes('đồ họa')) {
    return {
      bgClass: 'bg-gradient-to-br from-[#121826] via-[#1e1b4b] to-[#0f172a]',
      badgeEmoji: '🎨',
      badgeLabel: categoryName,
    };
  }

  if (lower.includes('marketing') || lower.includes('seo') || lower.includes('kinh doanh') || lower.includes('kinh tế')) {
    return {
      bgClass: 'bg-gradient-to-br from-[#0284c7] via-[#0369a1] to-[#0c4a6e]',
      badgeEmoji: '📈',
      badgeLabel: categoryName,
    };
  }

  if (lower.includes('ngoại ngữ') || lower.includes('tiếng') || lower.includes('language') || lower.includes('english')) {
    return {
      bgClass: 'bg-gradient-to-br from-[#047857] via-[#065f46] to-[#064e3b]',
      badgeEmoji: '🌐',
      badgeLabel: categoryName,
    };
  }

  return {
    bgClass: 'bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]',
    badgeEmoji: '💻',
    badgeLabel: categoryName,
  };
}

export function formatPrice(price?: number): { text: string; isFree: boolean } {
  if (price === undefined || price === null || price <= 0) {
    return { text: 'Miễn phí', isFree: true };
  }
  return {
    text: `${price.toLocaleString('vi-VN')} đ`,
    isFree: false,
  };
}

export function formatCourseStructure(
  sectionsCount?: number,
  lessonsCount?: number,
  totalDuration?: number,
): string {
  const parts: string[] = [];

  if (typeof sectionsCount === 'number' && sectionsCount > 0) {
    parts.push(`${sectionsCount} chương`);
  }

  if (typeof lessonsCount === 'number' && lessonsCount > 0) {
    parts.push(`${lessonsCount} bài giảng`);
  }

  if (typeof totalDuration === 'number' && totalDuration > 0) {
    const hours = Math.floor(totalDuration / 3600);
    const minutes = Math.floor((totalDuration % 3600) / 60);
    if (hours > 0 && minutes > 0) {
      parts.push(`${hours} giờ ${minutes} phút`);
    } else if (hours > 0) {
      parts.push(`${hours} giờ`);
    } else if (minutes > 0) {
      parts.push(`${minutes} phút`);
    } else {
      parts.push('< 1 phút');
    }
  }

  if (parts.length === 0) {
    return 'Đang cập nhật nội dung bài giảng';
  }

  return parts.join(' • ');
}

export function getAvailableCourseActions(course: Pick<ICourse, 'status' | 'studentsCount'>): {
  directAction: string;
  menuActions: { label: string; enabled: boolean }[];
  canDelete: boolean;
  deleteDisabledReason?: string;
} {
  const isPendingApproval = course.status === CourseStatusEnum.PENDING_APPROVAL;
  const isPublished = course.status === CourseStatusEnum.PUBLISHED;
  const isArchived = course.status === CourseStatusEnum.ARCHIVED;
  const studentsCount = course.studentsCount ?? 0;
  const hasStudents = studentsCount > 0;
  const canDelete = !isPendingApproval && !hasStudents;

  let deleteDisabledReason: string | undefined;
  if (isPendingApproval) {
    deleteDisabledReason = 'Khóa học đang chờ duyệt. Vui lòng rút yêu cầu duyệt trước khi xóa.';
  } else if (hasStudents) {
    deleteDisabledReason = `Khóa học đã có ${studentsCount} học viên đăng ký. Không thể xóa để bảo đảm quyền lợi học tập của học viên.`;
  }

  const menuActions: { label: string; enabled: boolean }[] = [
    { label: 'Xem thử', enabled: true },
  ];

  if (isPublished) {
    menuActions.push({ label: 'Ngưng bán', enabled: true });
  } else if (isArchived) {
    menuActions.push({ label: 'Mở bán lại', enabled: true });
  } else {
    // DRAFT or other: Ngưng bán is present in the menu but disabled
    menuActions.push({ label: 'Ngưng bán', enabled: false });
  }

  if (isPendingApproval) {
    menuActions.push({ label: 'Rút duyệt', enabled: true });
  }

  menuActions.push({ label: 'Xóa', enabled: canDelete });

  return {
    directAction: 'Chỉnh sửa',
    menuActions,
    canDelete,
    deleteDisabledReason,
  };
}

describe('Instructor Course Card Redesign - Logic & Formatting', () => {
  describe('Category Icon Mapping', () => {
    it('returns 🎨 for design-related categories', () => {
      expect(getCategoryIcon('Thiết kế đồ họa')).toBe('🎨');
      expect(getCategoryIcon('UI/UX Design')).toBe('🎨');
      expect(getCategoryIcon('Figma cơ bản')).toBe('🎨');
    });

    it('returns 📈 for marketing and business categories', () => {
      expect(getCategoryIcon('Marketing')).toBe('📈');
      expect(getCategoryIcon('SEO Master')).toBe('📈');
      expect(getCategoryIcon('Quản trị kinh doanh')).toBe('📈');
    });

    it('returns 💻 for IT and programming categories', () => {
      expect(getCategoryIcon('Công nghệ thông tin')).toBe('💻');
      expect(getCategoryIcon('Lập trình Python')).toBe('💻');
      expect(getCategoryIcon(null)).toBe('💻');
    });

    it('returns 🌐 for language categories', () => {
      expect(getCategoryIcon('Ngoại ngữ')).toBe('🌐');
      expect(getCategoryIcon('Tiếng Anh giao tiếp')).toBe('🌐');
    });

    it('returns 🎵 for music categories', () => {
      expect(getCategoryIcon('Âm nhạc')).toBe('🎵');
    });
  });

  describe('Themed Background Generation', () => {
    it('generates marketing theme with sky blue gradient and 📈 badge', () => {
      const theme = getCategoryThemedBackground('SEO và Marketing');
      expect(theme.badgeEmoji).toBe('📈');
      expect(theme.bgClass).toContain('from-[#0284c7]');
    });

    it('generates design theme with dark palette gradient and 🎨 badge', () => {
      const theme = getCategoryThemedBackground('Thiết kế UI Figma');
      expect(theme.badgeEmoji).toBe('🎨');
      expect(theme.bgClass).toContain('via-[#1e1b4b]');
    });

    it('generates IT theme with slate gradient and 💻 badge for coding/default', () => {
      const theme = getCategoryThemedBackground(null);
      expect(theme.badgeEmoji).toBe('💻');
      expect(theme.badgeLabel).toBe('Công nghệ thông tin');
    });
  });

  describe('Course Structure Formatting', () => {
    it('formats full structure: chapters, lessons and duration matching design', () => {
      // 3 chương • 12 bài giảng • 4 giờ 15 phút (15300 seconds)
      const formatted = formatCourseStructure(3, 12, 15300);
      expect(formatted).toBe('3 chương • 12 bài giảng • 4 giờ 15 phút');
    });

    it('formats correctly when only chapters and lessons exist', () => {
      const formatted = formatCourseStructure(5, 20);
      expect(formatted).toBe('5 chương • 20 bài giảng');
    });

    it('formats duration with hours only and minutes only', () => {
      expect(formatCourseStructure(2, 5, 7200)).toBe('2 chương • 5 bài giảng • 2 giờ');
      expect(formatCourseStructure(2, 5, 1800)).toBe('2 chương • 5 bài giảng • 30 phút');
    });

    it('handles short sub-minute durations cleanly', () => {
      expect(formatCourseStructure(1, 1, 45)).toBe('1 chương • 1 bài giảng • < 1 phút');
    });

    it('returns fallback string when no chapters, lessons or duration exist', () => {
      const formatted = formatCourseStructure(0, 0, 0);
      expect(formatted).toBe('Đang cập nhật nội dung bài giảng');
    });
  });

  describe('Price Formatting', () => {
    it('formats free course as "Miễn phí"', () => {
      expect(formatPrice(0)).toEqual({ text: 'Miễn phí', isFree: true });
      expect(formatPrice(-500)).toEqual({ text: 'Miễn phí', isFree: true });
      expect(formatPrice(undefined)).toEqual({ text: 'Miễn phí', isFree: true });
    });

    it('formats paid courses in VND currency format matching design ("X.XXX đ")', () => {
      const p4k = formatPrice(4000);
      expect(p4k.isFree).toBe(false);
      expect(p4k.text).toContain('4.000');
      expect(p4k.text).toContain('đ');

      const p3k = formatPrice(3000);
      expect(p3k.isFree).toBe(false);
      expect(p3k.text).toContain('3.000');
      expect(p3k.text).toContain('đ');
    });
  });

  describe('Grouped Action Buttons and Ellipsis Menu Matrix', () => {
    it('always provides "Chỉnh sửa" as direct button and "Xem thử", "Ngưng bán", "Xóa" in menu for published course with no students', () => {
      const actions = getAvailableCourseActions({
        status: CourseStatusEnum.PUBLISHED,
        studentsCount: 0,
      });

      expect(actions.directAction).toBe('Chỉnh sửa');
      expect(actions.menuActions.map((m) => m.label)).toEqual(['Xem thử', 'Ngưng bán', 'Xóa']);
      expect(actions.canDelete).toBe(true);
      expect(actions.menuActions.find((m) => m.label === 'Xóa')?.enabled).toBe(true);
      expect(actions.deleteDisabledReason).toBeUndefined();
    });

    it('always preserves "Xem thử", "Ngưng bán" (disabled), "Xóa" for draft courses', () => {
      const actions = getAvailableCourseActions({
        status: CourseStatusEnum.DRAFT,
        studentsCount: 0,
      });

      expect(actions.directAction).toBe('Chỉnh sửa');
      expect(actions.menuActions.map((m) => m.label)).toEqual(['Xem thử', 'Ngưng bán', 'Xóa']);
      expect(actions.menuActions.find((m) => m.label === 'Ngưng bán')?.enabled).toBe(false);
      expect(actions.canDelete).toBe(true);
    });

    it('prevents deletion and specifies reason when published course has enrolled students', () => {
      const actions = getAvailableCourseActions({
        status: CourseStatusEnum.PUBLISHED,
        studentsCount: 14,
      });

      expect(actions.directAction).toBe('Chỉnh sửa');
      expect(actions.menuActions.map((m) => m.label)).toEqual(['Xem thử', 'Ngưng bán', 'Xóa']);
      expect(actions.canDelete).toBe(false);
      expect(actions.menuActions.find((m) => m.label === 'Xóa')?.enabled).toBe(false);
      expect(actions.deleteDisabledReason).toContain('14 học viên đăng ký');
    });

    it('provides "Mở bán lại" in menu when course is ARCHIVED (Ngừng bán)', () => {
      const actions = getAvailableCourseActions({
        status: CourseStatusEnum.ARCHIVED,
        studentsCount: 0,
      });

      expect(actions.directAction).toBe('Chỉnh sửa');
      expect(actions.menuActions.map((m) => m.label)).toEqual(['Xem thử', 'Mở bán lại', 'Xóa']);
    });

    it('provides "Rút duyệt" in menu when course is PENDING_APPROVAL and blocks deletion', () => {
      const actions = getAvailableCourseActions({
        status: CourseStatusEnum.PENDING_APPROVAL,
        studentsCount: 0,
      });

      expect(actions.directAction).toBe('Chỉnh sửa');
      expect(actions.menuActions.map((m) => m.label)).toEqual(['Xem thử', 'Ngưng bán', 'Rút duyệt', 'Xóa']);
      expect(actions.canDelete).toBe(false);
      expect(actions.deleteDisabledReason).toContain('đang chờ duyệt');
    });
  });

  describe('Course Description HTML Sanitization and Snippet Formatting', () => {
    it('strips rich HTML tags cleanly without merging adjacent words', () => {
      const html = '<h2>Nhập môn Python</h2><p>Khóa học demo cấp độ cơ bản thuộc danh mục Công nghệ thông tin.</p>';
      expect(extractPlainTextFromHtml(html)).toBe(
        'Nhập môn Python Khóa học demo cấp độ cơ bản thuộc danh mục Công nghệ thông tin.',
      );
    });

    it('decodes common HTML entities and normalizes whitespace', () => {
      const html = '<p>HTML &amp; CSS &nbsp;&lt;hướng dẫn&gt; &#39;Mindly&#39; &quot;AI&quot;</p>';
      expect(extractPlainTextFromHtml(html)).toBe('HTML & CSS <hướng dẫn> \'Mindly\' "AI"');
    });

    it('returns empty string for undefined, null, or empty HTML', () => {
      expect(extractPlainTextFromHtml(undefined)).toBe('');
      expect(extractPlainTextFromHtml(null)).toBe('');
      expect(extractPlainTextFromHtml('')).toBe('');
      expect(extractPlainTextFromHtml('<p><br></p>')).toBe('');
      expect(extractPlainTextFromHtml('<p>&nbsp;</p>')).toBe('');
    });

    it('omits redundant leading course title when present in heading', () => {
      const title = 'Nhập môn Python';
      const html = '<h2>Nhập môn Python</h2><p>Khóa học demo cấp độ cơ bản thuộc danh mục Công nghệ thông tin, gồm 1 chương và 2 bài video:...</p>';
      expect(formatCourseDescription(html, title)).toBe(
        'Khóa học demo cấp độ cơ bản thuộc danh mục Công nghệ thông tin, gồm 1 chương và 2 bài video:...',
      );
    });

    it('omits redundant leading course title with punctuation separators', () => {
      const title = 'Xây dựng Design System với Figma';
      const html = '<h2>Xây dựng Design System với Figma</h2><p>Khóa học demo cấp độ nâng cao thuộc danh mục Thiết kế đồ họa, gồm 1 chương v...</p>';
      expect(formatCourseDescription(html, title)).toBe(
        'Khóa học demo cấp độ nâng cao thuộc danh mục Thiết kế đồ họa, gồm 1 chương v...',
      );
    });

    it('returns clean description as-is when it does not start with course title', () => {
      const title = 'Khóa học React';
      const html = '<p>Học xây dựng ứng dụng hiện đại với React 19 và Next.js 15.</p>';
      expect(formatCourseDescription(html, title)).toBe(
        'Học xây dựng ứng dụng hiện đại với React 19 và Next.js 15.',
      );
    });

    it('falls back to default placeholder when description is empty or only empty tags', () => {
      expect(formatCourseDescription(undefined, 'Khóa học')).toBe(
        'Chưa có tóm tắt nội dung bài giảng cho khóa học này.',
      );
      expect(formatCourseDescription('<p><br></p>', 'Khóa học')).toBe(
        'Chưa có tóm tắt nội dung bài giảng cho khóa học này.',
      );
    });

    it('retains title text if description contains only the title and no remaining body', () => {
      const title = 'Nhập môn Python';
      const html = '<h2>Nhập môn Python</h2>';
      expect(formatCourseDescription(html, title)).toBe('Nhập môn Python');
    });
  });
});

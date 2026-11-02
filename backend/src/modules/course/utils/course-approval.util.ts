import {
  CourseLevelEnum,
  CourseStatusEnum,
  LessonContentTypeEnum,
  type ICourse,
  type ICourseApprovalChecklist,
  type ICourseApprovalIssue,
  type ICourseApprovalRequirement,
  type ILesson,
  type ISection,
} from 'share-lib';

function isValidTitle(value: string | null | undefined, minimum = 1): boolean {
  const length = value?.trim().length ?? 0;
  return length >= minimum && length <= 200;
}

function isSavedMediaUrl(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Detect visible text in saved editor HTML; this is not an HTML sanitizer. */
function hasDescription(value: string | null | undefined): boolean {
  if (!value) return false;
  const text = value
    .replace(/<!--[^]*?-->/g, '')
    .replace(/<(script|style|template)\b[^>]*>[^]*?<\/\1\s*>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&#(x[\da-f]+|\d+);?/gi, (_, code: string) => {
      const point = code[0].toLowerCase() === 'x'
        ? Number.parseInt(code.slice(1), 16)
        : Number.parseInt(code, 10);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '';
    })
    .replace(/&(nbsp|ensp|emsp|thinsp|hairsp|ZeroWidthSpace|zwnj|zwj|lrm|rlm|NoBreak|Tab|NewLine);/gi, '')
    .replace(/[\s\u200b-\u200f\u2060\ufeff]/g, '');
  return text.length > 0;
}

function requirement(
  id: ICourseApprovalRequirement['id'],
  label: string,
  issues: ICourseApprovalIssue[],
): ICourseApprovalRequirement {
  return { id, label, complete: issues.length === 0, issues };
}

export function buildCourseApprovalChecklist(
  course: ICourse,
  categoryIsActive: boolean,
  sections: readonly ISection[],
  lessons: readonly ILesson[],
): ICourseApprovalChecklist {
  const classificationIssues: ICourseApprovalIssue[] = [];
  if (!categoryIsActive) {
    classificationIssues.push({
      message: 'Chọn một danh mục đang hoạt động cho khóa học.',
      target: { field: 'category' },
    });
  }
  if (!Object.values(CourseLevelEnum).includes(course.level)) {
    classificationIssues.push({
      message: 'Chọn trình độ phù hợp với khóa học.',
      target: { field: 'level' },
    });
  }

  const curriculumIssues: ICourseApprovalIssue[] = [];
  const activeSections = sections.filter((section) => !section.deletedAt)
    .toSorted((a, b) => a.order - b.order);
  const activeLessons = lessons.filter((lesson) => !lesson.deletedAt);
  if (activeSections.length === 0) {
    curriculumIssues.push({
      message: 'Thêm ít nhất một chương vào giáo trình.',
      target: { field: 'curriculum' },
    });
  }
  for (const [index, section] of activeSections.entries()) {
    const sectionLabel = `Chương ${index + 1}${section.title?.trim() ? ` “${section.title.trim()}”` : ''}`;
    const sectionTarget = { field: 'curriculum' as const, sectionId: section.id };
    if (!isValidTitle(section.title)) {
      curriculumIssues.push({
        message: `${sectionLabel}: tên chương phải có từ 1 đến 200 ký tự.`,
        target: sectionTarget,
      });
    }
    const sectionLessons = activeLessons.filter((lesson) => lesson.sectionId === section.id)
      .toSorted((a, b) => a.order - b.order);
    if (sectionLessons.length === 0) {
      curriculumIssues.push({
        message: `${sectionLabel}: cần ít nhất một bài học.`,
        target: sectionTarget,
      });
    }
    for (const [lessonIndex, lesson] of sectionLessons.entries()) {
      const target = { ...sectionTarget, lessonId: lesson.id };
      const lessonLabel = `${sectionLabel}, bài ${lessonIndex + 1}${lesson.title?.trim() ? ` “${lesson.title.trim()}”` : ''}`;
      if (!isValidTitle(lesson.title)) {
        curriculumIssues.push({
          message: `${lessonLabel}: tên bài học phải có từ 1 đến 200 ký tự.`,
          target,
        });
      }
      if (!lesson.content ||
        !Object.values(LessonContentTypeEnum).includes(lesson.content.type) ||
        !isSavedMediaUrl(lesson.content.url)) {
        curriculumIssues.push({
          message: `${lessonLabel}: cần nội dung video hoặc tài liệu đã lưu.`,
          target,
        });
      }
    }
  }

  const items = [
    requirement('title', 'Tên khóa học', isValidTitle(course.title, 3) ? [] : [{
      message: 'Nhập tên khóa học từ 3 đến 200 ký tự.',
      target: { field: 'title' },
    }]),
    requirement('description', 'Mô tả chi tiết', hasDescription(course.description) ? [] : [{
      message: 'Bổ sung nội dung mô tả chi tiết và lưu thay đổi.',
      target: { field: 'description' },
    }]),
    requirement('category-level', 'Danh mục và trình độ', classificationIssues),
    requirement('thumbnail', 'Ảnh thumbnail', isSavedMediaUrl(course.thumbnailUrl) ? [] : [{
      message: 'Tải lên và lưu ảnh thumbnail cho khóa học.',
      target: { field: 'thumbnail' },
    }]),
    requirement('trailer', 'Video trailer', isSavedMediaUrl(course.trailerUrl) ? [] : [{
      message: 'Tải lên và lưu video giới thiệu khóa học.',
      target: { field: 'trailer' },
    }]),
    requirement('curriculum', 'Chương và bài học hợp lệ', curriculumIssues),
  ];

  return {
    courseId: course.id,
    status: course.status,
    items,
    canSubmit: course.status === CourseStatusEnum.DRAFT && items.every((item) => item.complete),
  };
}

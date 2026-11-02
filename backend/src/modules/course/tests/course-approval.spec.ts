import { describe, expect, it } from 'vitest';
import {
  CourseLevelEnum, CourseStatusEnum, LessonContentTypeEnum,
  type ICourse, type ILesson, type ISection,
} from 'share-lib';
import { buildCourseApprovalChecklist } from '../utils/course-approval.util.js';

const date = '2026-10-31T00:00:00.000Z';
const course: ICourse = {
  id: 'course', title: 'Lập trình TypeScript', slug: 'lap-trinh-typescript',
  description: '<p>Nắm vững kiểu dữ liệu và xây dựng ứng dụng.</p>',
  categoryId: 'category', level: CourseLevelEnum.ALL_LEVELS,
  thumbnailUrl: 'https://media.example.com/thumbnail.webp',
  trailerUrl: 'https://media.example.com/trailer.mp4',
  price: 0, instructorId: 'instructor', status: CourseStatusEnum.DRAFT,
  createdAt: date, updatedAt: date,
};
const section: ISection = {
  id: 'section', courseId: course.id, title: 'Nhập môn', order: 0,
  createdAt: date, updatedAt: date,
};
const lesson: ILesson = {
  id: 'lesson', sectionId: section.id, title: 'Kiểu dữ liệu', order: 0,
  content: { type: LessonContentTypeEnum.VIDEO, url: 'https://media.example.com/lesson.mp4' },
  isPreview: false, createdAt: date, updatedAt: date,
};

function check(changes: Partial<ICourse> = {}, sections = [section], lessons = [lesson], categoryActive = true) {
  return buildCourseApprovalChecklist({ ...course, ...changes }, categoryActive, sections, lessons);
}

describe('Course approval conditions', () => {
  it('accepts all levels, free courses and saved content without duration/transcript', () => {
    const result = check();
    expect(result.canSubmit).toBe(true);
    expect(result.items).toHaveLength(6);
    expect(result.items.every((item) => item.complete)).toBe(true);
  });

  it.each(['', '  ', '<p></p>', '<p><br></p>', '<p>&nbsp; &#160; &#x200B;</p>',
    '<div>\u200B\n</div>', '<!-- description --><script>hidden()</script><style>p {}</style>'])
  ('rejects visually empty descriptions: %s', (description) => {
    const result = check({ description });
    expect(result.canSubmit).toBe(false);
    expect(result.items.find((item) => item.id === 'description')?.issues[0].target.field).toBe('description');
  });

  it.each(['   ', 'ab', 'a'.repeat(201)])('validates the trimmed course title', (title) => {
    expect(check({ title }).items.find((item) => item.id === 'title')?.complete).toBe(false);
  });

  it('returns separate classification targets for inactive category and invalid level', () => {
    const result = check({ level: 'invalid' as CourseLevelEnum }, [section], [lesson], false);
    expect(result.items.find((item) => item.id === 'category-level')?.issues.map((issue) => issue.target.field))
      .toEqual(['category', 'level']);
    expect(result.canSubmit).toBe(false);
  });

  it.each(['blob:http://localhost/local', 'data:image/png;base64,preview', '', 'not-a-url'])
  ('does not count a local or invalid media URL as a completed upload: %s', (url) => {
    const result = check({ thumbnailUrl: url, trailerUrl: url });
    expect(result.items.filter((item) => !item.complete).map((item) => item.id)).toEqual(['thumbnail', 'trailer']);
  });

  it('requires at least one non-deleted chapter', () => {
    expect(check({}, [], []).canSubmit).toBe(false);
    expect(check({}, [{ ...section, deletedAt: date }], [lesson]).canSubmit).toBe(false);
  });

  it('requires a lesson in every chapter, even when another chapter has valid lessons', () => {
    const second = { ...section, id: 'empty-section', title: 'Nâng cao', order: 1 };
    const result = check({}, [second, section]);
    expect(result.canSubmit).toBe(false);
    expect(result.items.at(-1)?.issues[0].target).toEqual({ field: 'curriculum', sectionId: second.id });
    expect(result.items.at(-1)?.issues[0].message).toContain('Chương 2');
  });

  it('does not count deleted lessons or lessons from another chapter', () => {
    expect(check({}, [section], [{ ...lesson, deletedAt: date }]).canSubmit).toBe(false);
    expect(check({}, [section], [{ ...lesson, sectionId: 'other' }]).canSubmit).toBe(false);
  });

  it('requires valid content on every lesson, not just one valid lesson in a chapter', () => {
    const incomplete = { ...lesson, id: 'incomplete', title: '', order: 1, content: null };
    const result = check({}, [section], [incomplete, lesson]);
    expect(result.canSubmit).toBe(false);
    expect(result.items.at(-1)?.issues).toHaveLength(2);
    expect(result.items.at(-1)?.issues[0].target).toEqual({
      field: 'curriculum', sectionId: section.id, lessonId: incomplete.id,
    });
  });

  it('accepts a document as a lesson, but not an attachment on a contentless lesson', () => {
    const document = { type: LessonContentTypeEnum.DOCUMENT, url: 'https://media.example.com/lesson.pdf' };
    expect(check({}, [section], [{ ...lesson, content: document }]).canSubmit).toBe(true);
    expect(check({}, [section], [{ ...lesson, content: null, materials: [{
      id: 'material', title: 'Ghi chú', url: document.url, fileName: 'notes.pdf',
    }] }]).canSubmit).toBe(false);
  });

  it('keeps completed conditions but disallows submitting a course already awaiting approval', () => {
    const result = check({ status: CourseStatusEnum.PENDING_APPROVAL });
    expect(result.items.every((item) => item.complete)).toBe(true);
    expect(result.canSubmit).toBe(false);
  });
});

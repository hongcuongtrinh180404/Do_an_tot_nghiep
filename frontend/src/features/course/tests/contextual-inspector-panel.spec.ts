// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LessonContentTypeEnum, type ILesson, type ISection } from 'share-lib';
import {
  ContextualInspectorPanel,
  type ContextSelection,
} from '../components/contextual-inspector-panel';

const { lessonQuery, sectionLessonsQuery, mutate } = vi.hoisted(() => ({
  lessonQuery: vi.fn(),
  sectionLessonsQuery: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock('../api/course.api', () => ({
  useLessonDetailQuery: lessonQuery,
  useSectionLessonsQuery: sectionLessonsQuery,
  useUpdateLessonMutation: () => ({ mutate, isPending: false }),
}));

vi.mock('@/components/ui/icon', () => ({
  Icon: ({ icon }: { icon: string }) => createElement('span', { 'data-icon': icon }),
}));

vi.mock('../components/upload-lesson-doc-dialog', () => ({
  UploadLessonDocDialog: ({ open }: { open: boolean }) =>
    createElement('div', { 'data-testid': 'upload-material-dialog', 'data-open': String(open) }),
}));

vi.mock('../components/delete-lesson-material-dialog', () => ({
  DeleteLessonMaterialDialog: ({ open, material }: { open: boolean; material: { id: string } | null }) =>
    createElement('div', {
      'data-testid': 'delete-material-dialog',
      'data-open': String(open),
      'data-material-id': material?.id,
    }),
}));

const dates = { createdAt: '2026-11-16T00:00:00Z', updatedAt: '2026-11-16T00:00:00Z' };
const section: ISection = {
  id: 'chapter-1',
  courseId: 'course-1',
  title: 'Chương đầu tiên',
  order: 0,
  ...dates,
};
const documentLesson: ILesson = {
  id: 'document-1',
  sectionId: section.id,
  title: 'Tài liệu của chương',
  order: 0,
  isPreview: false,
  content: {
    type: LessonContentTypeEnum.DOCUMENT,
    url: 'https://example.test/chapter-guide.pdf',
    fileName: 'chapter-guide.pdf',
    fileSize: 2048,
  },
  ...dates,
};
const videoLesson: ILesson = {
  id: 'video-1',
  sectionId: section.id,
  title: 'Bài giảng video',
  order: 1,
  isPreview: false,
  content: {
    type: LessonContentTypeEnum.VIDEO,
    url: 'https://example.test/lecture.mp4',
    duration: 360,
  },
  materials: [{
    id: 'material-1',
    title: 'Slide bài giảng',
    fileName: 'lecture-slides.pdf',
    url: 'https://example.test/lecture-slides.pdf',
    fileSize: 1024,
  }],
  ...dates,
};

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  lessonQuery.mockReturnValue({ data: documentLesson, isLoading: false, isError: false });
  sectionLessonsQuery.mockReturnValue({
    data: [documentLesson, videoLesson],
    isLoading: false,
    isError: false,
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function renderSelection(selection: ContextSelection, readOnly = false): void {
  act(() => {
    root.render(createElement(ContextualInspectorPanel, {
      selection,
      sections: [section],
      courseId: section.courseId,
      onEditChapter: vi.fn(),
      onAddLesson: vi.fn(),
      readOnly,
    }));
  });
}

function renderLesson(lesson: ILesson, readOnly = false): void {
  lessonQuery.mockReturnValue({ data: lesson, isLoading: false, isError: false });
  renderSelection({ type: 'lesson', lessonId: lesson.id, chapterId: section.id }, readOnly);
}

function findButton(label: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent?.trim() === label);
}

function expectDocumentOnly(): void {
  expect(container.querySelector('h3')?.textContent).toBe(documentLesson.title);
  expect(container.querySelector('a[title="Xem chi tiết tài liệu"]')?.getAttribute('href'))
    .toBe('/courses/course-1/lessons/document-1');
  expect(container.textContent).toContain('Hình thức truy cập');
  expect(container.textContent).not.toContain('Biên tập nội dung bài học');
  expect(container.textContent).not.toContain('Tài liệu riêng của bài');
  expect(container.textContent).not.toContain('Đính kèm tệp');
  expect(container.querySelector('[data-testid="upload-material-dialog"]')).toBeNull();
  expect(container.querySelector('[data-testid="delete-material-dialog"]')).toBeNull();
}

describe('ContextualInspectorPanel', () => {
  it('keeps the document preview and access mode without lesson editing or materials', () => {
    renderLesson({ ...documentLesson, materials: videoLesson.materials });

    expectDocumentOnly();
    expect(findButton('Học thử')).toBeDefined();
    expect(findButton('Có phí')).toBeDefined();
    expect(container.textContent).not.toContain('chapter-guide.pdf');
    expect(container.textContent).not.toContain('Slide bài giảng');
  });

  it('hides lesson-only controls even when the document has no filename or materials', () => {
    renderLesson({
      ...documentLesson,
      content: { type: LessonContentTypeEnum.DOCUMENT, url: documentLesson.content!.url },
    });

    expectDocumentOnly();
    expect(container.textContent).not.toContain('Không có tài liệu riêng');
  });

  it('still lets the instructor change document access', () => {
    renderLesson(documentLesson);

    act(() => findButton('Có phí')!.click());
    expect(mutate).not.toHaveBeenCalled();

    act(() => findButton('Học thử')!.click());
    expect(mutate).toHaveBeenCalledWith(
      { lessonId: documentLesson.id, payload: { isPreview: true } },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );

    renderLesson({ ...documentLesson, isPreview: true });
    act(() => findButton('Có phí')!.click());
    expect(mutate).toHaveBeenLastCalledWith(
      { lessonId: documentLesson.id, payload: { isPreview: false } },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('preserves video editing, duration, attached files and upload/delete actions', () => {
    renderLesson(videoLesson);

    expect(container.textContent).toContain('Video bài giảng');
    expect(container.textContent).toContain('06:00');
    expect(container.textContent).toContain('Tài liệu riêng của bài1 tệp');
    expect(container.textContent).toContain('Slide bài giảng');
    expect(container.querySelector('a[title="Biên tập Mindmap, Tóm tắt và câu hỏi của bài học"]')
      ?.getAttribute('href')).toBe('/courses/course-1/lessons/video-1?mode=edit');
    expect(container.querySelector('a[aria-label="Tải về tài liệu"]')?.getAttribute('href'))
      .toBe(videoLesson.materials![0].url);

    act(() => findButton('Đính kèm tệp')!.click());
    expect(container.querySelector('[data-testid="upload-material-dialog"]')
      ?.getAttribute('data-open')).toBe('true');

    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Xóa tài liệu"]')!.click());
    const deleteDialog = container.querySelector('[data-testid="delete-material-dialog"]');
    expect(deleteDialog?.getAttribute('data-open')).toBe('true');
    expect(deleteDialog?.getAttribute('data-material-id')).toBe('material-1');
  });

  it('preserves the video empty state and attachment action', () => {
    renderLesson({ ...videoLesson, materials: [] });

    expect(container.textContent).toContain('Biên tập nội dung bài học');
    expect(container.textContent).toContain('Không có tài liệu riêng cho bài học này.');
    expect(findButton('Đính kèm tệp')).toBeDefined();
  });

  it.each([documentLesson, videoLesson])('respects read-only mode for $id', (lesson) => {
    renderLesson(lesson, true);

    expect(container.textContent).toContain('Hình thức truy cập');
    expect(container.textContent).toContain('Có phí');
    expect(findButton('Học thử')).toBeUndefined();
    expect(findButton('Có phí')).toBeUndefined();
    expect(findButton('Đính kèm tệp')).toBeUndefined();
    expect(container.textContent).not.toContain('Biên tập nội dung bài học');
    expect(container.querySelector('button[aria-label="Xóa tài liệu"]')).toBeNull();
    if (lesson === documentLesson) expectDocumentOnly();
    else expect(container.textContent).toContain('Slide bài giảng');
  });

  it('hides video-only sections and dialogs when switching to a document', () => {
    renderLesson(videoLesson);
    act(() => findButton('Đính kèm tệp')!.click());
    expect(container.querySelector('[data-testid="upload-material-dialog"]')
      ?.getAttribute('data-open')).toBe('true');

    renderLesson(documentLesson);
    expectDocumentOnly();

    renderLesson(videoLesson);
    expect(container.textContent).toContain('Biên tập nội dung bài học');
    expect(container.textContent).toContain('Tài liệu riêng của bài');
  });

  it('keeps documents and video attachments in the chapter overview', () => {
    renderSelection({ type: 'chapter', chapterId: section.id });

    expect(container.textContent).toContain('Tài liệu chung của chương2 tệp');
    expect(container.textContent).toContain('chapter-guide.pdf');
    expect(container.textContent).toContain('lecture-slides.pdf');
    expect(container.querySelector(`a[href="${documentLesson.content!.url}"]`)).not.toBeNull();
    expect(container.querySelector(`a[href="${videoLesson.materials![0].url}"]`)).not.toBeNull();
  });
});

// @vitest-environment jsdom

import React, { act, Profiler, StrictMode, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ILessonMindmapData } from 'share-lib';
import { LessonTabsContainer } from '../components/player/lesson-tabs-container';
import { transcriptAnalysisKeys } from '../api/transcript-analysis.api';

const { get, put, canvasRender } = vi.hoisted(() => ({
  get: vi.fn(), put: vi.fn(), canvasRender: vi.fn(),
}));
vi.mock('@/lib/api-client', () => ({ apiClient: { get, put, post: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/components/ui/icon', () => ({ Icon: () => <span aria-hidden /> }));
vi.mock('../components/player/tabs/lesson-summary-tab', () => ({
  LessonSummaryTab: () => <p>Summary fixture</p>,
}));
vi.mock('../components/player/tabs/lesson-quiz-tab', () => ({
  LessonQuizTab: () => <p>Quiz fixture</p>,
}));
vi.mock('../components/player/tabs/mindmap/lesson-mindmap-canvas-view', () => ({
  LessonMindmapCanvasView: function CanvasFixture() {
    canvasRender();
    const [zoom, setZoom] = useState(1);
    return <button onClick={() => setZoom(zoom + 1)}>Canvas zoom {zoom}</button>;
  },
}));

const data: ILessonMindmapData = {
  root: {
    id: 'root', title: 'Mindmap root', timestamp: 0,
    children: [{
      id: 'branch', title: 'Branch', timestamp: 20,
      children: [{ id: 'leaf', title: 'Leaf', timestamp: 40 }],
    }],
  },
};
const doc = (mindmap = data) => ({ id: 'mindmap', lessonId: 'lesson', mindmap });
const onSeek = vi.fn();
let client: QueryClient;
let root: Root;
let host: HTMLDivElement;
let commits: string[];

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(transcriptAnalysisKeys.mindmap('lesson'), doc());
  get.mockImplementation(async (url: string) => ({
    data: { data: url.endsWith('/analysis/mindmap') ? doc() : [] },
  }));
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  commits = [];
});

afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  host.remove();
  vi.unstubAllGlobals();
});

async function render(props: Partial<React.ComponentProps<typeof LessonTabsContainer>> = {}) {
  await act(async () => root.render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <Profiler id="lesson-tabs" onRender={() => commits.push(host.textContent ?? '')}>
          <LessonTabsContainer courseId="course" lessonId="lesson" duration={120} onSeek={onSeek} {...props} />
        </Profiler>
      </QueryClientProvider>
    </StrictMode>,
  ));
}

async function click(label: string) {
  const button = [...host.querySelectorAll('button')].find((node) => node.textContent?.trim() === label);
  expect(button, label).toBeDefined();
  await act(async () => button!.click());
}

async function clickSelector(selector: string) {
  const button = host.querySelector<HTMLButtonElement>(selector);
  expect(button, selector).not.toBeNull();
  await act(async () => button!.click());
}

async function editTitle(value: string) {
  await clickSelector('button[title="Chỉnh sửa nhánh"]');
  const input = host.querySelector<HTMLInputElement>('input[placeholder="Nhập tiêu đề nhánh..."]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

// React Query schedules observer notifications in the next task.
async function flushQuery(action: () => void) {
  await act(async () => {
    action();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('Lesson mindmap tab transitions', () => {
  it('renders cached mindmap data on its first commit without an empty-state flash', async () => {
    await render();
    commits.length = 0;
    await click('Sơ đồ tư duy (Mindmap)');
    expect(commits[0]).toContain('Mindmap root');
    expect(commits.some((text) => text.includes('Chưa có sơ đồ tư duy'))).toBe(false);
    expect(get.mock.calls.some(([url]) => url.endsWith('/analysis/mindmap'))).toBe(false);
  });

  it('reserves the previous panel height during a cold load and goes directly to the tree', async () => {
    client.removeQueries({ queryKey: transcriptAnalysisKeys.mindmap('lesson') });
    let resolve!: (value: unknown) => void;
    get.mockReturnValue(new Promise((done) => { resolve = done; }));
    await render();
    const panel = host.querySelector('.min-h-\\[360px\\].overflow-y-auto') as HTMLDivElement;
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({ height: 720 } as DOMRect);
    await click('Sơ đồ tư duy (Mindmap)');
    expect(panel.style.minHeight).toBe('720px');
    expect(host.textContent).toContain('Đang tải sơ đồ tư duy');
    await flushQuery(() => resolve({ data: { data: doc() } }));
    expect(host.textContent).toContain('Mindmap root');
    expect(panel.style.minHeight).toBe('');
    expect(commits.some((text) => text.includes('Chưa có sơ đồ tư duy'))).toBe(false);
  });

  it('preserves collapsed branches, canvas state and DOM when returning from other tabs', async () => {
    await render();
    await click('Sơ đồ tư duy (Mindmap)');
    await clickSelector('button[aria-label="Thu gọn"]');
    expect(host.textContent).not.toContain('Leaf');
    const collapsedRoot = host.querySelector('button[aria-label="Mở rộng"]');
    await click('Trắc nghiệm (Quiz)');
    await click('Sơ đồ tư duy (Mindmap)');
    expect(host.querySelector('button[aria-label="Mở rộng"]')).toBe(collapsedRoot);
    expect(host.textContent).not.toContain('Leaf');
    await click('Sơ đồ Mindmap');
    await click('Canvas zoom 1');
    const canvas = [...host.querySelectorAll('button')].find((button) => button.textContent === 'Canvas zoom 2');
    await click('Tóm tắt (Summary)');
    canvasRender.mockClear();
    await render({ currentTime: 25 });
    await render({ currentTime: 26 });
    expect(canvasRender).not.toHaveBeenCalled();
    await click('Sơ đồ tư duy (Mindmap)');
    expect([...host.querySelectorAll('button')].find((button) => button.textContent === 'Canvas zoom 2')).toBe(canvas);
  });

  it('resets retained mindmap state when the lesson changes', async () => {
    await render();
    await click('Sơ đồ tư duy (Mindmap)');
    await click('Sơ đồ Mindmap');
    const next = { root: { id: 'other-root', title: 'Other lesson', timestamp: 0 } };
    client.setQueryData(transcriptAnalysisKeys.mindmap('other'), doc(next));
    await render({ lessonId: 'other' });
    expect(host.textContent).toContain('Other lesson');
    expect(host.textContent).not.toContain('Mindmap root');
    expect(host.textContent).not.toContain('Canvas zoom');
  });

  it('keeps time-based highlights accurate at the strict five-second boundaries', async () => {
    await render({ currentTime: 4.9 });
    await click('Sơ đồ tư duy (Mindmap)');
    const rootCard = () => host.querySelector('button[aria-label="Thu gọn"]')!.closest('.group')!;
    expect(rootCard().classList.contains('ring-2')).toBe(true);
    await render({ currentTime: 5 });
    expect(rootCard().classList.contains('ring-2')).toBe(false);
    await clickSelector('button[title="Tua video tới 00:40"]');
    expect(onSeek).toHaveBeenCalledWith(40);
  });

  it('keeps optimistic edits visible until the server snapshot arrives', async () => {
    let resolve!: (value: unknown) => void;
    put.mockReturnValue(new Promise((done) => { resolve = done; }));
    await render({ isInstructor: true });
    await click('Sơ đồ tư duy (Mindmap)');
    await editTitle('Edited root');
    await clickSelector('button[title="Lưu thay đổi (Enter)"]');
    expect(host.textContent).toContain('Edited root');
    await click('Trắc nghiệm (Quiz)');
    await click('Sơ đồ tư duy (Mindmap)');
    expect(host.textContent).toContain('Edited root');
    const updated = { ...data, root: { ...data.root, title: 'Edited root' } };
    get.mockResolvedValue({ data: { data: doc(updated) } });
    await flushQuery(() => resolve({ data: { data: doc(updated) } }));
    expect(host.textContent).toContain('Edited root');
  });

  it('rolls back a failed optimistic save to the query data', async () => {
    let reject!: (error: Error) => void;
    put.mockReturnValue(new Promise((_, fail) => { reject = fail; }));
    await render({ isInstructor: true });
    await click('Sơ đồ tư duy (Mindmap)');
    await editTitle('Failed edit');
    await clickSelector('button[title="Lưu thay đổi (Enter)"]');
    expect(host.textContent).toContain('Failed edit');
    await flushQuery(() => reject(new Error('Save failed')));
    expect(host.textContent).toContain('Mindmap root');
    expect(host.textContent).not.toContain('Failed edit');
  });

  it('cancels an added branch without saving and accepts new server data', async () => {
    await render({ isInstructor: true });
    await click('Sơ đồ tư duy (Mindmap)');
    await clickSelector('button[title="Thêm nhánh con"]');
    expect(host.querySelector('input[placeholder="Nhập tiêu đề nhánh..."]')).not.toBeNull();
    await clickSelector('button[title="Hủy bỏ (Escape)"]');
    expect(host.textContent).not.toContain('Nhánh mới');
    expect(put).not.toHaveBeenCalled();
    await flushQuery(() => client.setQueryData(transcriptAnalysisKeys.mindmap('lesson'),
      doc({ root: { id: 'generated', title: 'Regenerated mindmap', timestamp: 0 } })));
    expect(host.textContent).toContain('Regenerated mindmap');
    expect(host.textContent).not.toContain('Mindmap root');
  });
});

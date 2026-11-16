// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CourseLevelEnum, CourseStatusEnum } from 'share-lib';
import type { IPublicCourseDetailResponse } from '../api/enrollment.api';
import { CourseInfoTab } from '../components/public-detail/course-info-tab';
import {
  CourseDetailTabs,
  type CourseDetailTabId,
} from '../components/public-detail/course-detail-tabs';

vi.mock('@/components/ui/icon', () => ({
  Icon: ({ icon, className }: { icon: string; className?: string }) =>
    createElement('span', { 'data-icon': icon, className }),
}));

const emptyMessage = 'Chưa có thông tin mô tả cho môn học này.';
const course: IPublicCourseDetailResponse = {
  id: 'course-info-test',
  title: 'Lập trình cơ bản',
  slug: 'lap-trinh-co-ban',
  price: 0,
  instructorId: 'instructor-test',
  status: CourseStatusEnum.PUBLISHED,
  level: CourseLevelEnum.BEGINNER,
  createdAt: '2026-11-15T00:00:00Z',
  updatedAt: '2026-11-15T00:00:00Z',
  sections: [],
};

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function renderDescription(description?: string | null): void {
  act(() => {
    root.render(createElement(CourseInfoTab, { course: { ...course, description } }));
  });
}

describe('CourseInfoTab', () => {
  it('renders rich-text HTML with typography and matching tab semantics', () => {
    renderDescription(
      '<h2>Giới thiệu</h2><h3>Mục tiêu</h3><p>Học <strong>kiến thức nền tảng</strong> ' +
      'và <em>thực hành</em>.</p><ul><li>Biến và kiểu dữ liệu</li></ul>' +
      '<ol><li>Làm bài tập</li></ol><a href="https://example.com">Tài liệu</a>' +
      '<code>const value = 1;</code>',
    );

    const panel = container.querySelector('[role="tabpanel"]')!;
    const prose = panel.querySelector('.prose')!;
    expect(panel.id).toBe('tabpanel-info');
    expect(panel.getAttribute('aria-labelledby')).toBe('tab-info');
    expect(prose.querySelector('h2')?.textContent).toBe('Giới thiệu');
    expect(prose.querySelector('h3')?.textContent).toBe('Mục tiêu');
    expect(prose.querySelector('strong')?.textContent).toBe('kiến thức nền tảng');
    expect(prose.querySelector('em')?.textContent).toBe('thực hành');
    expect(prose.querySelector('ul li')?.textContent).toBe('Biến và kiểu dữ liệu');
    expect(prose.querySelector('ol li')?.textContent).toBe('Làm bài tập');
    expect(prose.querySelector('a')?.getAttribute('href')).toBe('https://example.com');
    expect(prose.querySelector('code')?.textContent).toBe('const value = 1;');
    expect(panel.textContent).not.toContain(emptyMessage);
  });

  it.each([
    undefined,
    null,
    '',
    ' \n\t ',
    '<p></p>',
    '<p><br></p>',
    '<p>   </p>',
    '<p>&nbsp;</p>',
    '<p>&#160;&#xA0;\u00a0</p>',
    '<div><p></p></div><ul><li><p><br></p></li></ul>',
    '<!-- No description -->',
    '<script>alert("unsafe")</script>',
  ])('shows the empty state for %j', (description) => {
    renderDescription(description);

    expect(container.textContent).toContain(emptyMessage);
    expect(container.querySelector('.prose')).toBeNull();
  });

  it('removes scripts, event handlers and javascript URLs while preserving safe content', () => {
    renderDescription(
      '<h2>Thông tin an toàn</h2><script>alert("unsafe")</script>' +
      '<p onmouseover="alert(1)">Nội dung thật</p>' +
      '<img src="invalid-url" onerror="alert(2)">' +
      '<a href="javascript:alert(3)">Liên kết</a>',
    );

    const prose = container.querySelector('.prose')!;
    expect(prose.querySelector('script')).toBeNull();
    expect(prose.querySelector('[onmouseover], [onerror]')).toBeNull();
    expect(prose.querySelector('a')?.hasAttribute('href')).toBe(false);
    expect(prose.textContent).toContain('Nội dung thật');
    expect(prose.innerHTML).not.toContain('alert(');
  });

  it('renders plain text and updates when the course description changes', () => {
    renderDescription('Mô tả môn học hiện có.');
    expect(container.querySelector('.prose')?.textContent).toBe('Mô tả môn học hiện có.');

    renderDescription('<p><strong>Nội dung mới</strong></p>');
    expect(container.querySelector('.prose strong')?.textContent).toBe('Nội dung mới');
    expect(container.textContent).not.toContain('Mô tả môn học hiện có.');

    renderDescription(null);
    expect(container.textContent).toContain(emptyMessage);
  });
});

describe('CourseDetailTabs', () => {
  function renderTabs(activeTab: CourseDetailTabId, onSelectTab = vi.fn()) {
    act(() => {
      root.render(createElement(CourseDetailTabs, { activeTab, onSelectTab, reviewCount: 3 }));
    });
    return onSelectTab;
  }

  it('places course information first without changing the supplied curriculum selection', () => {
    renderTabs('curriculum');

    const tabs = Array.from(container.querySelectorAll('[role="tab"]'));
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Thông tin môn học',
      'Nội dung',
      'Mindmap tổng quan',
      'Đánh giá (3)',
      'Giảng viên',
    ]);
    expect(tabs[0].querySelector('[data-icon="lucide:info"]')).not.toBeNull();
    expect(tabs[0].getAttribute('aria-selected')).toBe('false');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(tabs[0].getAttribute('aria-controls')).toBe('tabpanel-info');
  });

  it('selects course information and uses the existing active color and underline', () => {
    const onSelectTab = renderTabs('curriculum');
    const previousActive = container.querySelector('#tab-curriculum')!;
    const activeClassName = previousActive.className;
    const underlineClassName = previousActive.querySelector('[aria-hidden="true"]')!.className;

    act(() => {
      container.querySelector<HTMLButtonElement>('#tab-info')!.click();
    });
    expect(onSelectTab).toHaveBeenCalledExactlyOnceWith('info');

    renderTabs('info', onSelectTab);
    const infoTab = container.querySelector('#tab-info')!;
    expect(infoTab.getAttribute('aria-selected')).toBe('true');
    expect(infoTab.className).toBe(activeClassName);
    expect(infoTab.querySelector('[aria-hidden="true"]')?.className).toBe(underlineClassName);
    expect(container.querySelector('#tab-curriculum')?.getAttribute('aria-selected')).toBe('false');
  });
});

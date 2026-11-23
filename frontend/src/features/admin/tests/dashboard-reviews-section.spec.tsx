// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardReviewsSection } from '../dashboard/components/dashboard-reviews-section';
import type { IDashboardCoursePerformance } from '../dashboard/types';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/components/ui/icon', () => ({
  Icon: () => React.createElement('span', { 'aria-hidden': true }),
}));

function makeCourse(index: number): IDashboardCoursePerformance {
  return {
    id: `course-${index}`,
    title: `Khóa học ${index}`,
    instructor: `Giảng viên ${index}`,
    category: 'Lập trình',
    price: 100000,
    isFree: false,
    salesCount: 1,
    revenue: 100000,
    newEnrollments: 1,
    totalOwned: 1,
    startedLearners: 1,
    completedLearners: 1,
    completionRate: 100,
    rating: 1 + index * 0.3,
    reviewCount: index,
  };
}

const courses = Array.from({ length: 12 }, (_, index) => makeCourse(index + 1));

describe('DashboardReviewsSection ranking limit', () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    push.mockReset();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  async function render(items = courses, isLoading = false) {
    await act(async () => {
      root.render(
        <DashboardReviewsSection
          globalPeriod="this_month"
          courses={items}
          isLoading={isLoading}
        />,
      );
    });
  }

  function titles(tableIndex: number) {
    return [...host.querySelectorAll('tbody')[tableIndex].querySelectorAll('p[title]')]
      .map((node) => node.getAttribute('title'));
  }

  async function openSelect() {
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[role="combobox"]')!.click();
    });
    return [...document.querySelectorAll<HTMLElement>('[role="option"]')];
  }

  async function selectLimit(limit: 5 | 10) {
    const options = await openSelect();
    const option = options.find((node) => node.textContent?.trim() === `Top ${limit}`);
    expect(option).toBeDefined();
    await act(async () => option!.click());
  }

  it('defaults to Top 5 with exactly one dropdown and only Top 5 / Top 10 options', async () => {
    await render();

    expect(host.querySelectorAll('[role="combobox"]')).toHaveLength(1);
    expect(host.querySelector('[role="combobox"]')?.getAttribute('aria-label'))
      .toBe('Số khóa học xếp hạng');
    expect(host.querySelector('[role="combobox"]')?.textContent).toContain('Top 5');
    expect(titles(0)).toEqual(courses.slice(-5).reverse().map((course) => course.title));
    expect(titles(1)).toEqual(courses.slice(0, 5).map((course) => course.title));
    expect(host.textContent).not.toContain('Thời gian:');
    expect(host.textContent).not.toContain('Danh mục:');
    expect(host.textContent).not.toContain('Khôi phục mặc định');

    const options = await openSelect();
    expect(options.map((node) => node.textContent?.trim())).toEqual(['Top 5', 'Top 10']);
  });

  it('updates both sorted tables and their titles when switching Top 5 → Top 10 → Top 5', async () => {
    await render();
    await selectLimit(10);

    expect(titles(0)).toEqual(courses.slice(-10).reverse().map((course) => course.title));
    expect(titles(1)).toEqual(courses.slice(0, 10).map((course) => course.title));
    expect(host.textContent).toContain('Top 10 Khóa học được đánh giá cao nhất');
    expect(host.textContent).toContain('Top 10 Khóa học có đánh giá thấp nhất');

    await selectLimit(5);
    expect(titles(0)).toHaveLength(5);
    expect(titles(1)).toHaveLength(5);
    expect(host.textContent).toContain('Top 5 Khóa học được đánh giá cao nhất');
    expect(host.textContent).toContain('Top 5 Khóa học có đánh giá thấp nhất');
    expect(courses.map((course) => course.id))
      .toEqual(Array.from({ length: 12 }, (_, index) => `course-${index + 1}`));
  });

  it('excludes courses without valid reviews or a positive rating in both limits', async () => {
    await render([
      ...courses,
      { ...makeCourse(13), title: 'Chưa có đánh giá', reviewCount: 0, rating: 5 },
      { ...makeCourse(14), title: 'Chưa có điểm đánh giá', rating: 0 },
    ]);

    expect(host.textContent).not.toContain('Chưa có đánh giá');
    expect(host.textContent).not.toContain('Chưa có điểm đánh giá');
    await selectLimit(10);
    expect(host.textContent).not.toContain('Chưa có đánh giá');
    expect(host.textContent).not.toContain('Chưa có điểm đánh giá');
    expect(titles(0)).toHaveLength(10);
    expect(titles(1)).toHaveLength(10);
  });

  it('shows only available courses when fewer than the selected limit exist', async () => {
    await render(courses.slice(0, 3));
    await selectLimit(10);

    expect(titles(0)).toHaveLength(3);
    expect(titles(1)).toHaveLength(3);
  });

  it('preserves the selected limit through loading and empty data', async () => {
    await render();
    await selectLimit(10);
    await render([], true);

    expect(host.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(host.textContent?.match(/Đang tải xếp hạng đánh giá/g)).toHaveLength(2);

    await render([]);
    expect(host.textContent?.match(/Không có khóa học nào đạt ngưỡng/g)).toHaveLength(2);
    expect(host.querySelector('[role="combobox"]')?.textContent).toContain('Top 10');

    await render(courses);
    expect(titles(0)).toHaveLength(10);
    expect(titles(1)).toHaveLength(10);
  });

  it('keeps the inspect action and encodes the course ID in the review search URL', async () => {
    const course = { ...makeCourse(1), id: 'course / kiểm thử?' };
    await render([course]);
    const inspectButton = [...host.querySelectorAll('button')]
      .find((button) => button.textContent?.trim() === 'Kiểm tra');

    expect(inspectButton).toBeDefined();
    await act(async () => inspectButton!.click());
    expect(push).toHaveBeenCalledExactlyOnceWith(
      `/admin/reviews?search=${encodeURIComponent(course.id)}`,
    );
  });
});

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CourseLevelEnum, CourseStatusEnum, type ICourse } from 'share-lib';
import { CourseDetailHeader } from '../components/public-detail/course-detail-header';
import {
  fetchInstructorPublicCourses,
  fetchPublicCourses,
  mapCourseToPublicCard,
} from '../services/public-courses.service';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api-client', () => ({ apiClient: { get } }));
vi.mock('@/components/ui/icon', () => ({ Icon: () => <span /> }));

const course: ICourse = {
  id: '77b9cd9815111ed2df8429c2', title: 'HTML & CSS từ đầu', slug: 'html-css',
  price: 0, instructorId: 'teacher', status: CourseStatusEnum.PUBLISHED,
  level: CourseLevelEnum.BEGINNER, createdAt: '2026-11-23', updatedAt: '2026-11-23',
  ratingAvg: 0, reviewCount: 0,
};

function response(items: ICourse[], page = 1, total = items.length, totalPages = 1) {
  return { data: { data: { items, total, page, limit: 100, totalPages } } };
}

beforeEach(() => { get.mockReset(); });

describe('database-backed public course counts', () => {
  it.each([0, 1, 42, 12000])('renders the API count %s in the shared detail header and card mapping', (count) => {
    const data = { ...course, studentsCount: count };
    const html = renderToStaticMarkup(
      <CourseDetailHeader course={{ ...data, sections: [] }} totalLessonsCount={0} totalDurationFormatted="Đang cập nhật" />,
    );
    expect(html).toContain(`${count.toLocaleString('vi-VN')} học viên`);
    expect(html).not.toContain('15.409 học viên');
    expect(mapCourseToPublicCard(data).studentCount).toBe(count);
    if (count < 5) expect(html).not.toContain('Best Seller');
  });

  it('preserves API values and passes search filters to the real endpoint', async () => {
    get.mockResolvedValue(response([{ ...course, studentsCount: 1 }]));
    const result = await fetchPublicCourses({
      q: ' HTML ', categories: ['frontend'], sort: 'popular', limit: 12,
    });
    expect(get).toHaveBeenCalledExactlyOnceWith('/courses', {
      params: { q: 'HTML', category: 'frontend', sort: 'popular', page: 1, limit: 12 },
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ id: course.id, studentCount: 1, rating: 0, reviewCount: 0 });
  });

  it('keeps a genuinely empty database response empty', async () => {
    get.mockResolvedValue(response([]));
    expect(await fetchPublicCourses()).toMatchObject({ items: [], total: 0 });
  });

  it('propagates API failure instead of substituting frontend mock courses', async () => {
    const error = new Error('Database unavailable');
    get.mockRejectedValue(error);
    await expect(fetchPublicCourses()).rejects.toBe(error);
  });

  it.each([undefined, {}, { items: null }])('rejects malformed API data instead of returning mock courses', async (data) => {
    get.mockResolvedValue({ data: { data } });
    await expect(fetchPublicCourses()).rejects.toThrow('Dữ liệu danh sách khóa học không hợp lệ');
  });

  it('loads all instructor pages so enrollment totals include more than 12 or 100 courses', async () => {
    const first = Array.from({ length: 100 }, (_, index) => ({
      ...course, id: `course-${index}`, studentsCount: index === 0 ? 2 : 0,
    }));
    get.mockResolvedValueOnce(response(first, 1, 101, 2));
    get.mockResolvedValueOnce(response([{ ...course, id: 'last-course', studentsCount: 3 }], 2, 101, 2));

    const result = await fetchInstructorPublicCourses('teacher');
    expect(get).toHaveBeenNthCalledWith(2, '/courses', {
      params: { page: 2, limit: 100, sort: 'newest', instructorId: 'teacher' },
    });
    expect(result.items).toHaveLength(101);
    expect(result.items.reduce((sum, item) => sum + item.studentCount, 0)).toBe(5);
  });

  it('does not expose partial instructor totals if a later API page fails', async () => {
    get.mockResolvedValueOnce(response([{ ...course, studentsCount: 1 }], 1, 101, 2));
    get.mockRejectedValueOnce(new Error('Page unavailable'));
    await expect(fetchInstructorPublicCourses('teacher')).rejects.toThrow('Page unavailable');
  });
});

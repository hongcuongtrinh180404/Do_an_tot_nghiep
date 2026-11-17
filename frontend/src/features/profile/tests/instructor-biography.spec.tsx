import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CourseInstructorTab } from '@/features/course/components/public-detail/course-instructor-tab';

vi.mock('@/features/course/api/public-courses.api', () => ({
  useInstructorPublicCoursesQuery: () => ({ data: { items: [], total: 0 }, isLoading: false }),
}));

describe('instructor profile biography in course details', () => {
  const instructor = { id: 'teacher-1', fullName: 'Nguyễn Minh', email: 'private@example.test', username: 'nguyenminh' };

  it('renders the actual profile bio and profile link, not canned biography/job titles', () => {
    const html = renderToStaticMarkup(<CourseInstructorTab instructor={{ ...instructor, bio: 'Giảng viên React.\nHơn 5 năm giảng dạy.' }} />);
    expect(html).toContain('Giảng viên React.\nHơn 5 năm giảng dạy.');
    expect(html).toContain('whitespace-pre-wrap');
    expect(html).toContain('/profile/nguyenminh');
    expect(html).not.toContain('Với hơn 8 năm kinh nghiệm');
    expect(html).not.toContain('Senior Technical Architect');
    expect(html).not.toContain(instructor.email);
  });

  it('uses an honest empty state and safely escapes user text', () => {
    const empty = renderToStaticMarkup(<CourseInstructorTab instructor={{ ...instructor, bio: '' }} />);
    expect(empty).toContain('Giảng viên chưa cập nhật phần giới thiệu.');
    const unsafe = renderToStaticMarkup(<CourseInstructorTab instructor={{ ...instructor, bio: '<script>alert(1)</script>' }} />);
    expect(unsafe).toContain('&lt;script&gt;');
    expect(unsafe).not.toContain('<script>alert(1)</script>');
  });
});

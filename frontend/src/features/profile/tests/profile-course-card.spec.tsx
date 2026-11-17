import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LearningStatusEnum, type IPublicProfileCourse } from 'share-lib';
import { ProfileCourseCard } from '../components/profile-course-card';

const course: IPublicProfileCourse = {
  id: 'course-1', title: 'Lập trình web', slug: 'lap-trinh-web', thumbnailUrl: null,
  instructorName: 'Nguyễn Minh', instructorUsername: 'nguyenminh',
  progress: { percent: 25, status: LearningStatusEnum.IN_PROGRESS },
};

describe('read-only profile course cards', () => {
  it('shows the supplied profile owner percentage, without enrollment/playback controls', () => {
    const html = renderToStaticMarkup(<ProfileCourseCard course={course} />);
    expect(html).toContain('aria-valuenow="25"');
    expect(html).toContain('25%');
    expect(html).toContain('/courses/lap-trinh-web');
    expect(html).toContain('/profile/nguyenminh');
    expect(html).not.toContain('/lessons/');
    expect(html).not.toContain('Học tiếp');
  });

  it.each([0, 100])('renders a real %s percent value', (percent) => {
    const html = renderToStaticMarkup(<ProfileCourseCard course={{ ...course, progress: { ...course.progress!, percent } }} />);
    expect(html).toContain(`aria-valuenow="${percent}"`);
  });

  it('does not invent a percentage for missing duration data', () => {
    const html = renderToStaticMarkup(<ProfileCourseCard course={{ ...course, progress: { ...course.progress!, percent: null } }} />);
    expect(html).toContain('Chưa xác định tiến độ');
    expect(html).not.toContain('role="progressbar"');
  });

  it('does not show learning progress on teaching cards', () => {
    const html = renderToStaticMarkup(<ProfileCourseCard course={{ ...course, progress: null }} />);
    expect(html).not.toContain('Đã hoàn thành');
    expect(html).not.toContain('progressbar');
  });
});

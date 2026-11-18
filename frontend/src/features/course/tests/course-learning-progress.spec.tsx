import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CourseLevelEnum, CourseStatusEnum, LearningStatusEnum, type ICourseLearningProgress } from 'share-lib';
import { LearningProgressSummary } from '../components/learning-progress-summary';
import { CoursePurchaseCard } from '../components/public-detail/course-purchase-card';
import { CourseCard } from '../components/public-discovery/course-card';
import type { IPublicCourseDetailResponse } from '../api/enrollment.api';
import type { IPublicCourseCard } from '../components/public-discovery/mock-discovery-data';

vi.mock('@/components/ui/icon', () => ({
  Icon: () => <span />,
}));

vi.mock('../hooks/use-user-course-ownership', () => ({
  useUserCourseOwnership: () => ({ isCourseOwned: () => true, isCheckingOwnership: false }),
}));

const progress: ICourseLearningProgress = {
  courseId: 'course', revision: 1, watchedMs: 5_000_000, totalDurationMs: null,
  completedLessons: 3, totalLessons: 8, progressPercent: 37.5, status: LearningStatusEnum.IN_PROGRESS,
  lastLessonId: 'lesson', lastPositionSeconds: 5, updatedAt: null,
};

const course: IPublicCourseDetailResponse = {
  id: 'course', title: 'Khóa học có video và tài liệu', slug: 'khoa-hoc', price: 0,
  instructorId: 'teacher', status: CourseStatusEnum.PUBLISHED, level: CourseLevelEnum.BEGINNER,
  createdAt: '2026-11-17', updatedAt: '2026-11-17', sections: [],
};

const card: IPublicCourseCard = {
  ...course, instructorName: 'Giảng viên', instructorTitle: '', instructorAvatar: '',
  rating: 0, reviewCount: 0, studentCount: 0, durationFormatted: '', lessonsCount: 10,
  categorySlug: '', categoryName: '', aiFeatures: { hasMindmap: false, hasInVideoQuiz: true, hasTranscript: false },
};

describe('course progress by completed video lessons', () => {
  it('renders server-supplied counts independently of watch time or missing duration', () => {
    const html = renderToStaticMarkup(<LearningProgressSummary progress={progress} />);
    expect(html).toContain('3/8 bài học hoàn thành');
    expect(html).toContain('37,50%');
    expect(html).toContain('aria-valuenow="37.5"');
    expect(html).not.toContain('Đã xem');
    expect(html).not.toContain('Thời lượng video chưa đầy đủ');
  });

  it('shows live progress on the purchase card rather than hardcoded 0 / all lessons', () => {
    const html = renderToStaticMarkup(<CoursePurchaseCard
      course={course} isEnrolled isLoggedIn isInstructorOwner={false} isPending={false}
      totalLessonsCount={10} progress={progress} onPurchase={() => undefined}
    />);
    expect(html).toContain('aria-valuenow="37.5"');
    expect(html).toContain('3/8 bài học hoàn thành');
    expect(html).not.toContain('0/10 bài giảng hoàn thành');
  });

  it('renders the same percentage and video-only counts on purchased-course cards', () => {
    const html = renderToStaticMarkup(<CourseCard course={card} isEnrolled progress={progress} />);
    expect(html).toContain('aria-valuenow="37.5"');
    expect(html).toContain('3/8 bài học hoàn thành');
    expect(html).not.toContain('3/10');
    expect(html).not.toContain('Đã xem');
  });

  it('does not display a misleading progress bar for a documents-only course', () => {
    const empty = { ...progress, completedLessons: 0, totalLessons: 0, progressPercent: null };
    for (const component of [
      <LearningProgressSummary key="summary" progress={empty} />,
      <CourseCard key="card" course={card} isEnrolled progress={empty} />,
    ]) {
      const html = renderToStaticMarkup(component);
      expect(html).toContain('Khóa học chưa có bài video');
      expect(html).not.toContain('role="progressbar"');
      expect(html).not.toContain('100%');
    }
  });

  it('shows a loading or error state instead of inventing a percentage', () => {
    expect(renderToStaticMarkup(<LearningProgressSummary isLoading />)).toContain('Đang tải tiến độ');
    const failed = renderToStaticMarkup(<LearningProgressSummary isError onRetry={() => undefined} />);
    expect(failed).toContain('Không thể tải tiến độ');
    expect(failed).toContain('Thử lại');
    expect(failed).not.toContain('role="progressbar"');
    expect(renderToStaticMarkup(<LearningProgressSummary progress={null} />)).toBe('');
  });
});

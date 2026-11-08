'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ILesson, ISection, LessonContentTypeEnum, LessonTranscriptionStatusEnum, RoleEnum } from 'share-lib';
import { useCurrentUserQuery } from '@/features/auth/api/auth.api';
import {
  courseKeys,
  useCourseDetailQuery,
  useCourseSectionsQuery,
  useLessonTranscriptQuery,
  useRetryLessonTranscriptionMutation,
} from '../../api/course.api';
import { usePublicCourseDetailQuery } from '../../api/enrollment.api';
import { deserializeKeyPoints } from '../../utils/lesson-key-points.util';
import { canEditCourseContent } from '../../utils/course-access.util';
import { getCourseUrl, type CourseViewMode } from '../../utils/course-view-mode.util';
import { useVideoPlayer } from './use-video-player';
import { LessonPlayerTopBar } from './lesson-player-top-bar';
import { LessonVideoScreen, TimelineMarker } from './lesson-video-screen';
import { LessonNavSidebar } from './lesson-nav-sidebar';
import { LessonTabsContainer } from './lesson-tabs-container';
import { useLessonLearningProgress } from './use-lesson-learning-progress';
import { LearningProgressSummary } from '../learning-progress-summary';

interface LessonPlayerStudioProps {
  courseId: string;
  lesson: ILesson;
  backUrl?: string;
  mode?: CourseViewMode;
}

export function LessonPlayerStudio({
  courseId,
  lesson,
  backUrl,
  mode = 'learn',
}: LessonPlayerStudioProps): React.JSX.Element {
  const { data: user, isError: isUserError } = useCurrentUserQuery();
  const hasManagementRole = user?.role === RoleEnum.INSTRUCTOR || user?.role === RoleEnum.ADMIN;

  // Do not reuse management data or infer editing from account role in learner mode.
  const { data: courseDetail } = useCourseDetailQuery(
    courseId,
    mode === 'edit' && hasManagementRole && !isUserError,
  );
  const { data: publicCourse } = usePublicCourseDetailQuery(courseId, mode === 'learn');
  const activeCourse = mode === 'edit' ? courseDetail : publicCourse;
  const { data: sections } = useCourseSectionsQuery(courseId);

  const canEdit =
    !isUserError &&
    sections?.some((section) => section.id === lesson.sectionId) === true &&
    canEditCourseContent(user, activeCourse, mode);

  // Reset editor state and media listeners together whenever the effective permission changes.
  return (
    <LessonPlayerStudioContent
      key={`${lesson.id}:${mode}:${canEdit}`}
      courseId={courseId}
      lesson={lesson}
      backUrl={backUrl}
      mode={mode}
      canEdit={canEdit}
      courseTitle={activeCourse?.title}
      sections={sections}
      userId={user?.id}
    />
  );
}

interface LessonPlayerStudioContentProps extends LessonPlayerStudioProps {
  canEdit: boolean;
  courseTitle?: string;
  sections?: ISection[];
  userId?: string;
}

function LessonPlayerStudioContent({
  courseId,
  lesson,
  backUrl,
  mode = 'learn',
  canEdit,
  courseTitle,
  sections,
  userId,
}: LessonPlayerStudioContentProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const defaultBackUrl = backUrl || getCourseUrl(courseId, mode);

  // Fetch Transcript from Database (MongoDB collection: lesson_transcripts)
  const {
    data: transcript,
    isLoading: isTranscriptLoading,
    refetch: refetchTranscript,
  } = useLessonTranscriptQuery(lesson.id, lesson.transcriptionStatus);

  // Theo dõi sự chuyển giao trạng thái để âm thầm đồng bộ lại lesson duration & sections
  const prevTranscriptStatusRef = useRef<LessonTranscriptionStatusEnum | undefined>(
    transcript?.status || lesson.transcriptionStatus,
  );

  useEffect(() => {
    const currentStatus = transcript?.status;
    const prevStatus = prevTranscriptStatusRef.current;

    if (
      currentStatus === LessonTranscriptionStatusEnum.READY &&
      prevStatus !== LessonTranscriptionStatusEnum.READY
    ) {
      // Âm thầm đồng bộ lại chi tiết bài học và danh sách chương học
      void queryClient.invalidateQueries({
        queryKey: courseKeys.lessonDetail(lesson.id),
      });
      void queryClient.invalidateQueries({
        queryKey: courseKeys.sections(courseId),
      });
    }

    prevTranscriptStatusRef.current = currentStatus;
  }, [transcript?.status, lesson.id, courseId, queryClient]);

  // Mutation to retry transcription when not found or failed
  const {
    mutate: retryTranscription,
    isPending: isRetryingTranscription,
  } = useRetryLessonTranscriptionMutation(lesson.id);

  // Video Player custom controller hook
  const player = useVideoPlayer();
  const learning = useLessonLearningProgress({
    userId,
    courseId,
    lessonId: lesson.id,
    videoUrl: lesson.content?.url,
    videoRef: player.videoRef,
    enabled: mode === 'learn' && lesson.content?.type === LessonContentTypeEnum.VIDEO,
  });

  // Dynamic Sidebar Height Synchronization with 16:9 Video Player Card
  const [sidebarHeight, setSidebarHeight] = useState<number | null>(null);
  const videoCardRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = videoCardRef.current;
    if (!el) return;

    const syncHeight = () => {
      // Synchronize height on desktop screens (>= 1024px)
      if (window.innerWidth >= 1024) {
        const height = el.getBoundingClientRect().height;
        if (height > 0) {
          setSidebarHeight(Math.round(height));
        }
      } else {
        setSidebarHeight(null);
      }
    };

    syncHeight();

    const resizeObserver = new ResizeObserver(() => {
      syncHeight();
    });

    resizeObserver.observe(el);
    window.addEventListener('resize', syncHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncHeight);
    };
  }, []);

  // Ensure viewport starts at the top when entering or switching lessons
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [lesson.id]);

  // Generate Timeline markers for Video Seekbar (Keeping main milestones on the seekbar)
  const timelineMarkers: TimelineMarker[] = useMemo(() => {
    const keyPoints = deserializeKeyPoints(lesson.description);
    const totalDuration =
      lesson.content?.duration || transcript?.durationSeconds || player.duration || 900;

    if (keyPoints.length > 0) {
      const step = Math.max(30, Math.floor(totalDuration / (keyPoints.length + 1)));
      return keyPoints.map((kp, idx) => ({
        time: idx === 0 ? 0 : Math.min(totalDuration, idx * step),
        label: kp.text,
      }));
    }

    // Default aesthetic milestones matching the user specification
    return [
      { time: 0, label: '00:00 - Giới thiệu tổng quan' },
      { time: 225, label: '03:45 - Cài đặt môi trường & Công cụ' },
      { time: 510, label: '08:30 - Cấu trúc mã nguồn & Kiến trúc' },
      { time: 730, label: '12:10 - Demo thực hành bài tập' },
      { time: 960, label: '16:00 - Tổng kết & Hướng dẫn mở rộng' },
    ];
  }, [lesson.description, lesson.content?.duration, transcript?.durationSeconds, player.duration]);

  const isDocument = lesson.content?.type === LessonContentTypeEnum.DOCUMENT;
  const sentences = transcript?.sentences || [];
  const currentTranscriptionStatus = transcript?.status || lesson.transcriptionStatus;

  return (
    <div className="min-h-screen w-full flex flex-col bg-background text-foreground select-none">
      {/* 1. Header Bar: Sticky Navigation & Metadata */}
      <LessonPlayerTopBar
        courseId={courseId}
        courseTitle={courseTitle}
        lessonTitle={lesson.title}
        lessonOrder={lesson.order}
        isPreview={lesson.isPreview}
        canEdit={canEdit}
        backUrl={defaultBackUrl}
      />

      {/* Main Layout Container: Ergonomic Laptop Width Max-bounds */}
      <div className="flex-1 w-full max-w-[1440px] 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {mode === 'learn' && (
          <LearningProgressSummary progress={learning.progress} isLoading={learning.isLoading}
            isError={learning.isError} onRetry={() => void learning.refetch()} saveState={learning.saveState} />
        )}
        {/* 2. Top Tier: 16:9 Video + Dynamically Synchronized Sidebar Height */}
        <div className="w-full flex flex-col lg:flex-row items-start gap-6 xl:gap-[40px]">
          {/* Left Block: 16:9 Video Player Standalone Card (~70% width) */}
          <section
            ref={videoCardRef}
            aria-label="Khung phát video chính"
            className="flex-1 min-w-0 w-full aspect-video bg-card border border-border rounded-2xl shadow-xs overflow-hidden relative flex flex-col"
          >
            <LessonVideoScreen
              player={player}
              videoUrl={lesson.content?.url}
              lessonTitle={lesson.title}
              lessonId={lesson.id || (lesson as unknown as { _id?: string })._id}
              isDocument={isDocument}
              documentUrl={lesson.content?.url}
              documentFileName={lesson.content?.fileName}
              timelineMarkers={timelineMarkers}
              isInstructor={canEdit}
            />
          </section>

          {/* Right Block: Navigation Sidebar Card (~30% width) */}
          <aside
            aria-label="Bảng điều hướng bài học"
            style={sidebarHeight ? { height: `${sidebarHeight}px` } : undefined}
            className="w-full lg:w-[360px] min-[1440px]:w-[400px] 2xl:w-[420px] shrink-0 h-[420px] lg:h-[540px] bg-card border border-border rounded-2xl shadow-xs flex flex-col min-h-0 overflow-hidden"
          >
            <LessonNavSidebar
              courseId={courseId}
              currentLessonId={lesson.id}
              mode={mode}
              timelineMarkers={timelineMarkers}
              sentences={sentences}
              isTranscriptLoading={isTranscriptLoading}
              transcriptionStatus={currentTranscriptionStatus}
              onRetryTranscription={canEdit ? () => retryTranscription() : undefined}
              isRetryingTranscription={isRetryingTranscription}
              currentTime={player.currentTime}
              duration={player.duration}
              sections={sections}
              onSeek={player.seek}
              formatTime={player.formatTime}
              onRefreshTranscription={() => void refetchTranscript()}
            />
          </aside>
        </div>

        {/* 3. Bottom Tier: Full-width 3 Tabs Standalone Card (Summary, Mindmap, Quizz) */}
        <section
          aria-label="Bảng chuyển đổi 3 Tab chi tiết bài học"
          className="w-full bg-card border border-border rounded-2xl shadow-xs overflow-hidden flex flex-col min-h-[360px]"
        >
          <LessonTabsContainer
            lessonId={lesson.id}
            isInstructor={canEdit}
            currentTime={player.currentTime}
            duration={player.duration || lesson.content?.duration || transcript?.durationSeconds}
            onSeek={player.seek}
            onPauseVideo={() => player.videoRef.current?.pause()}
          />
        </section>
      </div>
    </div>
  );
}

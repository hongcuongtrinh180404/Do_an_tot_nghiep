'use client';

import Link from 'next/link';
import { LearningStatusEnum, type ICourseLearningProgress } from 'share-lib';

const statusLabels: Record<LearningStatusEnum, string> = {
  [LearningStatusEnum.NOT_STARTED]: 'Chưa bắt đầu',
  [LearningStatusEnum.IN_PROGRESS]: 'Đang học',
  [LearningStatusEnum.COMPLETED]: 'Đã hoàn thành',
};

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  if (minutes > 0) return `${minutes} phút ${seconds % 60} giây`;
  return `${seconds} giây`;
}

export function LearningProgressSummary({ progress, isLoading, isError, onRetry, saveState, showResume = false }: {
  progress?: ICourseLearningProgress | null;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  saveState?: string;
  showResume?: boolean;
}) {
  if (isError && !progress) return (
    <div data-ui="learning-progress" className="text-sm text-muted-foreground">
      Không thể tải tiến độ.{' '}
      {onRetry && <button type="button" onClick={onRetry} className="cursor-pointer underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">Thử lại</button>}
    </div>
  );
  if (isLoading) return <p data-ui="learning-progress" role="status" className="text-sm text-muted-foreground">Đang tải tiến độ học tập…</p>;
  // Null means there is no actual enrollment, including an instructor viewing their own course.
  if (!progress) return null;

  return (
    <div data-ui="learning-progress" className="space-y-2 text-sm text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="font-medium">{statusLabels[progress.status]}</span>
        <span className="tabular-nums font-semibold">
          {progress.progressPercent === null ? 'Chưa xác định' : `${progress.progressPercent.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}
        </span>
      </div>
      {progress.progressPercent !== null && (
        <div role="progressbar" aria-label="Tiến độ khóa học theo thời gian xem" aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={progress.progressPercent} className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress.progressPercent}%` }} />
        </div>
      )}
      <p className="text-xs leading-5 text-muted-foreground tabular-nums">
        Đã xem {formatTime(progress.watchedMs)}
        {progress.totalDurationMs !== null ? ` / ${formatTime(progress.totalDurationMs)}` : ' · Thời lượng video chưa đầy đủ'}
      </p>
      {saveState && <p role="status" className="text-xs leading-5 text-muted-foreground">{saveState}</p>}
      {isError && (
        <p role="status" className="text-xs leading-5 text-muted-foreground">
          Chưa đồng bộ được tiến độ mới nhất.{' '}
          {onRetry && <button type="button" onClick={onRetry} className="cursor-pointer underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">Thử lại</button>}
        </p>
      )}
      {showResume && progress.lastLessonId && (
        <Link href={`/courses/${progress.courseId}/lessons/${progress.lastLessonId}`}
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
          Tiếp tục học
        </Link>
      )}
    </div>
  );
}

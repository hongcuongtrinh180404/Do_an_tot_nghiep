import { LessonContentTypeEnum, type ILesson } from 'share-lib';

export interface VideoLessonStats {
  videoCount: number;
  totalSeconds: number;
  missingDurationCount: number;
}

export function getVideoLessonStats(
  lessons: readonly Pick<ILesson, 'content'>[],
): VideoLessonStats {
  const stats: VideoLessonStats = {
    videoCount: 0,
    totalSeconds: 0,
    missingDurationCount: 0,
  };

  for (const lesson of lessons) {
    if (lesson.content?.type !== LessonContentTypeEnum.VIDEO) continue;

    stats.videoCount += 1;
    const duration = lesson.content.duration;
    if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
      stats.totalSeconds += duration;
    } else {
      stats.missingDurationCount += 1;
    }
  }

  return stats;
}

export function formatVideoDuration(
  { totalSeconds, missingDurationCount }: VideoLessonStats,
  style: 'compact' | 'long' = 'compact',
): string {
  if (missingDurationCount > 0 && totalSeconds <= 0) return 'Chưa xác định';

  // Round only after summing all videos, keeping second-level precision.
  const roundedSeconds = Math.round(totalSeconds);
  const hours = Math.floor(roundedSeconds / 3600);
  const minutes = Math.floor((roundedSeconds % 3600) / 60);
  const seconds = roundedSeconds % 60;
  const units = style === 'long' ? [' giờ', ' phút', ' giây'] : ['h', 'p', 's'];
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}${units[0]}`);
  if (minutes > 0) parts.push(`${minutes}${units[1]}`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}${units[2]}`);

  const text = parts.join(' ');
  return missingDurationCount > 0 ? `${text} (chưa đầy đủ)` : text;
}

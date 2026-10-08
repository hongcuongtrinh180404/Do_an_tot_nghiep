'use client';

import React from 'react';
import { Icon } from '@/components/ui/icon';
import { TimelineMarker } from './lesson-video-screen';

interface LessonTimelineTabProps {
  markers: TimelineMarker[];
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  formatTime: (seconds: number) => string;
}

export function LessonTimelineTab({
  markers,
  currentTime,
  onSeek,
  formatTime,
}: LessonTimelineTabProps): React.JSX.Element {
  if (markers.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3 text-muted-foreground">
        <div className="size-12 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground">
          <Icon icon="lucide:clock" className="size-6" />
        </div>
        <p className="text-xs text-muted-foreground max-w-[200px]">
          Chưa có mốc thời gian đánh dấu cho bài giảng này.
        </p>
      </div>
    );
  }

  // Find currently active marker
  const activeIndex = markers.reduce((bestIndex, marker, index) => {
    if (currentTime >= marker.time) {
      return index;
    }
    return bestIndex;
  }, 0);

  return (
    <div className="h-full overflow-y-auto p-3 space-y-2">
      <div className="flex items-center justify-between px-1 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        <span>Các mốc nội dung</span>
        <span>{markers.length} điểm</span>
      </div>

      <div className="space-y-1.5">
        {markers.map((marker, index) => {
          const isActive = activeIndex === index;
          const isPassed = currentTime > marker.time;

          return (
            <button
              key={index}
              type="button"
              onClick={() => onSeek(marker.time)}
              className={`w-full text-left p-2.5 rounded-xl border transition-all duration-150 flex items-start gap-3 cursor-pointer group ${
                isActive
                  ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 text-sky-950 dark:text-sky-100 shadow-2xs ring-1 ring-sky-500/20'
                  : 'bg-card hover:bg-muted/50 border-border/80 text-foreground'
              }`}
            >
              {/* Timestamp Badge */}
              <div
                className={`shrink-0 px-2 py-1 rounded-md font-mono text-[11px] font-bold flex items-center gap-1 border transition-colors ${
                  isActive
                    ? 'bg-sky-500/20 border-sky-500/40 text-sky-700 dark:text-sky-300'
                    : 'bg-muted border-border text-muted-foreground group-hover:text-foreground'
                }`}
              >
                <Icon
                  icon={isActive ? 'lucide:play' : isPassed ? 'lucide:check' : 'lucide:clock'}
                  className={`size-3 ${isActive ? 'text-sky-600 fill-current' : 'text-muted-foreground'}`}
                />
                <span>{formatTime(marker.time)}</span>
              </div>

              {/* Marker Title */}
              <div className="flex-1 min-w-0 pt-0.5">
                <p
                  className={`text-xs leading-relaxed line-clamp-2 ${
                    isActive ? 'font-semibold text-sky-900 dark:text-sky-200' : 'font-medium text-foreground'
                  }`}
                >
                  {marker.label}
                </p>
                {isActive && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-600 dark:text-sky-400 mt-1">
                    <span className="size-1.5 rounded-full bg-sky-500 animate-pulse" />
                    Đang phát mốc này
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';

export interface InVideoQuizPromptOverlayProps {
  timestamp: number;
  formatTime: (seconds: number) => string;
  questionCount?: number;
  onTakeQuiz: () => void;
  onSkip: () => void;
}

export function InVideoQuizPromptOverlay({
  timestamp,
  formatTime,
  questionCount = 1,
  onTakeQuiz,
  onSkip,
}: InVideoQuizPromptOverlayProps): React.JSX.Element {
  return (
    <div
      role="region"
      aria-label="Thông báo câu hỏi tương tác video"
      onClick={(e) => e.stopPropagation()}
      className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 select-none pointer-events-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-card/95 text-card-foreground border border-border shadow-2xl rounded-2xl p-5 sm:p-6 flex flex-col gap-4 backdrop-blur-md"
      >
        {/* Header with Icon and Timestamp */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-2xs">
              <Icon icon="lucide:help-circle" className="size-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tương tác video
                </span>
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] font-mono px-2 py-0.5"
                >
                  {formatTime(timestamp)}
                </Badge>
              </div>
              <h3 className="text-base font-bold text-foreground mt-0.5">
                Câu hỏi củng cố kiến thức
              </h3>
            </div>
          </div>
        </div>

        {/* Prompt description */}
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Bài học tạm dừng để bạn kiểm tra độ hiểu bài với{' '}
          <strong className="text-foreground font-semibold">
            {questionCount} câu hỏi nhanh
          </strong>
          . Bạn muốn làm ngay hay tiếp tục xem video?
        </p>

        {/* 2 Primary Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSkip}
            className="rounded-xl px-4 text-xs h-9 text-muted-foreground hover:text-foreground cursor-pointer gap-1.5"
          >
            <Icon icon="lucide:skip-forward" className="size-3.5" />
            <span>Bỏ qua</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onTakeQuiz}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl px-5 text-xs h-9 shadow-md shadow-emerald-600/20 cursor-pointer gap-1.5"
          >
            <Icon icon="lucide:play" className="size-3.5 fill-current" />
            <span>Làm câu hỏi</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

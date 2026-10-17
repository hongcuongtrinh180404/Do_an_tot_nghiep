'use client';

import React, { useState, useMemo } from 'react';
import type { ILessonSummaryData } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import {
  useLessonSummaryQuery,
  useGenerateSummaryMutation,
  useApplySummaryDraftMutation,
} from '@/features/course/api/transcript-analysis.api';

interface LessonSummaryTabProps {
  lessonId: string;
  isInstructor?: boolean;
  currentTime?: number;
  onSeek?: (timestamp: number) => void;
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function LessonSummaryTab({
  lessonId,
  isInstructor = false,
  currentTime = 0,
  onSeek,
}: LessonSummaryTabProps): React.JSX.Element {
  const { data: summaryDoc, isLoading } = useLessonSummaryQuery(lessonId);
  const { mutate: generateSummary, isPending: isGenerating } = useGenerateSummaryMutation(lessonId);
  const { mutate: applyDraft, isPending: isApplying } = useApplySummaryDraftMutation(lessonId);

  const hasDraft = Boolean(summaryDoc?.draftSummary);
  const [viewMode, setViewMode] = useState<'draft' | 'official'>('draft');

  const currentSummaryData: ILessonSummaryData | null = useMemo(() => {
    if (!summaryDoc) return null;
    if (viewMode === 'draft' && summaryDoc.draftSummary) {
      return summaryDoc.draftSummary;
    }
    return summaryDoc.summary || summaryDoc.draftSummary || null;
  }, [summaryDoc, viewMode]);

  return (
    <div className="w-full flex flex-col space-y-4 p-4 sm:p-6">
      {/* Top action header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Icon icon="lucide:file-text" className="size-5 text-sky-500" />
            <span>Tóm tắt nội dung bài học (Summary)</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tổng quan nội dung, các điểm cốt lõi và đúc kết sư phạm được trích xuất từ video bài giảng.
          </p>
        </div>

        {isInstructor && (
          <Button
            size="sm"
            onClick={() => generateSummary({ saveAsDraft: true })}
            disabled={isGenerating}
            className="h-8 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-2xs"
          >
            {isGenerating ? (
              <>
                <Icon icon="lucide:loader-2" className="size-3.5 mr-1.5 animate-spin" />
                Đang tóm tắt bài học AI...
              </>
            ) : (
              <>
                <Icon icon="lucide:sparkles" className="size-3.5 mr-1.5" />
                {currentSummaryData ? 'Tóm tắt lại bằng AI' : 'Tạo tóm tắt bằng AI'}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Instructor Draft Banner */}
      {isInstructor && hasDraft && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
              <Icon icon="lucide:sparkles" className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">
                Bản tóm tắt bài học mới từ AI đang chờ áp dụng
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {viewMode === 'draft'
                  ? 'Đang xem trước bản nháp từ Gemini.'
                  : 'Đang xem bản tóm tắt chính thức hiện hành.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode((prev) => (prev === 'draft' ? 'official' : 'draft'))}
              className="text-xs h-7.5 px-2.5 cursor-pointer text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
            >
              {viewMode === 'draft' ? 'Xem bản chính thức' : 'Xem bản nháp'}
            </Button>
            <Button
              size="sm"
              onClick={() => applyDraft()}
              disabled={isApplying}
              className="text-xs h-7.5 px-3 font-semibold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-2xs"
            >
              {isApplying ? (
                <>
                  <Icon icon="lucide:loader-2" className="size-3 mr-1 animate-spin" />
                  Đang áp dụng...
                </>
              ) : (
                <>
                  <Icon icon="lucide:check" className="size-3 mr-1" />
                  Áp dụng làm chính thức
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Summary Content Display */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <Icon icon="lucide:loader-2" className="size-8 text-sky-500 animate-spin" />
          <p className="text-xs text-muted-foreground">Đang tải bản tóm tắt bài học...</p>
        </div>
      ) : currentSummaryData ? (
        <div className="w-full max-w-4xl mx-auto space-y-6 py-2">
          {/* 1. Title & Overview */}
          <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-medium text-[11px] border border-sky-500/20">
                Tổng quan
              </span>
              <h4 className="text-base sm:text-lg font-bold text-foreground">
                {currentSummaryData.title}
              </h4>
            </div>
            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
              {currentSummaryData.overview}
            </p>
          </div>

          {/* 2. Key Points List */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">
              <Icon icon="lucide:layers" className="size-3.5 text-sky-500" />
              <span>Các ý chính then chốt (Key Points)</span>
            </h5>

            <div className="grid grid-cols-1 gap-3">
              {currentSummaryData.keyPoints.map((point, idx) => {
                const hasTimestamp = point.timestamp !== undefined && point.timestamp !== null;
                const isNearCurrentTime =
                  hasTimestamp && Math.abs(currentTime - point.timestamp!) < 5;

                return (
                  <div
                    key={`point-${idx}`}
                    className={`p-4 rounded-xl border transition-all bg-card ${
                      isNearCurrentTime
                        ? 'border-sky-500 shadow-md ring-2 ring-sky-500/20'
                        : 'border-border/80 hover:border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="size-5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <h6 className="text-xs sm:text-sm font-semibold text-foreground">
                          {point.title}
                        </h6>
                      </div>

                      {hasTimestamp && (
                        <button
                          type="button"
                          onClick={() => onSeek?.(point.timestamp!)}
                          title={`Tua video tới ${formatTime(point.timestamp!)}`}
                          className="shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-muted/60 hover:bg-sky-500 hover:text-white border border-border text-muted-foreground transition-all cursor-pointer shadow-2xs"
                        >
                          <Icon icon="lucide:play" className="size-2.5" />
                          <span>{formatTime(point.timestamp!)}</span>
                        </button>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-7">
                      {point.content}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Conclusion Box */}
          {currentSummaryData.conclusion && (
            <div className="p-4 sm:p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-2">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Icon icon="lucide:check-circle" className="size-4 shrink-0" />
                <h5 className="text-xs font-bold uppercase tracking-wider">
                  Kết luận & Điểm ghi nhớ cốt lõi
                </h5>
              </div>
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                {currentSummaryData.conclusion}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="py-16 text-center space-y-3 max-w-md mx-auto">
          <div className="size-12 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mx-auto text-muted-foreground">
            <Icon icon="lucide:file-text" className="size-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Chưa có bản tóm tắt cho bài học</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {isInstructor
                ? 'Nhấn nút "Tạo tóm tắt bằng AI" để tự động sinh bản tóm tắt tổng quan, ý chính và kết luận bài học.'
                : 'Giảng viên chưa cập nhật bản tóm tắt cho bài học này.'}
            </p>
          </div>
          {isInstructor && (
            <div className="pt-2">
              <Button
                size="sm"
                onClick={() => generateSummary({ saveAsDraft: true })}
                disabled={isGenerating}
                className="text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-2xs"
              >
                <Icon icon="lucide:sparkles" className="size-3.5 mr-1.5" />
                Tóm tắt bài học ngay
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

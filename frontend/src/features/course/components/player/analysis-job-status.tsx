'use client';

import React from 'react';
import { JobTypeEnum } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import type { AnalysisJobResponse } from '../../api/analysis-jobs.api';

interface AnalysisJobStatusBannerProps {
  job: AnalysisJobResponse | null;
  onRetry?: (jobId: string) => void;
  isRetrying?: boolean;
  className?: string;
}

export function AnalysisJobStatusBanner({
  job,
  onRetry,
  isRetrying = false,
  className = '',
}: AnalysisJobStatusBannerProps): React.JSX.Element | null {
  if (!job || job.status === 'completed') {
    return null;
  }

  const isQueued = job.status === 'queued';
  const isProcessing = job.status === 'processing';
  const isFailed = job.status === 'failed';
  const isBundle = job.type === JobTypeEnum.ANALYSIS_BUNDLE;
  const output = job.type === JobTypeEnum.QUIZ ? 'câu hỏi trắc nghiệm'
    : job.type === JobTypeEnum.MINDMAP ? 'sơ đồ tư duy' : 'bản tóm tắt bài học';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full rounded-2xl border p-4 sm:p-5 transition-all animate-in fade-in-50 duration-200 ${
        isFailed
          ? 'bg-rose-500/10 dark:bg-rose-500/5 border-rose-200 dark:border-rose-900/50'
          : isProcessing
            ? 'bg-sky-500/10 dark:bg-sky-500/5 border-sky-200 dark:border-sky-900/50'
            : 'bg-amber-500/10 dark:bg-amber-500/5 border-amber-200 dark:border-amber-900/50'
      } ${className}`}
    >
      <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
        <div className="flex items-start gap-3.5">
          <div
            className={`size-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
              isFailed
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                : isProcessing
                  ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            }`}
          >
            {isQueued && (
              <Icon icon="lucide:clock" className="size-5 animate-pulse" />
            )}
            {isProcessing && (
              <Icon icon="lucide:loader-2" className="size-5 animate-spin" />
            )}
            {isFailed && (
              <Icon icon="lucide:alert-circle" className="size-5" />
            )}
          </div>

          <div className="space-y-0.5">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              {isQueued && 'Đang xếp hàng chờ xử lý...'}
              {isProcessing &&
                (isBundle
                  ? 'AI đang tạo tóm tắt, sơ đồ tư duy và câu hỏi...'
                  : job.phase === 'calling_ai'
                  ? `AI đang phân tích transcript và tạo ${job.type === JobTypeEnum.SUMMARY ? 'tóm tắt' : output}...`
                  : job.phase === 'saving_result'
                    ? `Đang lưu ${output}...`
                    : `AI đang tạo ${output}...`)}
              {isFailed && (isBundle ? 'Không thể tạo học liệu tự động' : `Không thể tạo ${output}`)}

              {job.attempts > 1 && isProcessing && (
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-md bg-muted text-muted-foreground border">
                  Lần thử {job.attempts}/{job.maxAttempts}
                </span>
              )}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isFailed
                ? job.errorMessage || 'Đã có lỗi xảy ra khi tạo học liệu.'
                : 'Bạn có thể tự do chuyển sang bài học khác hoặc đóng trình duyệt, tác vụ AI vẫn tiếp tục chạy ngầm.'}
            </p>
          </div>
        </div>

        {isFailed && onRetry && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onRetry(job.id)}
            disabled={isRetrying}
            className="h-8 text-xs font-semibold border-rose-300 dark:border-rose-800 hover:bg-rose-500/10 text-rose-700 dark:text-rose-300 shrink-0 cursor-pointer"
          >
            {isRetrying ? (
              <>
                <Icon icon="lucide:loader-2" className="size-3.5 mr-1.5 animate-spin" />
                Đang gửi lại...
              </>
            ) : (
              <>
                <Icon icon="lucide:refresh-cw" className="size-3.5 mr-1.5" />
                Thử lại
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

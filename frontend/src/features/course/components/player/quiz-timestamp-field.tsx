'use client';

import { useId, useState } from 'react';
import { isQuizTimestamp, type ILessonQuiz } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { getLessonQuizErrorMessage, useUpdateQuizTimestampMutation } from '../../api/lesson-quiz.api';
import { formatQuizTime, parseQuizTime } from '../../utils/quiz-time-input.util';

interface Props {
  quiz: ILessonQuiz;
  courseId: string;
  duration?: number;
  showRequiredError: boolean;
  disabled?: boolean;
  onSeek?: (timestamp: number) => void;
  currentTime?: number;
}

export function QuizTimestampField({
  quiz,
  courseId,
  duration,
  showRequiredError,
  disabled,
  onSeek,
  currentTime,
}: Props) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState('');
  const mutation = useUpdateQuizTimestampMutation(quiz.lessonId, courseId);
  const value = draft ?? formatQuizTime(quiz.timestamp);
  const requiredError = showRequiredError && !isQuizTimestamp(quiz.timestamp, duration)
    ? 'Vui lòng nhập mốc MM:SS.' : '';
  const message = error || requiredError;

  const save = async () => {
    if (disabled || mutation.isPending || draft === null) return;
    const parsed = parseQuizTime(draft, duration);
    if (parsed.error) { setError(parsed.error); return; }
    if (parsed.value === quiz.timestamp) { setDraft(null); setError(''); return; }
    setError('');
    try {
      await mutation.mutateAsync({ quizId: quiz.id, timestamp: parsed.value });
      setDraft(null);
    } catch (failure) {
      setError(getLessonQuizErrorMessage(failure));
    }
  };

  const handleQuickCapture = async (seconds: number) => {
    if (disabled || mutation.isPending) return;
    const formatted = formatQuizTime(seconds);
    setDraft(formatted);
    setError('');
    try {
      await mutation.mutateAsync({ quizId: quiz.id, timestamp: seconds });
      setDraft(null);
    } catch (failure) {
      setError(getLessonQuizErrorMessage(failure));
    }
  };

  return (
    <div className="flex w-32 max-w-full shrink-0 flex-col gap-1 text-left sm:w-36">
      <div className="flex items-center justify-between gap-1 w-full text-muted-foreground">
        <label htmlFor={id} className="inline-flex items-center gap-1 text-[11px] font-semibold select-none">
          <Icon icon="lucide:clock-3" className="size-3 text-sky-500" />
          <span>Thời điểm</span>
        </label>
        {quiz.timestamp !== null && onSeek ? (
          <button
            type="button"
            onClick={() => onSeek(quiz.timestamp!)}
            title={`Tua video tới mốc câu hỏi ${formatQuizTime(quiz.timestamp)}`}
            className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 hover:underline cursor-pointer transition-colors"
          >
            <Icon icon="lucide:play" className="size-2.5 fill-current" />
            <span>Tua tới</span>
          </button>
        ) : currentTime !== undefined && currentTime > 0 ? (
          <button
            type="button"
            onClick={() => void handleQuickCapture(Math.floor(currentTime))}
            title={`Lấy mốc hiện tại của video (${formatQuizTime(Math.floor(currentTime))})`}
            className="inline-flex items-center gap-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 hover:underline cursor-pointer transition-colors"
          >
            <Icon icon="lucide:crosshair" className="size-2.5" />
            <span>Lấy mốc</span>
          </button>
        ) : null}
      </div>

      <input
        id={id}
        data-quiz-timestamp={quiz.id}
        value={value}
        placeholder="MM:SS"
        autoComplete="off"
        inputMode="text"
        disabled={disabled || mutation.isPending}
        aria-invalid={Boolean(message)}
        aria-describedby={message ? `${id}-error` : `${id}-status`}
        className={cn(
          'h-8 w-full rounded-lg border bg-card px-2.5 text-center font-mono text-xs sm:text-sm font-semibold tabular-nums text-foreground transition-all shadow-2xs',
          'placeholder:text-muted-foreground/40 placeholder:font-normal',
          'hover:border-border hover:bg-muted/20',
          'focus:border-sky-500 focus:bg-background focus:ring-2 focus:ring-sky-500/20 focus:outline-none',
          message
            ? 'border-destructive bg-destructive/10 text-destructive focus:border-destructive focus:ring-destructive/20'
            : 'border-input',
          (disabled || mutation.isPending) && 'opacity-60 pointer-events-none'
        )}
        onChange={(event) => { setDraft(event.target.value); setError(''); mutation.reset(); }}
        onBlur={() => { void save(); }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
          if (event.key === 'Escape') { setDraft(null); setError(''); }
        }}
      />

      {message ? (
        <p id={`${id}-error`} role="alert" className="break-words text-[11px] font-medium text-destructive text-right w-full">
          {message}
        </p>
      ) : (
        <span id={`${id}-status`} role="status" className="text-[10px] text-muted-foreground text-right w-full block">
          {mutation.isPending ? 'Đang lưu…' : draft !== null ? 'Enter để lưu' : mutation.isSuccess ? 'Đã lưu' : 'Phút:giây'}
        </span>
      )}
    </div>
  );
}

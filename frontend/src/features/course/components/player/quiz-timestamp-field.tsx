'use client';

import { useId, useState } from 'react';
import { isQuizTimestamp, type ILessonQuiz } from 'share-lib';
import { Input } from '@/components/ui/input';
import { getLessonQuizErrorMessage, useUpdateQuizTimestampMutation } from '../../api/lesson-quiz.api';
import { formatQuizTime, parseQuizTime } from '../../utils/quiz-time-input.util';

interface Props {
  quiz: ILessonQuiz;
  courseId: string;
  duration?: number;
  showRequiredError: boolean;
  disabled?: boolean;
}

export function QuizTimestampField({ quiz, courseId, duration, showRequiredError, disabled }: Props) {
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

  return (
    <div className="flex w-32 max-w-full shrink-0 flex-col gap-1 text-left">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">Thời điểm xuất hiện</label>
      <Input
        id={id}
        data-quiz-timestamp={quiz.id}
        value={value}
        placeholder="MM:SS"
        autoComplete="off"
        inputMode="text"
        disabled={disabled || mutation.isPending}
        aria-invalid={Boolean(message)}
        aria-describedby={message ? `${id}-error` : `${id}-status`}
        className={`h-11 w-full tabular-nums sm:h-9 ${message ? 'border-destructive bg-destructive/10 focus-visible:border-destructive focus-visible:ring-destructive/20' : ''}`}
        onChange={(event) => { setDraft(event.target.value); setError(''); mutation.reset(); }}
        onBlur={() => { void save(); }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
          if (event.key === 'Escape') { setDraft(null); setError(''); }
        }}
      />
      {message ? (
        <p id={`${id}-error`} role="alert" className="break-words text-xs text-destructive">{message}</p>
      ) : (
        <span id={`${id}-status`} role="status" className="text-xs text-muted-foreground">
          {mutation.isPending ? 'Đang lưu…' : draft !== null ? 'Enter để lưu' : mutation.isSuccess ? 'Đã lưu' : 'Phút:giây'}
        </span>
      )}
    </div>
  );
}

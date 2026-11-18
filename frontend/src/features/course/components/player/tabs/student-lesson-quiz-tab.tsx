'use client';

import { useEffect, useRef, useState } from 'react';
import type { IStudentLessonQuiz } from 'share-lib';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import type { LessonCheckpoints } from '../use-lesson-checkpoints';
import { useLessonQuizPractice } from '../use-lesson-quiz-practice';

export type StudentQuizState = Pick<LessonCheckpoints,
  'quizzes' | 'ready' | 'isError' | 'canSubmit' | 'retry' | 'checkAnswer' | 'playExplanation'>;

interface Props {
  userId?: string;
  courseId: string;
  lessonId: string;
  checkpoints?: StudentQuizState;
  onSeek?: (timestamp: number) => void;
}

const EMPTY_QUIZZES: IStudentLessonQuiz[] = [];
function formatTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

export function StudentLessonQuizTab({ userId, courseId, lessonId, checkpoints, onSeek }: Props) {
  const quizzes = checkpoints?.quizzes ?? EMPTY_QUIZZES;
  const practice = useLessonQuizPractice(userId, courseId, lessonId, quizzes);
  const [pending, setPending] = useState<Set<string>>(() => new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inFlight = useRef(new Set<string>());
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const completed = quizzes.filter((quiz) => quiz.answer).length;
  const hasChecked = practice.hydrated && quizzes.some((quiz) => practice.getAttempt(quiz).checked);
  const ready = practice.hydrated && checkpoints?.ready;
  const canSubmit = Boolean(ready && checkpoints?.canSubmit);

  const check = async (quiz: IStudentLessonQuiz) => {
    const key = `${quiz.id}:${quiz.revision}`;
    const attempt = practice.getAttempt(quiz);
    if (!canSubmit || attempt.checked || attempt.selectedOptionIds.length === 0 || inFlight.current.has(key)) return;
    inFlight.current.add(key);
    setPending(new Set(inFlight.current));
    setErrors((old) => ({ ...old, [key]: '' }));
    try {
      // Rehearsals use a key already disclosed by the server, never the management API.
      // Do not resubmit: the immutable first answer remains the completion evidence.
      const confirmed = quiz.answer ? quiz : await checkpoints!.checkAnswer(quiz, attempt.selectedOptionIds);
      if (!confirmed.answer || confirmed.revision !== quiz.revision) {
        throw new Error('Câu hỏi đã được cập nhật. Vui lòng trả lời phiên bản mới.');
      }
      practice.saveAttempt(quiz, { selectedOptionIds: attempt.selectedOptionIds, checked: true });
    } catch (failure) {
      const message = (failure as { response?: { data?: { message?: string } }; message?: string });
      if (alive.current) setErrors((old) => ({
        ...old, [key]: message.response?.data?.message ?? message.message ?? 'Không thể gửi câu trả lời. Vui lòng thử lại.',
      }));
    } finally {
      inFlight.current.delete(key);
      if (alive.current) setPending(new Set(inFlight.current));
    }
  };

  return (
    <div data-student-quiz-tab className="mx-auto w-full max-w-4xl space-y-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">Câu hỏi trắc nghiệm</h2>
        {ready && quizzes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span data-quiz-completed className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium tabular-nums text-muted-foreground">
              Đã hoàn thành: {completed}/{quizzes.length} câu
            </span>
            {hasChecked && (
              <Button
                data-quiz-reset
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 shadow-none sm:min-h-9"
                disabled={pending.size > 0}
                onClick={() => { practice.reset(); setErrors({}); }}
              >
                <Icon icon="lucide:rotate-ccw" className="size-4" aria-hidden="true" />
                Làm lại tất cả
              </Button>
            )}
          </div>
        )}
      </header>

      {checkpoints?.isError ? (
        <div role="alert" className="space-y-3 rounded-lg border border-border p-4">
          <p className="text-sm">Không tải được câu hỏi và tiến độ bài học.</p>
          <Button type="button" variant="outline" onClick={() => void checkpoints.retry()}>Thử lại</Button>
        </div>
      ) : !ready ? (
        <p role="status" className="py-4 text-sm text-muted-foreground">Đang tải câu hỏi…</p>
      ) : quizzes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Bài học chưa có câu hỏi trắc nghiệm.</p>
      ) : (
        <>
          {!canSubmit && <p className="text-sm text-muted-foreground">Đăng ký khóa học để trả lời và ghi nhận hoàn thành bài học.</p>}
          {quizzes.map((quiz, index) => {
            const key = `${quiz.id}:${quiz.revision}`;
            const attempt = practice.getAttempt(quiz);
            const busy = pending.has(key);
            const checked = attempt.checked;
            const selected = attempt.selectedOptionIds;
            const correctIds = checked ? quiz.answer?.correctOptionIds ?? [] : [];
            const correct = checked && selected.length === correctIds.length && selected.every((id) => correctIds.includes(id));
            const questionId = `quiz-question-${quiz.id}`;
            const hasExplanation = Boolean(quiz.explanation?.trim()) || quiz.explanationTimestamp != null;

            return (
              <article key={key} data-student-quiz={quiz.id} aria-labelledby={questionId} className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <p id={questionId} className="min-w-0 break-words text-sm font-semibold leading-relaxed text-foreground sm:text-base">
                    {quiz.question}
                  </p>
                  <button
                    type="button"
                    onClick={() => onSeek?.(quiz.timestamp)}
                    disabled={!onSeek}
                    aria-label={`Tua video tới câu hỏi ${index + 1} tại ${formatTime(quiz.timestamp)}`}
                    className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-muted px-3 text-xs font-medium tabular-nums text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-8"
                  >
                    {formatTime(quiz.timestamp)}
                  </button>
                </div>
                {quiz.questionType === 'multiple' && <p className="text-xs text-muted-foreground">Chọn một hoặc nhiều đáp án.</p>}
                <div role="group" aria-labelledby={questionId} className="flex flex-col gap-2.5">
                  {quiz.options.map((option) => {
                    const isSelected = selected.includes(option.id);
                    const isCorrect = checked && correctIds.includes(option.id);
                    const isWrong = checked && isSelected && !isCorrect;
                    return (
                      <button
                        key={option.id}
                        data-option-id={option.id}
                        type="button"
                        aria-pressed={isSelected}
                        disabled={checked || busy || !canSubmit}
                        onClick={() => {
                          practice.saveAttempt(quiz, ({ selectedOptionIds: current }) => ({
                            selectedOptionIds: quiz.questionType === 'multiple'
                              ? current.includes(option.id) ? current.filter((id) => id !== option.id) : [...current, option.id]
                              : [option.id],
                            checked: false,
                          }));
                          setErrors((old) => ({ ...old, [key]: '' }));
                        }}
                        className={cn(
                          'flex min-h-12 w-full items-start gap-3 rounded-lg border border-border bg-white p-3 text-left text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default dark:bg-card',
                          !checked && !busy && canSubmit && 'hover:border-sky-500',
                          !checked && isSelected && 'border-sky-600 bg-sky-50 text-sky-950 dark:bg-sky-950/40 dark:text-sky-100',
                          isCorrect && 'border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100',
                          isWrong && 'border-rose-600 bg-rose-50 text-rose-950 dark:bg-rose-950/40 dark:text-rose-100',
                        )}
                      >
                        <span className="shrink-0 font-semibold">{option.label}.</span>
                        <span className="min-w-0 flex-1 break-words leading-relaxed">{option.text}</span>
                        {isCorrect && <Icon icon="lucide:check" className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-label="Đáp án đúng" />}
                        {isWrong && <Icon icon="lucide:x" className="mt-0.5 size-4 shrink-0 text-rose-700 dark:text-rose-400" aria-label="Đáp án bạn chọn chưa đúng" />}
                      </button>
                    );
                  })}
                </div>
                {!checked && selected.length > 0 && (
                  <div className="flex justify-end">
                    <Button
                      data-quiz-check
                      type="button"
                      disabled={busy || !canSubmit}
                      aria-busy={busy}
                      onClick={() => void check(quiz)}
                      className="min-h-11 bg-sky-700 text-white shadow-none hover:bg-sky-800 sm:min-h-9"
                    >
                      {busy && <Icon icon="lucide:loader-2" className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                      {busy ? 'Đang kiểm tra…' : 'Check'}
                    </Button>
                  </div>
                )}
                {errors[key] && <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">{errors[key]}</p>}
                {checked && (
                  <div data-quiz-feedback className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200 motion-reduce:animate-none">
                    <p role="status" className={cn('text-sm font-medium', correct ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400')}>
                      {correct ? 'Bạn đã trả lời đúng.' : 'Bạn đã trả lời chưa đúng.'}
                    </p>
                    {hasExplanation && (
                      <section aria-label="Giải thích" className="rounded-lg bg-muted/60 p-3 text-sm leading-relaxed text-foreground sm:p-4">
                        {quiz.explanationTimestamp != null && (
                          <button
                            type="button"
                            onClick={() => checkpoints?.playExplanation(quiz.explanationTimestamp!)}
                            aria-label={`Nghe lại phần giải thích tại ${formatTime(quiz.explanationTimestamp)}`}
                            className="mr-2 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-background px-3 align-middle text-xs font-semibold tabular-nums transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9"
                          >
                            <Icon icon="lucide:play" className="size-3.5" aria-hidden="true" />
                            {formatTime(quiz.explanationTimestamp)}
                          </button>
                        )}
                        <strong>Giải thích: </strong>
                        <span className="whitespace-pre-line break-words">{quiz.explanation}</span>
                      </section>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </>
      )}
    </div>
  );
}

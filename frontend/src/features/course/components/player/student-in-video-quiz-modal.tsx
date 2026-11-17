'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { IStudentLessonQuiz } from 'share-lib';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface Props {
  timestamp: number;
  formatTime: (seconds: number) => string;
  quizzes: IStudentLessonQuiz[];
  required: boolean;
  canSubmit: boolean;
  isInstructorPreview?: boolean;
  submitting: boolean;
  error: string;
  onSubmit: (quiz: IStudentLessonQuiz, selectedOptionIds: string[]) => Promise<void>;
  onClose: () => void;
}

export function StudentInVideoQuizModal({ timestamp, formatTime, quizzes, required, canSubmit, isInstructorPreview = false, submitting, error, onSubmit, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [revealedQuiz, setRevealedQuiz] = useState<string | null>(null);
  const feedbackId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const revealButton = useRef<HTMLButtonElement>(null);
  const quiz = quizzes[index] ?? quizzes[0];
  const answer = quiz?.answer;
  const selection = answer?.selectedOptionIds ?? selected;
  const quizKey = quiz ? `${quiz.id}:${quiz.revision}` : '';
  const hasAnswer = Boolean(answer);
  const showAnswer = hasAnswer && (isInstructorPreview || revealedQuiz === quizKey);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);

  useEffect(() => {
    if (isInstructorPreview) return;
    // Submitting and advancing replace the focused footer control. Keep keyboard focus
    // inside the quiz instead of letting it fall back to the page behind the player.
    if (hasAnswer) revealButton.current?.focus();
    else dialog.current?.focus();
  }, [hasAnswer, quizKey, isInstructorPreview]);

  if (!quiz) return null;

  const select = (id: string) => {
    if (answer || submitting) return;
    setSelected((old) => quiz.questionType === 'multiple'
      ? old.includes(id) ? old.filter((item) => item !== id) : [...old, id]
      : [id]);
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 p-2 sm:p-4" onClick={(event) => event.stopPropagation()}>
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-quiz-title"
        tabIndex={-1}
        className="flex h-full max-h-[600px] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-card text-card-foreground outline-none"
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') { event.preventDefault(); onClose(); }
          if (event.key !== 'Tab') return;
          const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]') ?? []);
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
            event.preventDefault(); last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault(); first?.focus();
          }
        }}
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2 sm:px-5 sm:py-3">
          <div className="flex min-w-0 items-center gap-3 text-xs sm:text-sm">
            <span id="student-quiz-title" className="font-semibold">{isInstructorPreview ? 'Làm thử câu hỏi' : required ? 'Câu hỏi bắt buộc' : 'Ôn tập câu hỏi'}</span>
            <span className="tabular-nums text-muted-foreground">{formatTime(timestamp)}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button type="button" variant="ghost" size="sm" className="min-h-11 sm:min-h-0" disabled={required} onClick={onClose} title={required ? 'Trả lời các câu hỏi để tiếp tục' : undefined}>
              Bỏ qua
              <Icon icon="lucide:skip-forward" className="size-4" aria-hidden="true" />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" className="size-11 sm:size-7" aria-label="Đóng câu hỏi" onClick={onClose}>
              <Icon icon="lucide:x" className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 sm:p-5">
          {isInstructorPreview && <p className="text-sm text-muted-foreground">Kết quả làm thử không được lưu vào tiến độ học tập.</p>}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{quiz.questionType === 'multiple' ? 'Chọn một hoặc nhiều đáp án' : 'Chọn một đáp án'}</p>
            <h2 className="text-sm font-semibold leading-relaxed sm:text-base">{quiz.question}</h2>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {quiz.options.map((option) => {
              const isSelected = selection.includes(option.id);
              const correct = showAnswer && answer?.correctOptionIds.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={isSelected}
                  disabled={Boolean(answer) || submitting || !canSubmit}
                  onClick={() => select(option.id)}
                  className={cn(
                    'flex min-h-11 items-start gap-3 rounded-lg border border-border p-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default',
                    isSelected && !showAnswer && 'border-primary bg-primary/10',
                    correct && 'border-emerald-600 bg-emerald-500/10',
                    showAnswer && isSelected && !correct && 'border-destructive bg-destructive/10',
                    !answer && !submitting && canSubmit && 'hover:bg-muted',
                  )}
                >
                  <span className="shrink-0 font-semibold">{option.label}.</span>
                  <span>{option.text}</span>
                  {correct && <Icon icon="lucide:check" className="ml-auto size-4 shrink-0 text-emerald-600" aria-label="Đáp án đúng" />}
                  {showAnswer && isSelected && !correct && !isInstructorPreview && <Icon icon="lucide:x" className="ml-auto size-4 shrink-0 text-destructive" aria-label="Đáp án bạn chọn chưa đúng" />}
                </button>
              );
            })}
          </div>
          {answer && (
            <div id={feedbackId} className="space-y-3">
              <p role="status" className="text-sm">
                {showAnswer
                  ? answer.isCorrect ? 'Bạn đã trả lời đúng.' : 'Câu hỏi đã hoàn thành. Đáp án đúng được đánh dấu ở trên.'
                  : 'Câu hỏi đã hoàn thành.'}
              </p>
              {showAnswer && quiz.explanation?.trim() && (
                <section aria-label="Giải thích" className="space-y-1 rounded-lg bg-muted p-3">
                  <h3 className="text-sm font-semibold">Giải thích</h3>
                  <p className="whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">{quiz.explanation}</p>
                </section>
              )}
            </div>
          )}
          {!canSubmit && !answer && <p className="text-sm text-muted-foreground">Đăng ký khóa học để trả lời và ghi nhận hoàn thành bài học.</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2 sm:px-5 sm:py-3">
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{quizzes.length > 1 ? `Câu ${index + 1} / ${quizzes.length}` : ''}</span>
          {answer ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {!isInstructorPreview && (
                <Button
                  ref={revealButton}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="min-h-11 sm:min-h-0"
                  aria-expanded={showAnswer}
                  aria-controls={feedbackId}
                  onClick={() => setRevealedQuiz(showAnswer ? null : quizKey)}
                >
                  {showAnswer ? 'Ẩn đáp án' : 'Xem đáp án'}
                </Button>
              )}
              <Button type="button" size="sm" className="min-h-11 sm:min-h-0" onClick={() => {
                if (index < quizzes.length - 1) { setIndex(index + 1); setSelected([]); setRevealedQuiz(null); }
                else onClose();
              }}>{index < quizzes.length - 1 ? 'Câu tiếp theo' : 'Xem tiếp video'}</Button>
            </div>
          ) : (
            <Button type="button" size="sm" className="min-h-11 sm:min-h-0" disabled={!canSubmit || submitting || selection.length === 0} aria-busy={submitting} onClick={() => { void onSubmit(quiz, selection); }}>
              {submitting && <Icon icon="lucide:loader-2" className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              Trả lời
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { ILessonQuiz } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { useDeleteLessonQuizMutation, useLessonQuizzesQuery } from '@/features/course/api/lesson-quiz.api';
import { DeleteConfirmDialog } from '@/components/shared/dialog/delete-confirm-dialog';
import { LessonQuizQuestionDialog } from '../lesson-quiz-question-dialog';
import { useQuizTimingValidation } from '../../../hooks/use-quiz-timing-validation';
import { isQuizTimestamp } from 'share-lib';
import { StudentLessonQuizTab, type StudentQuizState } from './student-lesson-quiz-tab';

interface LessonQuizTabProps {
  userId?: string;
  courseId: string;
  reviewQuizId?: string;
  lessonId: string;
  isInstructor?: boolean;
  currentTime?: number;
  duration?: number;
  onSeek?: (timestamp: number) => void;
  onPauseVideo?: () => void;
  onGenerateQuiz?: () => void;
  isGenerating?: boolean;
  checkpoints?: StudentQuizState;
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function LessonQuizTab({
  userId,
  courseId,
  reviewQuizId,
  lessonId,
  isInstructor = false,
  currentTime = 0,
  duration,
  onSeek,
  onPauseVideo,
  onGenerateQuiz,
  isGenerating = false,
  checkpoints,
}: LessonQuizTabProps): React.JSX.Element {
  // Lấy câu hỏi chính thức của bài học
  const { data: officialQuizzes = [], isLoading, isError, refetch } = useLessonQuizzesQuery(lessonId, isInstructor);
  const deleteMutation = useDeleteLessonQuizMutation(lessonId);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<ILessonQuiz | undefined>();
  const [quizToDelete, setQuizToDelete] = useState<ILessonQuiz | null>(null);
  const showTimingErrors = useQuizTimingValidation(courseId);
  const focused = useRef(false);
  const missingCount = officialQuizzes.filter((quiz) => !isQuizTimestamp(quiz.timestamp, duration)).length;

  useEffect(() => {
    if (!isInstructor || !reviewQuizId || focused.current || isLoading) return;
    const frame = requestAnimationFrame(() => {
      const input = document.querySelector<HTMLInputElement>(`[data-quiz-timestamp="${CSS.escape(reviewQuizId)}"]`);
      if (!input) return;
      input.scrollIntoView({ block: 'center' });
      input.focus({ preventScroll: true });
      focused.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [isInstructor, reviewQuizId, isLoading]);

  const openEditor = (quiz?: ILessonQuiz) => {
    if (!isInstructor || isGenerating) return;
    onPauseVideo?.();
    setEditingQuiz(quiz);
    setIsEditorOpen(true);
  };

  const handleDeleteQuiz = () => {
    if (!isInstructor || !quizToDelete || deleteMutation.isPending) return;
    deleteMutation.mutate(quizToDelete.id, { onSuccess: () => setQuizToDelete(null) });
  };

  if (!isInstructor) {
    return (
      <StudentLessonQuizTab
        key={JSON.stringify([userId, courseId, lessonId])}
        userId={userId}
        courseId={courseId}
        lessonId={lessonId}
        checkpoints={checkpoints}
        onSeek={onSeek}
      />
    );
  }

  return (
    <div className="w-full flex flex-col space-y-4 p-4 sm:p-6">
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">Câu hỏi trắc nghiệm</h2>
          <p className="text-sm text-muted-foreground">
            {isLoading ? 'Đang tải câu hỏi…' : isError ? 'Chưa tải được danh sách câu hỏi' : `${officialQuizzes.length} câu hỏi · ${missingCount} câu chưa có thời điểm xuất hiện hợp lệ`}
          </p>
        </div>
        {isInstructor && (
          <Button type="button" onClick={() => openEditor()} disabled={isLoading || isError || isGenerating}>
            <Icon icon="lucide:plus" className="size-4" aria-hidden="true" />
            Thêm câu hỏi
          </Button>
        )}
      </div>
      {showTimingErrors && missingCount > 0 && (
        <p role="alert" className="mx-auto w-full max-w-4xl rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          Cần điền thời điểm xuất hiện cho {missingCount} câu hỏi trước khi gửi duyệt khóa học.
        </p>
      )}
      {/* Quiz List Display */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <Icon icon="lucide:loader-2" className="size-8 text-sky-500 animate-spin" />
          <p className="text-xs text-muted-foreground">Đang tải danh sách câu hỏi...</p>
        </div>
      ) : isError ? (
        <div role="alert" className="mx-auto w-full max-w-4xl space-y-3 rounded-lg border border-border p-5">
          <p className="text-sm text-foreground">Không tải được danh sách câu hỏi. Vui lòng thử lại.</p>
          <Button type="button" variant="outline" onClick={() => void refetch()}>Thử lại</Button>
        </div>
      ) : officialQuizzes.length > 0 ? (
        <div className="space-y-4 max-w-4xl mx-auto w-full">
          {officialQuizzes.map((quiz: ILessonQuiz, index: number) => {
            const isNearCurrentTime = quiz.timestamp !== null && Math.abs(currentTime - quiz.timestamp) < 5;
            const quizKey = ('id' in quiz && quiz.id) ? quiz.id : `quiz-${index}`;

            return (
              <div
                key={quizKey}
                className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                  isNearCurrentTime
                    ? 'border-sky-500/60 bg-sky-50/40 dark:bg-sky-950/20 shadow-md ring-1 ring-sky-500/20'
                    : 'border-border/70 bg-card hover:border-border hover:shadow-xs'
                }`}
              >
                {/* Header question */}
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Câu hỏi {index + 1}
                    </span>

                    {/* Viên thuốc thời điểm xuất hiện */}
                    {quiz.timestamp != null ? (
                      <button
                        type="button"
                        data-quiz-timestamp={quiz.id}
                        onClick={() => onSeek?.(quiz.timestamp!)}
                        title={`Tua video tới thời điểm xuất hiện tại ${formatTime(quiz.timestamp)}`}
                        aria-label={`Tua video tới thời điểm xuất hiện tại ${formatTime(quiz.timestamp)}`}
                        className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground hover:bg-accent hover:text-sky-600 dark:hover:text-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer border border-border/60"
                      >
                        <Icon icon="lucide:play-circle" className="size-3.5 text-sky-500" aria-hidden="true" />
                        <span>{formatTime(quiz.timestamp)}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-quiz-timestamp={quiz.id}
                        onClick={() => openEditor(quiz)}
                        title="Chưa đặt thời điểm xuất hiện - Nhấn để thiết lập"
                        aria-label="Chưa đặt thời điểm xuất hiện - Nhấn để thiết lập"
                        className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
                      >
                        <Icon icon="lucide:clock-alert" className="size-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                        <span>Chưa đặt mốc xuất hiện</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isInstructor && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 text-xs font-medium border-border hover:bg-muted text-foreground cursor-pointer shadow-2xs"
                          onClick={() => openEditor(quiz)}
                          disabled={isGenerating || deleteMutation.isPending}
                        >
                          <Icon icon="lucide:pencil" className="size-3.5 mr-1 text-muted-foreground" aria-hidden="true" />
                          Sửa
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2.5 text-xs font-medium text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                          disabled={isGenerating || deleteMutation.isPending}
                          onClick={() => { onPauseVideo?.(); setQuizToDelete(quiz); }}
                          aria-label={`Xóa câu hỏi ${index + 1}`}
                        >
                          <Icon icon="lucide:trash-2" className="size-3.5 mr-1" aria-hidden="true" />
                          Xóa
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Question Text */}
                <p className="break-words text-sm sm:text-base font-semibold text-foreground mb-4 leading-snug">
                  {quiz.question}
                </p>

                {/* Options list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                  {quiz.options.map((opt) => {
                    const isCorrect = opt.isCorrect;
                    return (
                      <div
                        key={opt.id || opt.label}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs sm:text-sm transition-colors ${
                          isCorrect
                            ? 'border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/25 text-emerald-950 dark:text-emerald-200 font-medium'
                            : 'border-border/60 bg-muted/20 text-muted-foreground'
                        }`}
                      >
                        <span
                          className={`inline-flex items-center justify-center size-6 rounded-lg text-xs font-bold shrink-0 mt-0.5 ${
                            isCorrect
                               ? 'bg-emerald-700 text-white shadow-2xs'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          {opt.label}
                        </span>
                        <div className="flex-1 space-y-0.5">
                          <p className="break-words leading-snug">{opt.text}</p>
                          {isCorrect && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                              <Icon icon="lucide:check" className="size-3" />
                              Đáp án chính xác
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Box */}
                {(quiz.explanation || quiz.explanationTimestamp != null) && (
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground flex items-start gap-2.5">
                    <Icon icon="lucide:lightbulb" className="size-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      {quiz.explanationTimestamp != null && (
                        <button
                          type="button"
                          onClick={() => onSeek?.(quiz.explanationTimestamp!)}
                          title={`Nghe lại phần giải thích tại ${formatTime(quiz.explanationTimestamp)}`}
                          aria-label={`Nghe lại phần giải thích tại ${formatTime(quiz.explanationTimestamp)}`}
                          className="mr-2 inline-flex min-h-11 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9"
                        >
                          <Icon icon="lucide:play-circle" className="size-3.5" aria-hidden="true" />
                          {formatTime(quiz.explanationTimestamp)}
                        </button>
                      )}
                      <span className="font-semibold text-foreground">Giải thích: </span>
                      <span className="break-words leading-relaxed">{quiz.explanation}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center space-y-3 max-w-md mx-auto">
          <div className="size-12 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mx-auto text-muted-foreground">
            <Icon icon="lucide:help-circle" className="size-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Chưa có câu hỏi trắc nghiệm</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {isInstructor
                ? 'Thêm câu hỏi đầu tiên hoặc tạo câu hỏi tự động từ video bằng AI.'
                : 'Giảng viên chưa tạo câu hỏi trắc nghiệm cho bài học này.'}
            </p>
          </div>
          {isInstructor && (
            <div className="pt-2 flex items-center justify-center gap-2">
              <Button
                size="sm"
                onClick={onGenerateQuiz}
                disabled={isGenerating}
                className="text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-2xs"
              >
                {isGenerating ? (
                  <>
                    <Icon icon="lucide:loader-2" className="size-3.5 mr-1.5 animate-spin" />
                    Đang phân tích & tạo câu hỏi...
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:sparkles" className="size-3.5 mr-1.5" />
                    Tạo 10 câu hỏi bằng AI
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
      {isInstructor && isEditorOpen && (
        <LessonQuizQuestionDialog
          lessonId={lessonId}
          quiz={editingQuiz}
          canEdit={isInstructor}
          currentTime={currentTime}
          duration={duration}
          onOpenChange={setIsEditorOpen}
        />
      )}
      <DeleteConfirmDialog
        open={isInstructor && quizToDelete !== null}
        onOpenChange={(open) => { if (!open && !deleteMutation.isPending) setQuizToDelete(null); }}
        title="Xóa câu hỏi trắc nghiệm?"
        description={`Xóa câu hỏi “${quizToDelete?.question ?? ''}”${quizToDelete?.timestamp != null ? ` tại ${formatTime(quizToDelete.timestamp)}` : ' chưa đặt thời điểm xuất hiện'}?`}
        isLoading={deleteMutation.isPending}
        onConfirm={handleDeleteQuiz}
      />
    </div>
  );
}

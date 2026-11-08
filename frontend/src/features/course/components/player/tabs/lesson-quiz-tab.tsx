'use client';

import React, { useState } from 'react';
import type { ILessonQuiz } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { useDeleteLessonQuizMutation, useLessonQuizzesQuery } from '@/features/course/api/lesson-quiz.api';
import { DeleteConfirmDialog } from '@/components/shared/dialog/delete-confirm-dialog';
import { LessonQuizQuestionDialog } from '../lesson-quiz-question-dialog';

interface LessonQuizTabProps {
  lessonId: string;
  isInstructor?: boolean;
  currentTime?: number;
  duration?: number;
  onSeek?: (timestamp: number) => void;
  onPauseVideo?: () => void;
  onGenerateQuiz?: () => void;
  isGenerating?: boolean;
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function LessonQuizTab({
  lessonId,
  isInstructor = false,
  currentTime = 0,
  duration,
  onSeek,
  onPauseVideo,
  onGenerateQuiz,
  isGenerating = false,
}: LessonQuizTabProps): React.JSX.Element {
  // Lấy câu hỏi chính thức của bài học
  const { data: officialQuizzes = [], isLoading, isError, refetch } = useLessonQuizzesQuery(lessonId);
  const deleteMutation = useDeleteLessonQuizMutation(lessonId);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<ILessonQuiz | undefined>();
  const [quizToDelete, setQuizToDelete] = useState<ILessonQuiz | null>(null);

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

  return (
    <div className="w-full flex flex-col space-y-4 p-4 sm:p-6">
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">Câu hỏi trắc nghiệm</h2>
          <p className="text-sm text-muted-foreground">
            {isLoading ? 'Đang tải câu hỏi…' : isError ? 'Chưa tải được danh sách câu hỏi' : `${officialQuizzes.length} câu hỏi · Sắp xếp theo thời điểm xuất hiện`}
          </p>
        </div>
        {isInstructor && (
          <Button type="button" onClick={() => openEditor()} disabled={isLoading || isError || isGenerating}>
            <Icon icon="lucide:plus" className="size-4" aria-hidden="true" />
            Thêm câu hỏi
          </Button>
        )}
      </div>
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
            const isNearCurrentTime = Math.abs(currentTime - quiz.timestamp) < 5;
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
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Câu hỏi {index + 1}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {isInstructor && (
                      <>
                        <Button type="button" size="sm" variant="outline" onClick={() => openEditor(quiz)} disabled={isGenerating || deleteMutation.isPending}>
                          <Icon icon="lucide:pencil" className="size-3.5" aria-hidden="true" />
                          Sửa
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={isGenerating || deleteMutation.isPending}
                          onClick={() => { onPauseVideo?.(); setQuizToDelete(quiz); }}
                          aria-label={`Xóa câu hỏi ${index + 1}`}
                        >
                          <Icon icon="lucide:trash-2" className="size-3.5" aria-hidden="true" />
                          Xóa
                        </Button>
                      </>
                    )}
                    {/* Timestamp tag button to seek */}
                    <button
                      type="button"
                      onClick={() => onSeek?.(quiz.timestamp)}
                      title={`Tua video tới mốc câu hỏi ${formatTime(quiz.timestamp)}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums bg-muted hover:bg-sky-500/15 hover:text-sky-600 transition-colors text-foreground cursor-pointer"
                    >
                      <Icon icon="lucide:play-circle" className="size-3.5 text-sky-500" aria-hidden="true" />
                      <span>{formatTime(quiz.timestamp)}</span>
                    </button>
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
                              ? 'bg-emerald-500 text-white shadow-2xs'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          {opt.label}
                        </span>
                        <div className="flex-1 space-y-0.5">
                          <p className="break-words leading-snug">{opt.text}</p>
                          {isCorrect && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
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
                {quiz.explanation && (
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground flex items-start gap-2.5">
                    <Icon icon="lucide:lightbulb" className="size-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
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
        description={`Chỉ xóa câu hỏi “${quizToDelete?.question ?? ''}” tại ${formatTime(quizToDelete?.timestamp ?? 0)}. Các câu hỏi khác được giữ nguyên.`}
        isLoading={deleteMutation.isPending}
        onConfirm={handleDeleteQuiz}
      />
    </div>
  );
}

'use client';

import React from 'react';
import type { ILessonQuiz } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { useLessonQuizzesQuery } from '@/features/course/api/lesson-quiz.api';
import { useGenerateQuizMutation } from '@/features/course/api/transcript-analysis.api';

interface LessonQuizTabProps {
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

export function LessonQuizTab({
  lessonId,
  isInstructor = false,
  currentTime = 0,
  onSeek,
}: LessonQuizTabProps): React.JSX.Element {
  // Lấy câu hỏi chính thức của bài học
  const { data: officialQuizzes = [], isLoading } = useLessonQuizzesQuery(lessonId);

  // Mutation sinh câu hỏi AI (tự động cập nhật trực tiếp thành câu hỏi chính thức)
  const { mutate: generateQuiz, isPending: isGenerating } = useGenerateQuizMutation(lessonId);

  return (
    <div className="w-full flex flex-col space-y-4 p-4 sm:p-6">
      {/* Top action header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Icon icon="lucide:help-circle" className="size-5 text-sky-500" />
            <span>Câu hỏi trắc nghiệm kiểm tra (Quizz)</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {officialQuizzes.length > 0
              ? `Tổng số ${officialQuizzes.length} câu hỏi được phân bổ theo dòng thời gian video.`
              : 'Bộ câu hỏi củng cố kiến thức theo mốc thời gian bài học (tối đa 10 câu chất lượng cao).'}
          </p>
        </div>

        {isInstructor && (
          <Button
            size="sm"
            onClick={() => generateQuiz({ count: 10, saveAsDraft: false })}
            disabled={isGenerating}
            className="h-8 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-2xs"
          >
            {isGenerating ? (
              <>
                <Icon icon="lucide:loader-2" className="size-3.5 mr-1.5 animate-spin" />
                Đang phân tích & tạo câu hỏi...
              </>
            ) : (
              <>
                <Icon icon="lucide:sparkles" className="size-3.5 mr-1.5" />
                {officialQuizzes.length > 0 ? 'Sinh lại câu hỏi AI' : 'Sinh câu hỏi bằng AI'}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Quiz List Display */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <Icon icon="lucide:loader-2" className="size-8 text-sky-500 animate-spin" />
          <p className="text-xs text-muted-foreground">Đang tải danh sách câu hỏi...</p>
        </div>
      ) : officialQuizzes.length > 0 ? (
        <div className="space-y-4 max-w-4xl mx-auto py-2 w-full">
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
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center size-6 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold text-xs">
                      #{quiz.order || index + 1}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      Câu hỏi {quiz.order || index + 1}
                    </span>
                  </div>

                  {/* Timestamp tag button to seek */}
                  <button
                    type="button"
                    onClick={() => onSeek?.(quiz.timestamp)}
                    title={`Tua video tới mốc câu hỏi ${formatTime(quiz.timestamp)}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted hover:bg-sky-500/15 hover:text-sky-600 transition-colors text-foreground cursor-pointer"
                  >
                    <Icon icon="lucide:play-circle" className="size-3.5 text-sky-500" />
                    <span>{formatTime(quiz.timestamp)}</span>
                  </button>
                </div>

                {/* Question Text */}
                <h4 className="text-sm sm:text-base font-semibold text-foreground mb-4 leading-snug">
                  {quiz.question}
                </h4>

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
                          <p className="leading-snug">{opt.text}</p>
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
                      <span className="leading-relaxed">{quiz.explanation}</span>
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
                ? 'Nhấn nút "Sinh câu hỏi bằng AI" để tự động tạo bộ câu hỏi chất lượng cao kèm đáp án và giải thích từ video.'
                : 'Giảng viên chưa tạo câu hỏi trắc nghiệm cho bài học này.'}
            </p>
          </div>
          {isInstructor && (
            <div className="pt-2 flex items-center justify-center gap-2">
              <Button
                size="sm"
                onClick={() => generateQuiz({ count: 10, saveAsDraft: false })}
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
                    Sinh câu hỏi bằng AI
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

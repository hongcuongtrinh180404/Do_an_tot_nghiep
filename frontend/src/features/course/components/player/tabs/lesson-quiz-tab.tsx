'use client';

import React, { useState, useMemo } from 'react';
import type { ILessonQuiz, IGeneratedQuizItem } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { useLessonQuizzesQuery } from '@/features/course/api/lesson-quiz.api';
import {
  useLessonQuizDraftQuery,
  useGenerateQuizMutation,
  useApplyQuizDraftMutation,
} from '@/features/course/api/transcript-analysis.api';

interface LessonQuizTabProps {
  lessonId: string;
  isInstructor?: boolean;
  currentTime?: number;
  onSeek?: (timestamp: number) => void;
}

type IQuizItemRender = ILessonQuiz | IGeneratedQuizItem;

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
  // Lấy câu hỏi chính thức
  const { data: officialQuizzes = [], isLoading: isOfficialLoading } =
    useLessonQuizzesQuery(lessonId);

  // Lấy bản nháp từ AI
  const { data: draftDoc, isLoading: isDraftLoading } =
    useLessonQuizDraftQuery(lessonId, isInstructor);

  const { mutate: generateQuiz, isPending: isGenerating } = useGenerateQuizMutation(lessonId);
  const { mutate: applyDraft, isPending: isApplying } = useApplyQuizDraftMutation(lessonId);

  const hasDraft = Boolean(draftDoc?.quizzes && draftDoc.quizzes.length > 0);
  const [viewMode, setViewMode] = useState<'draft' | 'official'>('draft');

  // Danh sách câu hỏi hiển thị
  const activeQuestions: IQuizItemRender[] = useMemo(() => {
    if (viewMode === 'draft' && hasDraft) {
      return draftDoc!.quizzes;
    }
    return officialQuizzes;
  }, [viewMode, hasDraft, draftDoc, officialQuizzes]);

  const isLoading = isOfficialLoading || (isInstructor && isDraftLoading);

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
            {activeQuestions.length > 0
              ? `Tổng số ${activeQuestions.length} câu hỏi được phân bổ theo dòng thời gian video.`
              : 'Bộ câu hỏi củng cố kiến thức theo mốc thời gian bài học.'}
          </p>
        </div>

        {isInstructor && (
          <Button
            size="sm"
            onClick={() => generateQuiz({ count: 10, saveAsDraft: true })}
            disabled={isGenerating}
            className="h-8 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-2xs"
          >
            {isGenerating ? (
              <>
                <Icon icon="lucide:loader-2" className="size-3.5 mr-1.5 animate-spin" />
                Đang sinh 10 câu hỏi AI...
              </>
            ) : (
              <>
                <Icon icon="lucide:sparkles" className="size-3.5 mr-1.5" />
                {activeQuestions.length > 0 ? 'Sinh lại 10 câu AI' : 'Sinh 10 câu hỏi bằng AI'}
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
                Bộ {draftDoc!.quizzes.length} câu hỏi trắc nghiệm mới từ AI đang chờ duyệt
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {viewMode === 'draft'
                  ? 'Đang xem trước bản nháp từ Gemini.'
                  : 'Đang xem câu hỏi chính thức của học viên.'}
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

      {/* Quiz List Display */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <Icon icon="lucide:loader-2" className="size-8 text-sky-500 animate-spin" />
          <p className="text-xs text-muted-foreground">Đang tải danh sách câu hỏi...</p>
        </div>
      ) : activeQuestions.length > 0 ? (
        <div className="space-y-4 max-w-4xl mx-auto py-2 w-full">
          {activeQuestions.map((quiz: IQuizItemRender, index: number) => {
            const isNearCurrentTime = Math.abs(currentTime - quiz.timestamp) < 5;
            const quizKey = ('id' in quiz && quiz.id) ? quiz.id : `quiz-${index}`;

            return (
              <div
                key={quizKey}
                className={`p-4 sm:p-5 rounded-2xl border transition-all bg-card ${
                  isNearCurrentTime
                    ? 'border-sky-500 shadow-md ring-2 ring-sky-500/20'
                    : 'border-border/80 hover:border-border'
                }`}
              >
                {/* Question Header */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="size-6 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono text-xs font-bold flex items-center justify-center">
                      #{quiz.order || index + 1}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      Câu hỏi {quiz.order || index + 1}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSeek?.(quiz.timestamp)}
                    title={`Tua video tới mốc câu hỏi ${formatTime(quiz.timestamp)}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-muted/60 hover:bg-sky-500 hover:text-white border border-border text-muted-foreground transition-all cursor-pointer shadow-2xs"
                  >
                    <Icon icon="lucide:play" className="size-3" />
                    <span>{formatTime(quiz.timestamp)}</span>
                  </button>
                </div>

                {/* Question Title */}
                <p className="text-sm sm:text-base font-semibold text-foreground mb-4 leading-snug">
                  {quiz.question}
                </p>

                {/* 4 Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3.5">
                  {quiz.options.map(
                    (
                      opt: { id?: string; label?: string; text: string; isCorrect: boolean },
                      optIdx: number,
                    ) => {
                      const isCorrect = opt.isCorrect;
                      const letter = opt.label || String.fromCharCode(65 + optIdx);

                      return (
                        <div
                          key={opt.id || `opt-${optIdx}`}
                          className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs sm:text-sm transition-all ${
                            isCorrect
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-200 font-semibold shadow-2xs'
                              : 'bg-muted/20 border-border/70 text-foreground/80'
                          }`}
                        >
                          <span
                            className={`size-5 rounded-md flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                              isCorrect
                                ? 'bg-emerald-500 text-white shadow-2xs'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="flex-1 leading-relaxed">{opt.text}</span>
                          {isCorrect && (
                            <Icon
                              icon="lucide:check-circle"
                              className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                            />
                          )}
                        </div>
                      );
                    },
                  )}
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
                ? 'Nhấn nút "Sinh 10 câu hỏi bằng AI" để tự động tạo bộ câu hỏi kiểm tra kèm đáp án từ video.'
                : 'Giảng viên chưa tạo câu hỏi trắc nghiệm cho bài học này.'}
            </p>
          </div>
          {isInstructor && (
            <div className="pt-2">
              <Button
                size="sm"
                onClick={() => generateQuiz({ count: 10, saveAsDraft: true })}
                disabled={isGenerating}
                className="text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-2xs"
              >
                <Icon icon="lucide:sparkles" className="size-3.5 mr-1.5" />
                Sinh câu hỏi ngay
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { ILessonQuiz } from 'share-lib';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export interface StudentInVideoQuizModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timestamp: number;
  formatTime: (seconds: number) => string;
  quizzes: ILessonQuiz[];
  onCompleteAndResume: () => void;
}

interface QuestionEvaluationState {
  isSubmitted: boolean;
  selectedOptionIds: string[];
  isCorrect: boolean;
  showExplanation: boolean;
}

export function StudentInVideoQuizModal({
  open,
  timestamp,
  formatTime,
  quizzes,
  onCompleteAndResume,
}: StudentInVideoQuizModalProps): React.JSX.Element {
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [evaluations, setEvaluations] = useState<Record<number, QuestionEvaluationState>>({});



  const totalQuestions = quizzes.length;
  const currentQuiz = quizzes[currentIdx] || quizzes[0];

  // Current question's evaluation state
  const currentEval: QuestionEvaluationState = useMemo(() => {
    return (
      evaluations[currentIdx] || {
        isSubmitted: false,
        selectedOptionIds: [],
        isCorrect: false,
        showExplanation: false,
      }
    );
  }, [evaluations, currentIdx]);

  // Select / toggle an option
  const handleSelectOption = (optionId: string) => {
    if (currentEval.isSubmitted) return; // Prevent changing after submission

    const isMultiple = currentQuiz.questionType === 'multiple';
    let nextSelected: string[];

    if (isMultiple) {
      if (currentEval.selectedOptionIds.includes(optionId)) {
        nextSelected = currentEval.selectedOptionIds.filter((id) => id !== optionId);
      } else {
        nextSelected = [...currentEval.selectedOptionIds, optionId];
      }
    } else {
      nextSelected = [optionId];
    }

    setEvaluations((prev) => ({
      ...prev,
      [currentIdx]: {
        ...currentEval,
        selectedOptionIds: nextSelected,
      },
    }));
  };

  // Submit and verify answer for current question
  const handleSubmitAnswer = () => {
    if (currentEval.selectedOptionIds.length === 0) return;

    // Check correctness:
    // Option is correct if all correct options are selected and no incorrect option is selected
    const correctOptionIds = currentQuiz.options
      .filter((opt) => opt.isCorrect)
      .map((opt) => opt.id);

    const hasWrongOption = currentEval.selectedOptionIds.some(
      (id) => !correctOptionIds.includes(id),
    );
    const hasAllCorrect =
      correctOptionIds.every((id) => currentEval.selectedOptionIds.includes(id)) &&
      currentEval.selectedOptionIds.length === correctOptionIds.length;

    const isCorrect = !hasWrongOption && hasAllCorrect;

    setEvaluations((prev) => ({
      ...prev,
      [currentIdx]: {
        ...currentEval,
        isSubmitted: true,
        isCorrect,
        showExplanation: true, // Automatically reveal button and explanation option
      },
    }));
  };

  // Toggle explanation card
  const handleToggleExplanation = () => {
    setEvaluations((prev) => ({
      ...prev,
      [currentIdx]: {
        ...currentEval,
        showExplanation: !currentEval.showExplanation,
      },
    }));
  };

  // Move to next question or complete
  const handleNextOrFinish = () => {
    if (currentIdx < totalQuestions - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      // Completed all questions in this checkpoint!
      onCompleteAndResume();
    }
  };

  // Escape key listener to skip & resume
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCompleteAndResume();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCompleteAndResume]);

  const isLastQuestion = currentIdx === totalQuestions - 1;

  if (!open || !currentQuiz) {
    return <></>;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Câu hỏi tương tác video học viên"
      onClick={(e) => e.stopPropagation()}
      className="absolute inset-0 z-40 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 select-none pointer-events-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[1020px] aspect-video max-h-[92%] p-0 gap-0 overflow-hidden rounded-2xl bg-card text-card-foreground border border-border shadow-2xl flex flex-col select-none"
      >

        {/* 1. Header Bar: Progress, Milestone, Close Button */}
        <div className="h-14 px-5 sm:px-8 border-b border-border flex items-center justify-between shrink-0 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Icon icon="lucide:help-circle" className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">
                  Câu hỏi tương tác
                </span>
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] font-mono px-2 py-0"
                >
                  {formatTime(timestamp)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Stepper Progress & Skip Action */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <span>Câu hỏi {currentIdx + 1} / {totalQuestions}</span>
              <div className="flex items-center gap-1 ml-1.5">
                {quizzes.map((_, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      'size-2 rounded-full transition-all duration-200',
                      idx === currentIdx
                        ? 'w-5 bg-amber-500 rounded-full'
                        : evaluations[idx]?.isSubmitted
                          ? evaluations[idx]?.isCorrect
                            ? 'bg-emerald-500'
                            : 'bg-rose-500'
                          : 'bg-muted-foreground/30',
                    )}
                  />
                ))}
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCompleteAndResume}
              className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 rounded-lg cursor-pointer gap-1"
            >
              <span>Bỏ qua & Xem tiếp</span>
              <Icon icon="lucide:skip-forward" className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* 2. Main Body: Question Prompt, Options, Feedback, and Explanation */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-10 py-6 flex flex-col justify-between">
          <div className="space-y-6 max-w-4xl mx-auto w-full">
            {/* Question Header & Prompt */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[11px] px-2 py-0.5 font-medium',
                    currentQuiz.questionType === 'multiple'
                      ? 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400'
                      : 'border-slate-300 dark:border-zinc-700 bg-muted/50 text-muted-foreground',
                  )}
                >
                  {currentQuiz.questionType === 'multiple'
                    ? 'Chọn một hoặc nhiều đáp án đúng'
                    : 'Chọn một đáp án đúng nhất'}
                </Badge>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-foreground leading-snug">
                {currentQuiz.question}
              </h2>
            </div>

            {/* Answer Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {currentQuiz.options.map((option) => {
                const isSelected = currentEval.selectedOptionIds.includes(option.id);
                const isSubmitted = currentEval.isSubmitted;
                const isOptionCorrect = option.isCorrect;

                let cardBorderClass = 'border-border/80 hover:border-amber-400/60 hover:bg-muted/30';
                let indicatorClass = 'bg-muted text-muted-foreground';

                if (isSelected && !isSubmitted) {
                  cardBorderClass = 'border-amber-500 bg-amber-500/10 text-foreground ring-1 ring-amber-500/50';
                  indicatorClass = 'bg-amber-500 text-slate-950 font-bold';
                } else if (isSubmitted) {
                  if (isOptionCorrect) {
                    // Correct answer (Green)
                    cardBorderClass = 'border-emerald-500 bg-emerald-500/10 text-foreground ring-1 ring-emerald-500/40';
                    indicatorClass = 'bg-emerald-500 text-white font-bold';
                  } else if (isSelected && !isOptionCorrect) {
                    // Chosen wrong answer (Red)
                    cardBorderClass = 'border-rose-500 bg-rose-500/10 text-foreground ring-1 ring-rose-500/40';
                    indicatorClass = 'bg-rose-500 text-white font-bold';
                  } else {
                    cardBorderClass = 'border-border/50 opacity-60';
                    indicatorClass = 'bg-muted text-muted-foreground';
                  }
                }

                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={isSubmitted}
                    onClick={() => handleSelectOption(option.id)}
                    className={cn(
                      'text-left p-3.5 sm:p-4 rounded-xl border transition-all duration-150 flex items-start gap-3 relative cursor-pointer disabled:cursor-default',
                      cardBorderClass,
                    )}
                  >
                    <span
                      className={cn(
                        'size-6 sm:size-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors',
                        indicatorClass,
                      )}
                    >
                      {option.label}
                    </span>
                    <span className="text-xs sm:text-sm text-foreground leading-relaxed flex-1 pt-0.5">
                      {option.text}
                    </span>

                    {/* Result Icon on Option */}
                    {isSubmitted && isOptionCorrect && (
                      <Icon
                        icon="lucide:check-circle-2"
                        className="size-4 sm:size-5 text-emerald-500 shrink-0 self-center"
                      />
                    )}
                    {isSubmitted && isSelected && !isOptionCorrect && (
                      <Icon
                        icon="lucide:x-circle"
                        className="size-4 sm:size-5 text-rose-500 shrink-0 self-center"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Instant Result Banner (Right / Wrong Feedback) */}
            {currentEval.isSubmitted && (
              <div
                className={cn(
                  'p-3.5 rounded-xl border flex items-start gap-3 animate-in fade-in-0 duration-200',
                  currentEval.isCorrect
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300',
                )}
              >
                <div
                  className={cn(
                    'size-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                    currentEval.isCorrect ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400',
                  )}
                >
                  <Icon
                    icon={currentEval.isCorrect ? 'lucide:check-circle-2' : 'lucide:alert-circle'}
                    className="size-4.5"
                  />
                </div>
                <div className="flex-1 text-xs sm:text-sm">
                  <p className="font-bold">
                    {currentEval.isCorrect
                      ? 'Chính xác! 🎉 Bạn đã nắm vững kiến thức này.'
                      : 'Chưa chính xác! Hãy quan sát đáp án đúng đã được đánh dấu xanh.'}
                  </p>
                  <p className="text-xs opacity-90 mt-0.5">
                    {currentEval.isCorrect
                      ? 'Tiếp tục phát huy ở các phần tiếp theo của bài học.'
                      : 'Xem lời giải chi tiết bên dưới để hiểu rõ bản chất kiến thức nhé.'}
                  </p>
                </div>

                {/* Button to toggle Explanation */}
                {currentQuiz.explanation && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleToggleExplanation}
                    className="shrink-0 h-8 text-xs font-semibold gap-1.5 rounded-lg border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 cursor-pointer"
                  >
                    <Icon icon="lucide:lightbulb" className="size-3.5 text-amber-500" />
                    <span>{currentEval.showExplanation ? 'Ẩn lời giải' : 'Xem giải thích'}</span>
                  </Button>
                )}
              </div>
            )}

            {/* Explanation Expandable Box */}
            {currentEval.isSubmitted && currentEval.showExplanation && currentQuiz.explanation && (
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-foreground space-y-1.5 animate-in fade-in-0 duration-200">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <Icon icon="lucide:book-open" className="size-4" />
                  <span>Giải thích chi tiết từ giảng viên:</span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-6">
                  {currentQuiz.explanation}
                </p>
              </div>
            )}
          </div>

          {/* 3. Modal Bottom Action Bar */}
          <div className="pt-4 border-t border-border flex items-center justify-between shrink-0 max-w-4xl mx-auto w-full">
            <span className="text-xs text-muted-foreground">
              {!currentEval.isSubmitted
                ? currentEval.selectedOptionIds.length === 0
                  ? 'Vui lòng chọn đáp án để kiểm tra'
                  : 'Nhấn "Kiểm tra đáp án" để xác nhận'
                : 'Đã hoàn thành câu hỏi này'}
            </span>

            <div className="flex items-center gap-2.5">
              {!currentEval.isSubmitted ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={currentEval.selectedOptionIds.length === 0}
                  onClick={handleSubmitAnswer}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2 rounded-xl text-xs h-9 shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon icon="lucide:check" className="size-3.5 stroke-[2.5]" />
                  <span>Kiểm tra đáp án</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleNextOrFinish}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded-xl text-xs h-9 shadow-md shadow-emerald-600/20 cursor-pointer gap-1.5"
                >
                  <span>{isLastQuestion ? 'Hoàn thành & Xem tiếp video' : 'Câu tiếp theo'}</span>
                  <Icon
                    icon={isLastQuestion ? 'lucide:play' : 'lucide:arrow-right'}
                    className="size-3.5 fill-current"
                  />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

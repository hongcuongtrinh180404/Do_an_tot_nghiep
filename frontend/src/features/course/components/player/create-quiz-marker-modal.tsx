'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { DeleteConfirmDialog } from '@/components/shared/dialog';
import { QuizQuestionTypeEnum, type ILessonQuiz } from 'share-lib';
import {
  useSyncLessonQuizzesMutation,
  useDeleteLessonQuizClusterMutation,
} from '../../api/lesson-quiz.api';
import { createQuizQuestionValues, quizQuestionFieldsSchema, type QuizQuestionFieldsValue } from '../../schemas/lesson-quiz.schema';
import { QuizQuestionFields } from './quiz-question-fields';

export interface QuizOption {
  id: string;
  label: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestionItem extends QuizQuestionFieldsValue {
  id: string;
  order: number;
}

export interface CreateQuizMarkerModalProps {
  open: boolean;
  canEdit?: boolean;
  onOpenChange: (open: boolean) => void;
  timestamp: number;
  formatTime: (seconds: number) => string;
  lessonId?: string;
  lessonTitle?: string;
  existingQuizzes?: ILessonQuiz[];
  initialAddNewQuestion?: boolean;
  onSavedMock?: (data: { timestamp: number; question: string; count?: number }) => void;
}

// Helper to create a clean, blank question template for instructors
export const createDefaultQuestion = (order: number = 1): QuizQuestionItem => ({
  ...createQuizQuestionValues(),
  id: `q-${Date.now()}-${order}`,
  order,
});

export function CreateQuizMarkerModal({
  open,
  canEdit = false,
  onOpenChange,
  timestamp,
  formatTime,
  lessonId,
  existingQuizzes = [],
  initialAddNewQuestion = false,
  onSavedMock,
}: CreateQuizMarkerModalProps): React.JSX.Element {
  // Multi-Question State: Starts with 1 clean empty question
  const [questions, setQuestions] = useState<QuizQuestionItem[]>([createDefaultQuestion(1)]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // UI Interactive Feedback States
  const [isSuccessToastVisible, setIsSuccessToastVisible] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState<boolean>(false);

  const syncMutation = useSyncLessonQuizzesMutation(lessonId);
  const deleteClusterMutation = useDeleteLessonQuizClusterMutation(lessonId);

  const handleDeleteAllQuestions = async () => {
    if (!canEdit) return;
    const hasDbQuizzes = (existingQuizzes || []).some(
      (q) => Math.abs(q.timestamp - timestamp) <= 2,
    );

    if (hasDbQuizzes && lessonId) {
      try {
        await deleteClusterMutation.mutateAsync(Math.round(timestamp));
        setIsConfirmDeleteOpen(false);
        resetForm();
        onOpenChange(false);
      } catch {
        // Handled by onError in mutation
      }
    } else {
      setIsConfirmDeleteOpen(false);
      resetForm();
      onOpenChange(false);
    }
  };

  // Load existing quizzes for this timestamp if present, otherwise initial clean template
  useEffect(() => {
    if (!canEdit || !open) return;
    const matched = (existingQuizzes || []).filter((q) => Math.abs(q.timestamp - timestamp) <= 2);
    if (matched.length > 0) {
      const existingItems: QuizQuestionItem[] = matched.map((q, idx) => ({
        id: q.id || `q-${idx + 1}`,
        order: q.order || idx + 1,
        question: q.question,
        questionType: q.questionType || QuizQuestionTypeEnum.SINGLE,
        options: q.options.map((opt) => ({
          id: opt.id,
          label: opt.label,
          text: opt.text,
          isCorrect: opt.isCorrect,
        })),
        explanation: q.explanation || '',
      }));

      if (initialAddNewQuestion) {
        // Automatically append the next question into existing question set
        const nextQ = createDefaultQuestion(existingItems.length + 1);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setQuestions([...existingItems, nextQ]);
        setActiveQuestionIndex(existingItems.length);
      } else {
        setQuestions(existingItems);
        setActiveQuestionIndex(0);
      }
    } else {
      setQuestions([createDefaultQuestion(1)]);
      setActiveQuestionIndex(0);
    }
    setValidationError(null);
  }, [canEdit, open, timestamp, existingQuizzes, initialAddNewQuestion]);

  // The question currently being edited in the Left Column
  const currentQuestion = useMemo(() => {
    return questions[activeQuestionIndex] || questions[0];
  }, [questions, activeQuestionIndex]);

  // Reset Form
  const resetForm = useCallback(() => {
    setQuestions([createDefaultQuestion(1)]);
    setActiveQuestionIndex(0);
    setDraggedIndex(null);
    setIsSuccessToastVisible(false);
    setValidationError(null);
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  // Helper to patch the currently active question
  const updateCurrentQuestion = useCallback(
    (patch: Partial<QuizQuestionItem>) => {
      setQuestions((prev) => {
        const next = [...prev];
        if (next[activeQuestionIndex]) {
          next[activeQuestionIndex] = {
            ...next[activeQuestionIndex],
            ...patch,
          };
        }
        return next;
      });
      if (validationError) setValidationError(null);
    },
    [activeQuestionIndex, validationError],
  );

  // Add a new blank question to the list
  const handleAddNewQuestion = () => {
    const nextIndex = questions.length;
    const newQ = createDefaultQuestion(nextIndex + 1);
    setQuestions((prev) => [...prev, newQ]);
    setActiveQuestionIndex(nextIndex);
    if (validationError) setValidationError(null);
  };

  // Delete a question (if more than 1 question)
  const handleDeleteQuestion = (e: React.MouseEvent, idxToDelete: number) => {
    e.stopPropagation();
    if (questions.length <= 1) return;

    setQuestions((prev) => {
      const filtered = prev.filter((_, i) => i !== idxToDelete);
      return filtered.map((item, i) => ({
        ...item,
        order: i + 1,
      }));
    });

    if (activeQuestionIndex === idxToDelete) {
      setActiveQuestionIndex(Math.max(0, idxToDelete - 1));
    } else if (activeQuestionIndex > idxToDelete) {
      setActiveQuestionIndex((prev) => prev - 1);
    }
  };

  // Drag and Drop handlers for reordering questions
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    setQuestions((prev) => {
      const next = [...prev];
      const [moved] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next.map((item, idx) => ({ ...item, order: idx + 1 }));
    });

    // Keep active question index in sync with moved position
    if (activeQuestionIndex === draggedIndex) {
      setActiveQuestionIndex(targetIndex);
    } else if (draggedIndex < activeQuestionIndex && targetIndex >= activeQuestionIndex) {
      setActiveQuestionIndex((prev) => prev - 1);
    } else if (draggedIndex > activeQuestionIndex && targetIndex <= activeQuestionIndex) {
      setActiveQuestionIndex((prev) => prev + 1);
    }

    setDraggedIndex(null);
  };

  // Save / Update All Questions
  const handleSaveAll = async () => {
    if (!canEdit) return;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const validation = quizQuestionFieldsSchema.safeParse(q);
      if (!validation.success) {
        setActiveQuestionIndex(i);
        setValidationError(`Câu ${i + 1}: ${validation.error.issues[0]?.message ?? 'Nội dung không hợp lệ.'}`);
        return;
      }
    }

    if (!lessonId) {
      setValidationError('Không tìm thấy thông tin bài học (lessonId). Vui lòng tải lại trang.');
      return;
    }

    const roundedTimestamp = Math.round(timestamp);

    try {
      await syncMutation.mutateAsync({
        timestamp: roundedTimestamp,
        questions: questions.map((q, idx) => ({
          id: q.id.startsWith('q-') ? undefined : q.id,
          order: idx + 1,
          question: q.question.trim(),
          questionType:
            q.questionType === 'multiple'
              ? QuizQuestionTypeEnum.MULTIPLE
              : QuizQuestionTypeEnum.SINGLE,
          options: q.options.map((opt) => ({
            id: opt.id,
            label: opt.label,
            text: opt.text.trim(),
            isCorrect: opt.isCorrect,
          })),
          explanation: q.explanation?.trim() || null,
        })),
      });

      setIsSuccessToastVisible(true);
      if (onSavedMock) {
        onSavedMock({
          timestamp: roundedTimestamp,
          question: questions[0].question.trim(),
          count: questions.length,
        });
      }

      setTimeout(() => {
        setIsSuccessToastVisible(false);
        resetForm();
        onOpenChange(false);
      }, 800);
    } catch {
      // Handled by mutation onError toast
    }
  };

  return (
    <Dialog open={canEdit && open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)] max-w-[calc(1440px-3rem)] sm:max-w-[calc(1440px-3rem)] 2xl:max-w-[calc(1536px-3rem)] aspect-video max-h-[90vh] p-0 gap-0 overflow-hidden rounded-2xl bg-card text-card-foreground border border-border shadow-2xl flex flex-col select-none"
      >
        {/* Screen Reader Accessible Title & Description */}
        <DialogTitle className="sr-only">Tạo câu hỏi tương tác video</DialogTitle>
        <DialogDescription className="sr-only">
          Soạn thảo và điều hướng danh sách câu hỏi tại mốc video
        </DialogDescription>

        {/* 2. Main Two-Column Body (70% Left Workspace / 30% Right Navigation) - NO TOP HEADER BAR */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-border/70 overflow-hidden bg-card">
          {/* ========================================================================= */}
          {/* CỘT TRÁI (~70% Chiều ngang): FORM NHẬP LIỆU & BIÊN TẬP CHI TIẾT          */}
          {/* ========================================================================= */}
          <div className="flex-1 lg:w-[70%] min-w-0 flex flex-col min-h-0 p-5 lg:p-6 overflow-y-auto space-y-3.5">
            {/* Hàng 1: Mốc thời gian & Tiêu đề số câu (Bỏ hoàn toàn Checkpoint) */}
            <div className="flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                {/* Badge mốc thời gian bo góc viền cam nhạt */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold shadow-2xs">
                  <Icon icon="lucide:clock" className="size-3.5 text-amber-500" />
                  <span>⏱ {formatTime(timestamp)}</span>
                </div>

                {/* Tag định vị số thứ tự câu đang sửa */}
                <span className="text-xs font-bold text-muted-foreground">
                  Câu {activeQuestionIndex + 1} / {questions.length}
                </span>
              </div>

              {/* Mép phải để trống sạch sẽ */}
              <div />
            </div>

            <QuizQuestionFields
              idPrefix="marker-quiz"
              value={currentQuestion}
              onChange={updateCurrentQuestion}
              disabled={syncMutation.isPending || deleteClusterMutation.isPending}
            />

            {/* Validation & Success Banners */}
            {validationError && (
              <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2 animate-in fade-in-0">
                <Icon icon="lucide:alert-circle" className="size-3.5 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {isSuccessToastVisible && (
              <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in-0">
                <Icon icon="lucide:check-circle" className="size-3.5 shrink-0" />
                <span>Đã lưu thành công {questions.length} câu hỏi tại mốc {formatTime(timestamp)}!</span>
              </div>
            )}

            {/* Hàng 6: Hàng nút hành động chân trang (Footer cột trái) */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-border/70 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenChange(false)}
                className="bg-card border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-muted/50 px-4 py-2 rounded-xl text-xs h-9 cursor-pointer"
              >
                Hủy / Đóng
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={syncMutation.isPending}
                onClick={handleSaveAll}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs shadow-md shadow-amber-500/20 h-9 cursor-pointer gap-1.5 disabled:opacity-50"
              >
                {syncMutation.isPending ? (
                  <Icon icon="lucide:loader-2" className="size-3.5 animate-spin" />
                ) : (
                  <Icon icon="lucide:check" className="size-3.5 stroke-[2.5]" />
                )}
                <span>Lưu / Cập nhật câu hỏi</span>
              </Button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CỘT PHẢI (~30% Chiều ngang): DANH SÁCH ĐIỀU HƯỚNG & KÉO THẢ THỨ TỰ       */}
          {/* ========================================================================= */}
          <div className="lg:w-[30%] shrink-0 flex flex-col min-h-0 bg-muted/15 overflow-hidden">
            {/* Thanh Header nhỏ của Cột Phải */}
            <div className="px-3.5 py-3 border-b border-border/70 flex items-center justify-between gap-2 shrink-0 bg-card">
              <div className="flex items-center gap-1.5 min-w-0">
                <Icon icon="lucide:list-checks" className="size-4 text-amber-500 shrink-0" />
                <span className="text-xs font-bold text-foreground truncate">
                  Danh sách ({questions.length})
                </span>
              </div>

              {/* Nút hành động bên phải: [Xóa tất cả] và [+ Thêm câu] */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  title="Xóa toàn bộ câu hỏi tại mốc này"
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  disabled={deleteClusterMutation.isPending}
                  className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 font-medium px-2 py-1 rounded-lg text-xs flex items-center gap-1 h-7 cursor-pointer shadow-2xs"
                >
                  <Icon icon="lucide:trash-2" className="size-3" />
                  <span>Xóa tất cả</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddNewQuestion}
                  className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 font-bold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 h-7 cursor-pointer shadow-2xs"
                >
                  <Icon icon="lucide:plus" className="size-3 stroke-[2.5]" />
                  <span>Thêm câu</span>
                </Button>
              </div>
            </div>

            {/* Danh sách các thẻ câu hỏi (Vertical Draggable List) */}
            <div
              className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5"
              onDragOver={handleDragOver}
            >
              {questions.map((q, idx) => {
                const isActive = idx === activeQuestionIndex;
                const isBeingDragged = draggedIndex === idx;

                return (
                  <div
                    key={q.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onClick={() => {
                      setActiveQuestionIndex(idx);
                      if (validationError) setValidationError(null);
                    }}
                    className={`rounded-xl p-3 transition-all cursor-pointer relative group flex flex-col gap-1.5 ${
                      isBeingDragged ? 'opacity-40 scale-95' : 'opacity-100'
                    } ${
                      isActive
                        ? 'bg-card border border-amber-500 ring-2 ring-amber-500/25 shadow-md shadow-amber-500/15'
                        : 'bg-card border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    {/* Hàng trên của Card: Grip handle ⠿ + Số thứ tự + Tag loại */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {/* Ký hiệu kéo thả Grip Handle ⠿ */}
                        <div
                          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition p-0.5 -ml-0.5"
                          title="Giữ và kéo để đổi thứ tự câu hỏi"
                        >
                          <Icon icon="lucide:grip-vertical" className="size-3.5 stroke-[2.5]" />
                        </div>

                        {/* Huy hiệu tròn số thứ tự */}
                        <span
                          className={`size-4.5 rounded-full font-bold text-[10px] flex items-center justify-center font-mono ${
                            isActive
                              ? 'bg-amber-500 text-slate-950 shadow-2xs'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {idx + 1}
                        </span>

                        <span className={`text-xs font-bold truncate ${isActive ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                          Câu {idx + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 h-4 border-slate-200 dark:border-zinc-700 text-muted-foreground"
                        >
                          {q.questionType === 'single' ? '1 đáp án' : 'Nhiều'}
                        </Badge>
                        {questions.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => handleDeleteQuestion(e, idx)}
                            className="size-5 text-muted-foreground hover:text-destructive opacity-30 group-hover:opacity-100 transition p-0 cursor-pointer"
                            title="Xóa câu hỏi này"
                          >
                            <Icon icon="lucide:trash-2" className="size-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Nội dung tóm tắt: Dùng line-clamp-2 cắt gọn */}
                    <div className="text-[11px] text-muted-foreground leading-snug line-clamp-2 pl-5">
                      {q.question.trim() || '(Chưa nhập nội dung đề bài...)'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Cột Phải: Hướng dẫn kéo thả */}
            <div className="p-2.5 border-t border-border/70 text-center text-[10px] text-muted-foreground bg-card shrink-0 flex items-center justify-center gap-1">
              <Icon icon="lucide:grip-vertical" className="size-3 text-slate-400" />
              <span>Kéo biểu tượng ⠿ để đổi thứ tự câu hỏi</span>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Hộp thoại xác nhận xóa toàn bộ câu hỏi tại mốc này */}
      <DeleteConfirmDialog
        open={isConfirmDeleteOpen}
        onOpenChange={setIsConfirmDeleteOpen}
        title="Xác nhận xóa"
        description="Bạn có chắc muốn xóa không ?"
        confirmText="Xác nhận xóa"
        cancelText="Hủy"
        isLoading={deleteClusterMutation.isPending}
        onConfirm={handleDeleteAllQuestions}
      />
    </Dialog>
  );
}

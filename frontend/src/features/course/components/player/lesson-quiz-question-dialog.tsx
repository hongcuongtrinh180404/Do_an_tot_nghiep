'use client';

import React, { useEffect, useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ILessonQuiz } from 'share-lib';
import { DialogLayout } from '@/components/shared/dialog/dialog-layout';
import { ActionConfirmDialog } from '@/components/shared/dialog/action-confirm-dialog';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { getLessonQuizErrorMessage, useSaveLessonQuizMutation } from '../../api/lesson-quiz.api';
import {
  createLessonQuizSchema,
  createQuizQuestionValues,
  type LessonQuizFormValues,
} from '../../schemas/lesson-quiz.schema';
import { QuizQuestionFields } from './quiz-question-fields';
import { Input } from '@/components/ui/input';
import { formatQuizTime, parseQuizTime } from '../../utils/quiz-time-input.util';

interface LessonQuizQuestionDialogProps {
  lessonId: string;
  quiz?: ILessonQuiz;
  canEdit: boolean;
  currentTime: number;
  duration?: number;
  onOpenChange: (open: boolean) => void;
}

export function LessonQuizQuestionDialog({
  lessonId,
  quiz,
  canEdit,
  duration,
  onOpenChange,
}: LessonQuizQuestionDialogProps): React.JSX.Element {
  const formId = useId();
  const [timestampText, setTimestampText] = useState(formatQuizTime(quiz?.timestamp ?? null));
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const saveMutation = useSaveLessonQuizMutation(lessonId);
  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<LessonQuizFormValues>({
    resolver: zodResolver(createLessonQuizSchema(duration)),
    defaultValues: {
      timestamp: quiz?.timestamp ?? null,
      questionData: createQuizQuestionValues(quiz),
    },
  });
  const isPending = isSubmitting || saveMutation.isPending;

  useEffect(() => {
    if (!isDirty || isPending) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [isDirty, isPending]);

  const handleOpenChange = (open: boolean) => {
    if (isPending) return;
    if (!open && isDirty) {
      setIsDiscardOpen(true);
      return;
    }
    onOpenChange(open);
  };

  const onSubmit = async ({ timestamp, questionData }: LessonQuizFormValues) => {
    if (!canEdit || saveMutation.isPending) return;
    clearErrors('root');
    try {
      await saveMutation.mutateAsync({
        quizId: quiz?.id,
        payload: { timestamp, ...questionData, explanation: questionData.explanation || null, explanationTimestamp: quiz?.explanationTimestamp },
      });
      onOpenChange(false);
    } catch (error: unknown) {
      setError('root.server', { message: getLessonQuizErrorMessage(error) });
    }
  };

  return (
    <>
      <DialogLayout
        open={canEdit}
        onOpenChange={handleOpenChange}
        title={quiz ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi'}
        description="Đặt thời điểm xuất hiện trong video và chọn đáp án đúng cho câu hỏi."
        className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col sm:max-w-3xl"
        bodyClassName="min-h-0 overflow-y-auto overscroll-contain"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>Hủy</Button>
            <Button type="submit" form={formId} disabled={isPending || !canEdit}>
              {isPending && <Icon icon="lucide:loader-2" aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />}
              {isPending ? 'Đang lưu…' : quiz ? 'Lưu thay đổi' : 'Thêm câu hỏi'}
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <Controller
            name="timestamp"
            control={control}
            render={({ field, fieldState }) => (
              <fieldset disabled={isPending} className="space-y-2">
                <legend className="mb-2 text-sm font-medium">Thời điểm xuất hiện (phút:giây)</legend>
                <Input
                  value={timestampText}
                  placeholder="MM:SS"
                  aria-label="Thời điểm xuất hiện (phút:giây)"
                  onChange={(event) => {
                    setTimestampText(event.target.value);
                    const parsed = parseQuizTime(event.target.value, duration);
                    field.onChange(parsed.error ? NaN : parsed.value);
                  }}
                  disabled={isPending}
                  aria-invalid={Boolean(fieldState.error)}
                  aria-describedby={fieldState.error ? `${formId}-timestamp-error` : undefined}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  className="w-36 tabular-nums"
                />
                {fieldState.error && (
                  <p id={`${formId}-timestamp-error`} role="alert" className="text-xs text-destructive">
                    {fieldState.error.message}
                  </p>
                )}
              </fieldset>
            )}
          />
          <Controller
            name="questionData"
            control={control}
            render={({ field }) => (
              <QuizQuestionFields
                idPrefix={formId}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                errors={errors.questionData}
                disabled={isPending}
              />
            )}
          />
          {errors.root?.server?.message && (
            <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {errors.root.server.message}
            </p>
          )}
        </form>
      </DialogLayout>
      <ActionConfirmDialog
        open={canEdit && isDiscardOpen}
        onOpenChange={setIsDiscardOpen}
        title="Bỏ các thay đổi chưa lưu?"
        description="Nội dung bạn vừa nhập chưa được lưu. Bạn có thể tiếp tục chỉnh sửa hoặc bỏ các thay đổi này."
        confirmText="Bỏ thay đổi"
        cancelText="Tiếp tục chỉnh sửa"
        variant="warning"
        onConfirm={() => onOpenChange(false)}
      />
    </>
  );
}

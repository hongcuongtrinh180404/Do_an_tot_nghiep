'use client';

import type React from 'react';
import type { FieldErrors } from 'react-hook-form';
import { QuizQuestionTypeEnum } from 'share-lib';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { QuizQuestionFieldsValue } from '../../schemas/lesson-quiz.schema';

interface QuizQuestionFieldsProps {
  value: QuizQuestionFieldsValue;
  onChange: (value: QuizQuestionFieldsValue) => void;
  onBlur?: () => void;
  inputRef?: React.Ref<HTMLTextAreaElement>;
  errors?: FieldErrors<QuizQuestionFieldsValue>;
  disabled?: boolean;
  idPrefix: string;
}

export function QuizQuestionFields({
  value,
  onChange,
  onBlur,
  inputRef,
  errors,
  disabled = false,
  idPrefix,
}: QuizQuestionFieldsProps): React.JSX.Element {
  const updateType = (questionType: QuizQuestionTypeEnum) => {
    const firstCorrect = value.options.findIndex((option) => option.isCorrect);
    onChange({
      ...value,
      questionType,
      options: value.options.map((option, index) => ({
        ...option,
        isCorrect: questionType === QuizQuestionTypeEnum.SINGLE ? index === firstCorrect : option.isCorrect,
      })),
    });
  };

  const selectCorrectAnswer = (index: number) => {
    onChange({
      ...value,
      options: value.options.map((option, optionIndex) => ({
        ...option,
        isCorrect: value.questionType === QuizQuestionTypeEnum.SINGLE
          ? optionIndex === index
          : optionIndex === index ? !option.isCorrect : option.isCorrect,
      })),
    });
  };

  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-5" onBlur={onBlur}>
      <legend className="sr-only">Nội dung và đáp án câu hỏi</legend>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-question`}>Nội dung câu hỏi <span aria-hidden="true">*</span></Label>
        <Textarea
          ref={inputRef}
          id={`${idPrefix}-question`}
          name={`${idPrefix}-question`}
          autoComplete="off"
          value={value.question}
          onChange={(event) => onChange({ ...value, question: event.target.value })}
          placeholder="Nhập câu hỏi cho bài học…"
          rows={3}
          className="min-h-24 resize-y text-sm"
          aria-required="true"
          aria-invalid={Boolean(errors?.question)}
          aria-describedby={errors?.question ? `${idPrefix}-question-error` : undefined}
        />
        {errors?.question?.message && (
          <p id={`${idPrefix}-question-error`} role="alert" className="text-xs text-destructive">{errors.question.message}</p>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Hình thức câu hỏi</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {[
            { type: QuizQuestionTypeEnum.SINGLE, label: 'Một đáp án đúng' },
            { type: QuizQuestionTypeEnum.MULTIPLE, label: 'Nhiều đáp án đúng' },
          ].map(({ type, label }) => (
            <label key={type} className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name={`${idPrefix}-type`}
                value={type}
                checked={value.questionType === type}
                onChange={() => updateType(type)}
                className="size-4 accent-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3" aria-describedby={errors?.options?.message ? `${idPrefix}-options-error` : undefined}>
        <legend className="mb-2 text-sm font-medium">Phương án trả lời và đáp án đúng</legend>
        {errors?.options?.message && (
          <p id={`${idPrefix}-options-error`} role="alert" className="text-xs text-destructive">{errors.options.message}</p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {value.options.map((option, index) => {
            const textError = errors?.options?.[index]?.text?.message;
            return (
              <div key={option.id} className="space-y-2 rounded-lg border border-border p-3">
                <label className="flex min-h-8 cursor-pointer items-center gap-2 text-sm font-medium">
                  <input
                    type={value.questionType === QuizQuestionTypeEnum.SINGLE ? 'radio' : 'checkbox'}
                    name={`${idPrefix}-correct`}
                    checked={option.isCorrect}
                    onChange={() => selectCorrectAnswer(index)}
                    aria-label={`Đáp án ${option.label} đúng`}
                    className="size-4 accent-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2"
                  />
                  Đáp án {option.label}
                  {option.isCorrect && <span className="ml-auto text-xs text-emerald-700 dark:text-emerald-400">Đúng</span>}
                </label>
                <Label htmlFor={`${idPrefix}-option-${index}`} className="sr-only">Nội dung đáp án {option.label}</Label>
                <Input
                  id={`${idPrefix}-option-${index}`}
                  name={`${idPrefix}-option-${index}`}
                  autoComplete="off"
                  value={option.text}
                  onChange={(event) => onChange({
                    ...value,
                    options: value.options.map((item, itemIndex) => itemIndex === index ? { ...item, text: event.target.value } : item),
                  })}
                  placeholder={`Nhập đáp án ${option.label}…`}
                  className="h-10 text-sm"
                  aria-required="true"
                  aria-invalid={Boolean(textError)}
                  aria-describedby={textError ? `${idPrefix}-option-${index}-error` : undefined}
                />
                {textError && <p id={`${idPrefix}-option-${index}-error`} role="alert" className="text-xs text-destructive">{textError}</p>}
              </div>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-explanation`}>Giải thích đáp án <span className="font-normal text-muted-foreground">(không bắt buộc)</span></Label>
        <Textarea
          id={`${idPrefix}-explanation`}
          name={`${idPrefix}-explanation`}
          autoComplete="off"
          value={value.explanation}
          onChange={(event) => onChange({ ...value, explanation: event.target.value })}
          placeholder="Giải thích vì sao đáp án này chính xác…"
          rows={2}
          className="resize-y text-sm"
        />
      </div>
    </fieldset>
  );
}

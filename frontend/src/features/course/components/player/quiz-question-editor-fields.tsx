'use client';

import type React from 'react';
import { QuizQuestionFields } from './quiz-question-fields';
import { QuizTimeInput, type QuizTimeInputProps } from './quiz-time-input';

type TimingField = Pick<QuizTimeInputProps, 'value' | 'onChange' | 'onBlur' | 'error' | 'inputRef'>;

interface QuizQuestionEditorFieldsProps extends React.ComponentProps<typeof QuizQuestionFields> {
  timestamp: TimingField;
  explanationTimestamp: TimingField;
  duration?: number;
}

/** The same question editor is used by the Quiz tab and the video timeline. */
export function QuizQuestionEditorFields({
  timestamp,
  explanationTimestamp,
  duration,
  ...questionProps
}: QuizQuestionEditorFieldsProps): React.JSX.Element {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <QuizTimeInput
          {...timestamp}
          id={`${questionProps.idPrefix}-timestamp`}
          label="Thời điểm xuất hiện"
          subtext="Mốc video dừng để học viên trả lời câu hỏi"
          icon="lucide:clock-3"
          disabled={questionProps.disabled}
          duration={duration}
        />
        <QuizTimeInput
          {...explanationTimestamp}
          id={`${questionProps.idPrefix}-explanation-timestamp`}
          label="Thời gian giải thích"
          subtext="Mốc video bắt đầu giải thích kiến thức tương ứng"
          icon="lucide:lightbulb"
          disabled={questionProps.disabled}
          duration={duration}
        />
      </div>
      <QuizQuestionFields {...questionProps} />
    </>
  );
}

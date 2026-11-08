import { z } from 'zod';
import { QuizQuestionTypeEnum, type ILessonQuiz } from 'share-lib';

export const quizQuestionFieldsSchema = z.object({
  question: z.string().trim().min(1, 'Vui lòng nhập nội dung câu hỏi.'),
  questionType: z.enum(QuizQuestionTypeEnum),
  options: z.array(z.object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    text: z.string().trim().min(1, 'Vui lòng nhập nội dung đáp án.'),
    isCorrect: z.boolean(),
  })).min(2, 'Cần có ít nhất 2 phương án trả lời.'),
  explanation: z.string().trim(),
}).superRefine((question, context) => {
  const count = question.options.filter((option) => option.isCorrect).length;
  if (count === 0) {
    context.addIssue({ code: 'custom', path: ['options'], message: 'Vui lòng chọn ít nhất một đáp án đúng.' });
  } else if (question.questionType === QuizQuestionTypeEnum.SINGLE && count !== 1) {
    context.addIssue({ code: 'custom', path: ['options'], message: 'Câu hỏi này chỉ được chọn một đáp án đúng.' });
  }
  if (new Set(question.options.map((option) => option.id)).size !== question.options.length ||
      new Set(question.options.map((option) => option.label)).size !== question.options.length) {
    context.addIssue({ code: 'custom', path: ['options'], message: 'Mã và nhãn của các đáp án không được trùng nhau.' });
  }
});

export type QuizQuestionFieldsValue = z.infer<typeof quizQuestionFieldsSchema>;

export function createLessonQuizSchema(duration?: number) {
  return z.object({
    timestamp: z.number().int('Thời gian phải là số giây nguyên.').min(0, 'Thời gian không được âm.')
      .refine((timestamp) => !duration || !Number.isFinite(duration) || timestamp <= duration, {
        message: 'Thời điểm xuất hiện không được vượt quá thời lượng video.',
      }),
    questionData: quizQuestionFieldsSchema,
  });
}

export type LessonQuizFormValues = z.infer<ReturnType<typeof createLessonQuizSchema>>;

export function createQuizQuestionValues(quiz?: ILessonQuiz): QuizQuestionFieldsValue {
  return {
    question: quiz?.question ?? '',
    questionType: quiz?.questionType ?? QuizQuestionTypeEnum.SINGLE,
    options: quiz
      ? quiz.options.map((option) => ({ ...option }))
      : ['A', 'B', 'C', 'D'].map((label) => ({ id: `option-${label}`, label, text: '', isCorrect: false })),
    explanation: quiz?.explanation ?? '',
  };
}

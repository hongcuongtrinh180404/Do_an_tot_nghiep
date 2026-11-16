import {
  isQuizTimestamp,
  QuizQuestionTypeEnum,
  type ILessonQuiz,
  type ILessonQuizAnswer,
  type IStudentLessonQuiz,
} from 'share-lib';

/** Preview revisions are local identifiers, never revisions for the learner submission API. */
export function instructorQuizPreviewRevision(quiz: ILessonQuiz): string {
  return `instructor-preview:${JSON.stringify([quiz.question, quiz.questionType, quiz.options])}`;
}

export function createInstructorQuizPreviews(
  quizzes: ILessonQuiz[],
  answers: ReadonlyMap<string, ILessonQuizAnswer>,
  duration?: number,
): IStudentLessonQuiz[] {
  return quizzes.flatMap((quiz) => {
    if (!isQuizTimestamp(quiz.timestamp, duration)) return [];
    const revision = instructorQuizPreviewRevision(quiz);
    const saved = answers.get(quiz.id);
    const answer = saved?.quizRevision === revision ? saved : null;
    return [{
      id: quiz.id,
      lessonId: quiz.lessonId,
      timestamp: quiz.timestamp,
      order: quiz.order,
      question: quiz.question,
      questionType: quiz.questionType,
      revision,
      options: quiz.options.map(({ id, label, text }) => ({ id, label, text })),
      answer,
      explanation: answer ? quiz.explanation : null,
    }];
  });
}

/** Only call with quizzes from the permission-checked management query. Nothing is persisted. */
export function gradeInstructorQuizPreview(quiz: ILessonQuiz, selectedOptionIds: string[]): ILessonQuizAnswer {
  if (
    selectedOptionIds.length === 0 ||
    new Set(selectedOptionIds).size !== selectedOptionIds.length ||
    selectedOptionIds.some((id) => !quiz.options.some((option) => option.id === id)) ||
    (quiz.questionType === QuizQuestionTypeEnum.SINGLE && selectedOptionIds.length !== 1)
  ) {
    throw new Error('Phương án trả lời không hợp lệ.');
  }
  const correctOptionIds = quiz.options.filter((option) => option.isCorrect).map((option) => option.id);
  return {
    quizId: quiz.id,
    quizRevision: instructorQuizPreviewRevision(quiz),
    selectedOptionIds: [...selectedOptionIds],
    isCorrect: selectedOptionIds.length === correctOptionIds.length &&
      selectedOptionIds.every((id) => correctOptionIds.includes(id)),
    correctOptionIds,
    submittedAt: new Date().toISOString(),
  };
}

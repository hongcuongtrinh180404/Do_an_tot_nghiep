import { createHash } from 'node:crypto';
import { isQuizTimestamp } from 'share-lib';
export function contentVersion(value) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
export function quizRevision(quiz) {
    return contentVersion({
        question: quiz.question.trim(),
        questionType: quiz.questionType,
        options: quiz.options.map((option) => ({
            id: option.id, text: option.text.trim(), isCorrect: option.isCorrect,
        })).sort((a, b) => a.id.localeCompare(b.id)),
    });
}
export function studentQuiz(quiz, answer = null) {
    if (!isQuizTimestamp(quiz.timestamp))
        throw new Error('Cannot expose an unscheduled quiz to learners');
    return {
        id: quiz.id, lessonId: quiz.lessonId, timestamp: quiz.timestamp, order: quiz.order,
        question: quiz.question, questionType: quiz.questionType, revision: quizRevision(quiz),
        options: quiz.options.map(({ id, label, text }) => ({ id, label, text })),
        answer, explanation: answer ? quiz.explanation : null,
        ...(answer ? { explanationTimestamp: quiz.explanationTimestamp ?? null } : {}),
    };
}
//# sourceMappingURL=lesson-quiz-version.util.js.map
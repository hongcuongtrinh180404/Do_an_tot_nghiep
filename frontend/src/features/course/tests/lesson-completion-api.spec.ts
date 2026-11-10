import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import type { AxiosAdapter } from 'axios';
import { LearningStatusEnum, QuizQuestionTypeEnum, type ILessonCompletion, type ILessonCompletionSummary } from 'share-lib';
import { apiClient } from '../../../lib/api-client';
import { cacheLessonCompletion, lessonCompletionApi, lessonCompletionKeys, mergeLessonCompletion } from '../api/lesson-completion.api';

function completion(): ILessonCompletion {
  return { courseId: 'course', lessonId: 'lesson', status: LearningStatusEnum.COMPLETED,
    completedQuestions: 2, totalQuestions: 2, quizzesVersion: 'set', mediaVersion: 'media', videoEnded: false, quizzes: [] };
}

describe('Lesson completion API', () => {
  const originalAdapter = apiClient.defaults.adapter;
  afterEach(() => { apiClient.defaults.adapter = originalAdapter; });

  it('isolates learner results and updates the lesson list without modifying watch-time progress', () => {
    const client = new QueryClient();
    const initial: ILessonCompletionSummary = { lessonId: 'lesson', status: LearningStatusEnum.IN_PROGRESS, totalQuestions: 2, completedQuestions: 1 };
    client.setQueryData(lessonCompletionKeys.course('student-a', 'course'), [initial]);
    client.setQueryData(['learning-progress', 'student-a', 'course', 'course'], { watchedMs: 1000 });
    cacheLessonCompletion(client, 'student-a', completion());
    assert.equal(client.getQueryData<ILessonCompletionSummary[]>(lessonCompletionKeys.course('student-a', 'course'))?.[0].status, LearningStatusEnum.COMPLETED);
    assert.equal(client.getQueryData(lessonCompletionKeys.lesson('student-b', 'course', 'lesson')), undefined);
    assert.deepEqual(client.getQueryData(['learning-progress', 'student-a', 'course', 'course']), { watchedMs: 1000 });
    client.clear();
  });

  it('submits selections and the current question version, never a client-computed score', async () => {
    let sent: Record<string, unknown> | undefined;
    apiClient.defaults.adapter = (async (config) => {
      sent = JSON.parse(config.data as string);
      assert.equal(config.url, '/learning-progress/courses/course/lessons/lesson/quiz-answers');
      return { data: { data: completion() }, status: 200, statusText: 'OK', headers: {}, config };
    }) as AxiosAdapter;
    await lessonCompletionApi.submit('course', 'lesson', { quizId: 'quiz', quizRevision: 'revision', selectedOptionIds: ['b'] });
    assert.deepEqual(sent, { quizId: 'quiz', quizRevision: 'revision', selectedOptionIds: ['b'] });
    assert.equal(sent && 'isCorrect' in sent, false);
  });

  it('does not turn a failed persistence response into completion', async () => {
    apiClient.defaults.adapter = (async () => { throw new Error('offline'); }) as AxiosAdapter;
    await assert.rejects(lessonCompletionApi.submit('course', 'lesson', { quizId: 'quiz', quizRevision: 'revision', selectedOptionIds: ['b'] }), /offline/);
  });

  it('passes cancellation signals to reads so late pre-submission responses can be discarded', async () => {
    const controller = new AbortController();
    apiClient.defaults.adapter = (async (config) => {
      assert.equal(config.signal, controller.signal);
      return { data: { data: completion() }, status: 200, statusText: 'OK', headers: {}, config };
    }) as AxiosAdapter;
    assert.deepEqual(await lessonCompletionApi.getLesson('course', 'lesson', controller.signal), completion());
  });

  it('never erases a confirmed answer when an older poll or video-end response arrives late', () => {
    const previous: ILessonCompletion = { ...completion(), totalQuestions: 1, completedQuestions: 1, quizzes: [{
      id: 'quiz', lessonId: 'lesson', revision: 'revision', timestamp: 192, order: 1, question: 'Câu hỏi',
      questionType: QuizQuestionTypeEnum.SINGLE, options: [{ id: 'a', label: 'A', text: 'Đáp án' }],
      answer: { quizId: 'quiz', quizRevision: 'revision', selectedOptionIds: ['a'], isCorrect: true, correctOptionIds: ['a'], submittedAt: '2026-11-10' },
    }] };
    const older: ILessonCompletion = { ...previous, completedQuestions: 0, status: LearningStatusEnum.NOT_STARTED,
      quizzes: previous.quizzes.map((quiz) => ({ ...quiz, answer: null })) };
    const merged = mergeLessonCompletion(previous, older);
    assert.equal(merged.completedQuestions, 1);
    assert.equal(merged.status, LearningStatusEnum.COMPLETED);
    assert.ok(merged.quizzes[0].answer);
    // Changed requirements must still revoke completion; this is not an optimistic completion flag.
    const updated = mergeLessonCompletion(previous, { ...older, quizzesVersion: 'new-set' });
    assert.equal(updated.status, LearningStatusEnum.NOT_STARTED);
    assert.equal(updated.quizzes[0].answer, null);
  });
});

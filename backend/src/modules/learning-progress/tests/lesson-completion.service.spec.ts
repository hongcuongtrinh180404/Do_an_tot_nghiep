import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { LearningStatusEnum, LessonContentTypeEnum, QuizQuestionTypeEnum, type ILesson, type ILessonQuiz, type ILessonQuizAnswer } from 'share-lib';
import { LessonCompletionService } from '../services/lesson-completion.service.js';
import { LessonCompletionRepository } from '../repositories/lesson-completion.repository.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { SectionRepository } from '../../course/repositories/section.repository.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LessonQuizRepository } from '../../course/repositories/lesson-quiz.repository.js';
import { quizRevision, studentQuiz } from '../../course/utils/lesson-quiz-version.util.js';
import { CompleteLessonVideoDto, SubmitLessonQuizAnswerDto } from '../dto/lesson-completion.dto.js';
import { LessonQuizAnswerSchema, LessonVideoCompletionSchema } from '../schemas/lesson-completion.schema.js';

const userId = '607f1f77bcf86cd799439010';
const courseId = '607f1f77bcf86cd799439011';
const lessonId = '607f1f77bcf86cd799439012';
const quizId = '607f1f77bcf86cd799439013';

function question(id = quizId, timestamp = 192): ILessonQuiz {
  return { id, lessonId, timestamp, order: 1, question: 'Câu hỏi kiểm tra', questionType: QuizQuestionTypeEnum.SINGLE,
    options: [{ id: 'a', label: 'A', text: 'Đúng', isCorrect: true }, { id: 'b', label: 'B', text: 'Sai', isCorrect: false }], explanation: 'Giải thích đáp án' };
}

function harness() {
  const answers = new Map<string, ILessonQuizAnswer>();
  const ended = new Set<string>();
  const official = [question()];
  const lesson = { id: lessonId, sectionId: 'section', content: { type: LessonContentTypeEnum.VIDEO, url: '/video.mp4', duration: 600 } } as ILesson;
  const repo = {
    findAnswers: vi.fn(async (user: string) => [...answers.entries()].filter(([key]) => key.startsWith(`${user}:`)).map(([, answer]) => answer)),
    saveAnswer: vi.fn(async (user: string, _course: string, _lesson: string, answer: ILessonQuizAnswer) => {
      const key = `${user}:${answer.quizId}:${answer.quizRevision}`;
      if (!answers.has(key)) answers.set(key, answer);
    }),
    hasVideoEnded: vi.fn(async (user: string, _lesson: string, version: string) => ended.has(`${user}:${version}`)),
    saveVideoEnded: vi.fn(async (user: string, _course: string, _lesson: string, version: string) => { ended.add(`${user}:${version}`); }),
    findAnswersForCourse: vi.fn(async (user: string) => [...answers.entries()].filter(([key]) => key.startsWith(`${user}:`))
      .map(([, answer]) => ({ ...answer, lessonId }))),
    findVideoCompletionsForCourse: vi.fn(async (user: string) => [...ended].filter((key) => key.startsWith(`${user}:`))
      .map((key) => ({ lessonId, mediaVersion: key.slice(user.length + 1) }))),
  };
  const enrollment = { findByUserAndCourse: vi.fn(async () => ({ deletedAt: null })) };
  const courses = { findById: vi.fn(async () => ({ id: courseId, instructorId: userId })) };
  const sections = { findById: vi.fn(async () => ({ courseId })), findByCourseId: vi.fn(async () => [{ id: 'section' }]) };
  const lessons = { findById: vi.fn(async () => lesson), findBySectionIds: vi.fn(async () => [lesson]) };
  const quizzes = {
    findByLessonId: vi.fn(async () => official),
    findByLessonIds: vi.fn(async () => official),
    findById: vi.fn(async (id: string) => official.find((quiz) => quiz.id === id) ?? null),
  };
  const service = new LessonCompletionService(repo as unknown as LessonCompletionRepository,
    enrollment as unknown as EnrollmentRepository, courses as unknown as CourseRepository,
    sections as unknown as SectionRepository, lessons as unknown as LessonRepository, quizzes as unknown as LessonQuizRepository);
  const submit = (selectedOptionIds = ['b'], quiz = official[0]) => service.submitAnswer(userId, courseId, lessonId, {
    quizId: quiz.id, quizRevision: quizRevision(quiz), selectedOptionIds,
  });
  return { service, repo, enrollment, courses, sections, lessons, quizzes, official, lesson, answers, submit };
}

describe('Lesson completion', () => {
  let h: ReturnType<typeof harness>;
  beforeEach(() => { h = harness(); });

  it('counts a wrong but successfully saved answer as completion without requiring video end', async () => {
    const result = await h.submit(['b']);
    expect(result.status).toBe(LearningStatusEnum.COMPLETED);
    expect(result.videoEnded).toBe(false);
    expect(result.quizzes[0].answer?.isCorrect).toBe(false);
    expect(result.quizzes[0].answer?.correctOptionIds).toEqual(['a']);
  });

  it('does not expose correct options or explanations before a saved answer', async () => {
    const state = await h.service.getLesson(userId, courseId, lessonId);
    expect(state.quizzes[0].answer).toBeNull();
    expect(state.quizzes[0].explanation).toBeNull();
    expect(state.quizzes[0].options.every((option) => !('isCorrect' in option))).toBe(true);
    expect(studentQuiz(h.official[0]).explanation).toBeNull();
  });

  it('retains the first saved answer when the learner submits repeatedly or concurrently', async () => {
    await h.submit(['b']);
    const results = await Promise.all([h.submit(['a']), h.submit(['a'])]);
    expect(h.answers.size).toBe(1);
    expect(results.every((result) => result.quizzes[0].answer?.selectedOptionIds[0] === 'b')).toBe(true);
  });

  it('never confirms completion after a failed save', async () => {
    h.repo.saveAnswer.mockRejectedValueOnce(new Error('offline'));
    await expect(h.submit()).rejects.toThrow('offline');
    expect((await h.service.getLesson(userId, courseId, lessonId)).status).toBe(LearningStatusEnum.NOT_STARTED);
  });

  it('requires all questions but keeps previously submitted questions across reloads', async () => {
    h.official.push(question('607f1f77bcf86cd799439014', 254));
    expect((await h.submit()).status).toBe(LearningStatusEnum.IN_PROGRESS);
    const restored = await h.service.getLesson(userId, courseId, lessonId);
    expect(restored.completedQuestions).toBe(1);
    expect(restored.quizzes[1].answer).toBeNull();
    expect((await h.submit(['a'], h.official[1])).status).toBe(LearningStatusEnum.COMPLETED);
  });

  it('isolates answers by student', async () => {
    await h.submit();
    expect((await h.service.getLesson('other-user', courseId, lessonId)).completedQuestions).toBe(0);
  });

  it('invalidates completion when an instructor adds or changes a question', async () => {
    await h.submit();
    const previous = structuredClone(h.official[0]);
    h.official[0].question = 'Câu hỏi đã được sửa';
    expect((await h.service.getLesson(userId, courseId, lessonId)).status).toBe(LearningStatusEnum.IN_PROGRESS);
    await expect(h.service.submitAnswer(userId, courseId, lessonId, {
      quizId, quizRevision: quizRevision(previous), selectedOptionIds: ['a'],
    })).rejects.toThrow(ConflictException);
    await h.submit();
    expect(h.answers.size).toBe(2);
    h.official.push(question('607f1f77bcf86cd799439014', 254));
    expect((await h.service.getLesson(userId, courseId, lessonId)).status).toBe(LearningStatusEnum.IN_PROGRESS);
  });

  it('does not invalidate completion for timing, ordering, label or explanation changes', async () => {
    await h.submit();
    h.official[0].timestamp = 250;
    h.official[0].order = 5;
    h.official[0].explanation = 'Lời giải cập nhật';
    h.official[0].options[0].label = '1';
    expect((await h.service.getLesson(userId, courseId, lessonId)).status).toBe(LearningStatusEnum.COMPLETED);
  });

  it('invalidates changed options, question type and answer keys', () => {
    const original = question();
    for (const changed of [
      { ...original, questionType: QuizQuestionTypeEnum.MULTIPLE },
      { ...original, options: original.options.map((option) => ({ ...option, isCorrect: !option.isCorrect })) },
      { ...original, options: original.options.map((option) => ({ ...option, text: `${option.text} mới` })) },
    ]) expect(quizRevision(changed)).not.toBe(quizRevision(original));
  });

  it('uses the newest requirements even if an author edits during answer persistence', async () => {
    h.repo.saveAnswer.mockImplementationOnce(async () => { h.official[0].question = 'Nội dung mới'; });
    const saved = await h.submit();
    expect(saved.status).not.toBe(LearningStatusEnum.COMPLETED);
    expect(saved.quizzes[0].answer).toBeNull();
  });

  it('removes deleted questions from the requirements', async () => {
    h.official.push(question('607f1f77bcf86cd799439014', 254));
    await h.submit();
    h.official.pop();
    expect((await h.service.getLesson(userId, courseId, lessonId)).status).toBe(LearningStatusEnum.COMPLETED);
  });

  it('does not automatically complete an empty quiz list; video end must be saved', async () => {
    h.official.length = 0;
    const initial = await h.service.getLesson(userId, courseId, lessonId);
    expect(initial.status).toBe(LearningStatusEnum.NOT_STARTED);
    const finished = await h.service.videoEnded(userId, courseId, lessonId, { mediaVersion: initial.mediaVersion, positionSeconds: 600 });
    expect(finished.status).toBe(LearningStatusEnum.COMPLETED);
    h.lesson.content!.url = '/replacement.mp4';
    expect((await h.service.getLesson(userId, courseId, lessonId)).status).toBe(LearningStatusEnum.NOT_STARTED);
  });

  it('does not let video end bypass outstanding quizzes', async () => {
    const state = await h.service.getLesson(userId, courseId, lessonId);
    const result = await h.service.videoEnded(userId, courseId, lessonId, { mediaVersion: state.mediaVersion, positionSeconds: 600 });
    expect(result.status).not.toBe(LearningStatusEnum.COMPLETED);
  });

  it('rejects stale media and invalid final positions', async () => {
    const state = await h.service.getLesson(userId, courseId, lessonId);
    await expect(h.service.videoEnded(userId, courseId, lessonId, { mediaVersion: 'old', positionSeconds: 600 })).rejects.toThrow(ConflictException);
    for (const positionSeconds of [0, 300, 700, Infinity, NaN]) {
      await expect(h.service.videoEnded(userId, courseId, lessonId, { mediaVersion: state.mediaVersion, positionSeconds })).rejects.toThrow(BadRequestException);
    }
    expect(h.repo.saveVideoEnded).not.toHaveBeenCalled();
  });

  it.each([[], ['a', 'a'], ['unknown'], ['a', 'b']].map((selected) => ({ selected })))('rejects invalid selected options: $selected', async ({ selected }) => {
    await expect(h.submit(selected)).rejects.toThrow(BadRequestException);
    expect(h.repo.saveAnswer).not.toHaveBeenCalled();
  });

  it('requires all and only correct options when grading a multiple-answer question', async () => {
    h.official[0].questionType = QuizQuestionTypeEnum.MULTIPLE;
    h.official[0].options[1].isCorrect = true;
    const result = await h.submit(['a']);
    expect(result.quizzes[0].answer?.isCorrect).toBe(false);
    expect(result.status).toBe(LearningStatusEnum.COMPLETED);
  });

  it('checks enrollment rather than course authorship', async () => {
    h.enrollment.findByUserAndCourse.mockResolvedValueOnce(null as never);
    await expect(h.submit()).rejects.toThrow(ForbiddenException);
    expect(h.repo.saveAnswer).not.toHaveBeenCalled();
  });

  it('rejects a lesson from another course and a question from another lesson', async () => {
    h.sections.findById.mockResolvedValueOnce({ courseId: 'other-course' });
    await expect(h.submit()).rejects.toThrow(NotFoundException);
    h.official[0].lessonId = 'other-lesson';
    await expect(h.submit()).rejects.toThrow(NotFoundException);
  });

  it('returns a per-lesson summary without quiz answers', async () => {
    await h.submit();
    expect(await h.service.getLessons(userId, courseId)).toEqual([
      { lessonId, status: LearningStatusEnum.COMPLETED, totalQuestions: 1, completedQuestions: 1 },
    ]);
  });

  it('enforces unique database keys for repeated answers and video-end deliveries', () => {
    expect(LessonQuizAnswerSchema.indexes()).toContainEqual([
      { userId: 1, lessonId: 1, quizId: 1, quizRevision: 1 }, expect.objectContaining({ unique: true }),
    ]);
    expect(LessonVideoCompletionSchema.indexes()).toContainEqual([
      { userId: 1, lessonId: 1, mediaVersion: 1 }, expect.objectContaining({ unique: true }),
    ]);
  });

  it('validates API input without accepting a client-provided correctness flag', async () => {
    const dto = Object.assign(new SubmitLessonQuizAnswerDto(), { quizId, quizRevision: 'a'.repeat(64), selectedOptionIds: ['a'] });
    expect(await validate(dto)).toEqual([]);
    dto.selectedOptionIds = ['a', 'a'];
    expect((await validate(dto)).length).toBeGreaterThan(0);
    const end = Object.assign(new CompleteLessonVideoDto(), { mediaVersion: 'a'.repeat(64), positionSeconds: NaN });
    expect((await validate(end)).length).toBeGreaterThan(0);
  });
});

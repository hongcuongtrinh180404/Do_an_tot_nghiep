import { randomUUID } from 'node:crypto';
import mongoose, { Types, type Connection } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CourseStatusEnum, LearningStatusEnum, QuizQuestionTypeEnum } from 'share-lib';
import { CourseEntity, CourseSchema } from '../../course/schemas/course.schema.js';
import { SectionEntity, SectionSchema } from '../../course/schemas/section.schema.js';
import { LessonEntity, LessonSchema } from '../../course/schemas/lesson.schema.js';
import { LessonQuizEntity, LessonQuizSchema } from '../../course/schemas/lesson-quiz.schema.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { SectionRepository } from '../../course/repositories/section.repository.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LessonQuizRepository } from '../../course/repositories/lesson-quiz.repository.js';
import { EnrollmentEntity, EnrollmentSchema } from '../../enrollment/schemas/enrollment.schema.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import { LearningProgressEntity, LearningProgressSchema } from '../../learning-progress/schemas/learning-progress.schema.js';
import { LessonQuizAnswerEntity, LessonQuizAnswerSchema, LessonVideoCompletionEntity, LessonVideoCompletionSchema } from '../../learning-progress/schemas/lesson-completion.schema.js';
import { LearningProgressRepository } from '../../learning-progress/repositories/learning-progress.repository.js';
import { LessonCompletionRepository } from '../../learning-progress/repositories/lesson-completion.repository.js';
import { LessonCompletionService } from '../../learning-progress/services/lesson-completion.service.js';
import { LearningProgressService } from '../../learning-progress/services/learning-progress.service.js';
import { contentVersion, quizRevision } from '../../course/utils/lesson-quiz-version.util.js';
import { ChatbotMyCoursesRepository } from '../repositories/chatbot-my-courses.repository.js';
import { ChatbotLearningReadService } from '../services/chatbot-learning-read.service.js';

// All fixture writes are confined to this unique loopback database.
describe.skipIf(process.env.CHATBOT_SEARCH_DB_TESTS !== 'true')('Personal learning — real Mongo and completion rules', () => {
  const dbName = `chatbot_learning_test_${randomUUID().replaceAll('-', '')}`;
  const a = new Types.ObjectId();
  const b = new Types.ObjectId();
  const courseIds = Array.from({ length: 8 }, () => new Types.ObjectId());
  const sectionIds = courseIds.map(() => new Types.ObjectId());
  const lessonIds = Array.from({ length: 5 }, () => new Types.ObjectId());
  let connection: Connection;
  let service: ChatbotLearningReadService;
  let progressService: LearningProgressService;

  beforeAll(async () => {
    connection = await mongoose.createConnection('mongodb://127.0.0.1:27017', {
      dbName, autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 3000,
    }).asPromise();
    const courses = connection.model(CourseEntity.name, CourseSchema);
    const sections = connection.model(SectionEntity.name, SectionSchema);
    const lessons = connection.model(LessonEntity.name, LessonSchema);
    const quizzes = connection.model(LessonQuizEntity.name, LessonQuizSchema);
    const enrollments = connection.model(EnrollmentEntity.name, EnrollmentSchema);
    const states = connection.model(LearningProgressEntity.name, LearningProgressSchema);
    const answers = connection.model(LessonQuizAnswerEntity.name, LessonQuizAnswerSchema);
    const videos = connection.model(LessonVideoCompletionEntity.name, LessonVideoCompletionSchema);
    const courseRepo = new CourseRepository(courses);
    const sectionRepo = new SectionRepository(sections);
    const lessonRepo = new LessonRepository(lessons);
    const enrollmentRepo = new EnrollmentRepository(enrollments);
    const completion = new LessonCompletionService(new LessonCompletionRepository(answers, videos),
      enrollmentRepo, courseRepo, sectionRepo, lessonRepo, new LessonQuizRepository(quizzes));
    progressService = new LearningProgressService(new LearningProgressRepository(states), enrollmentRepo,
      courseRepo, lessonRepo, completion);
    service = new ChatbotLearningReadService(new ChatbotMyCoursesRepository(enrollments, lessons), progressService);

    await courses.collection.insertMany(courseIds.map((_id, i) => ({
      _id, title: ['Python cơ bản', 'Python nâng cao', 'Quiz đã hoàn thành', 'Chỉ tài liệu', 'Khóa đã ẩn', 'Khóa đã xóa', 'Khóa người khác', 'Quyền đã thu hồi'][i],
      status: i === 4 ? CourseStatusEnum.DRAFT : CourseStatusEnum.PUBLISHED,
      deletedAt: i === 5 ? new Date() : null,
      description: 'private-description', instructorId: b, price: 100000,
    })));
    await sections.collection.insertMany(sectionIds.map((_id, i) => ({ _id, courseId: courseIds[i], deletedAt: null, order: 1 })));
    await lessons.collection.insertMany(lessonIds.map((_id, i) => ({
      _id, sectionId: sectionIds[i < 2 ? 0 : i - 1], title: `Bài video ${i + 1}`,
      order: i, deletedAt: null, content: { type: 'video', url: `https://media.example/${i}.mp4`, duration: 60 },
    })));
    // Remove the video from the document-only course.
    await lessons.collection.updateOne({ _id: lessonIds[4] }, { $set: { 'content.type': 'document' } });
    await enrollments.collection.insertMany([
      ...courseIds.filter((_id, i) => i !== 6).map((courseId, i) => ({
        userId: a, courseId, orderId: null, enrolledAt: new Date(Date.UTC(2026, 0, 10 - i)),
        deletedAt: courseId.equals(courseIds[7]) ? new Date() : null,
      })),
      { userId: b, courseId: courseIds[0], enrolledAt: new Date(), deletedAt: null },
      { userId: b, courseId: courseIds[6], enrolledAt: new Date(), deletedAt: null },
    ]);
    await videos.collection.insertMany([0, 2].map((i) => ({
      userId: a, courseId: courseIds[i === 0 ? 0 : 1], lessonId: lessonIds[i], deletedAt: null,
      mediaVersion: contentVersion({ url: `https://media.example/${i}.mp4`, publicId: null }), endedAt: new Date(),
    })));
    const quiz = {
      _id: new Types.ObjectId(), lessonId: lessonIds[3], timestamp: 10, order: 1, question: 'Câu hỏi thật?',
      questionType: QuizQuestionTypeEnum.SINGLE,
      options: [{ id: 'a', label: 'A', text: 'Đáp án', isCorrect: true }],
      deletedAt: null,
    };
    await quizzes.collection.insertOne(quiz);
    await answers.collection.insertOne({
      userId: a, courseId: courseIds[2], lessonId: lessonIds[3], quizId: quiz._id,
      quizRevision: quizRevision(quiz), selectedOptionIds: ['a'], isCorrect: true,
      correctOptionIds: ['a'], submittedAt: new Date(), deletedAt: null,
    });
    await states.create({
      userId: a, courseId: courseIds[0], watchedMs: 90000,
      lastLessonId: lessonIds[0], lastMediaUrl: 'https://media.example/0.mp4', lastPositionSeconds: 25,
    });
    await states.create({ userId: b, courseId: courseIds[0], watchedMs: 3000 });
  });
  afterAll(async () => {
    if (connection) { await connection.dropDatabase(); await connection.close(); }
  });

  it('lists only active ownership, including unpublished owned courses, with safe projections', async () => {
    const result = await service.list(String(a), { page: 1, limit: 10 });
    expect(result.total).toBe(5);
    expect(result.items.map((c) => c.id)).toEqual(courseIds.slice(0, 5).map(String));
    expect(result.items[4].url).toBe('/my-courses');
    expect(JSON.stringify(result)).not.toContain('private-description');
    expect(JSON.stringify(result)).not.toContain('https://media.example');
    expect(result.items[0].resumeUrl).toBe(`/courses/${courseIds[0]}/lessons/${lessonIds[0]}`);
  });
  it('uses exact shared progress rules, including answers without any playback record', async () => {
    const result = await service.list(String(a), { page: 1, limit: 10 });
    const shared = await progressService.getProgressForCourses(String(a), result.items.map((c) => c.id));
    for (const item of result.items) {
      const expected = shared.find((p) => p.courseId === item.id)!;
      expect(item.progress).toMatchObject({
        progressPercent: expected.progressPercent, completedLessons: expected.completedLessons, status: expected.status,
      });
    }
    expect(result.items[0].progress).toMatchObject({ progressPercent: 50, completedLessons: 1, totalLessons: 2 });
    expect(result.items[2].progress).toMatchObject({ progressPercent: 100, status: LearningStatusEnum.COMPLETED, watchedMs: 0 });
    expect(result.items[3].progress.progressPercent).toBeNull();
  });
  it('filters before pagination and counts across the full enrollment list', async () => {
    const first = await service.list(String(a), { page: 1, limit: 1, learningStatus: LearningStatusEnum.COMPLETED });
    const second = await service.list(String(a), { page: 2, limit: 1, learningStatus: LearningStatusEnum.COMPLETED });
    expect(first).toMatchObject({ total: 2, hasMore: true });
    expect(second).toMatchObject({ total: 2, hasMore: false });
    expect(first.items[0].id).not.toBe(second.items[0].id);
    expect(await service.overview(String(a))).toEqual({ scope: 'overview', totalCourses: 5, notStarted: 2, inProgress: 1, completed: 2 });
  });
  it('isolates learners of the same course, refuses foreign and revoked ownership', async () => {
    const other = await service.detail(String(b), String(courseIds[0]));
    expect(other).toMatchObject({ scope: 'course', course: { progress: { progressPercent: 0, watchedMs: 3000 } } });
    for (const i of [5, 6, 7]) expect(await service.detail(String(a), String(courseIds[i]))).toEqual({ scope: 'not_owned' });
    expect(await service.overview(String(new Types.ObjectId()))).toMatchObject({ totalCourses: 0 });
  });
  it('resolves literal ambiguous names and rejects regex interpretation', async () => {
    const result = await service.candidates(String(a), 'Python', 1, 1);
    expect(result).toMatchObject({ total: 2, hasMore: true, page: 1 });
    expect((await service.candidates(String(a), '.*', 1, 5)).total).toBe(0);
  });
  it('reads the resume title and reacts to replaced media without changing stored playback', async () => {
    expect(await service.detail(String(a), String(courseIds[0]))).toMatchObject({
      scope: 'course', lastLessonTitle: 'Bài video 1', remainingLessons: 1,
    });
    await connection.collection('lessons').updateOne({ _id: lessonIds[0] }, { $set: { 'content.url': 'https://media.example/replaced.mp4' } });
    try {
      expect(await service.detail(String(a), String(courseIds[0]))).toMatchObject({
        scope: 'course', lastLessonTitle: null, course: { resumeUrl: null, progress: { progressPercent: 0, watchedMs: 90000 } },
      });
    } finally {
      await connection.collection('lessons').updateOne({ _id: lessonIds[0] }, { $set: { 'content.url': 'https://media.example/0.mp4' } });
    }
  });
  it('performs no business writes across list, overview, selection and detail', async () => {
    const names = ['enrollments', 'learning_progress', 'lesson_quiz_answers', 'lesson_video_completions', 'courses', 'lessons'];
    const snapshot = () => Promise.all(names.map((name) => connection.collection(name).find({}).sort({ _id: 1 }).toArray()));
    const before = await snapshot();
    await service.list(String(a), { page: 1, limit: 3 });
    await service.overview(String(a));
    await service.candidates(String(a), 'Python', 1, 5);
    await service.detail(String(a), String(courseIds[0]));
    expect(await snapshot()).toEqual(before);
  });
  it('continues across bounded batches without losing same-date ties or reporting partial totals', async () => {
    const user = new Types.ObjectId();
    const extra = Array.from({ length: 53 }, (_, i) => ({ _id: new Types.ObjectId(), title: `Batch ${i}`, deletedAt: null, status: CourseStatusEnum.PUBLISHED }));
    await connection.collection('courses').insertMany(extra);
    await connection.collection('enrollments').insertMany(extra.map((c) => ({
      userId: user, courseId: c._id, enrolledAt: new Date('2026-01-01'), deletedAt: null,
    })));
    const tail = await service.list(String(user), { page: 6, limit: 10, learningStatus: LearningStatusEnum.NOT_STARTED });
    expect(tail).toMatchObject({ total: 53, hasMore: false });
    expect(tail.items).toHaveLength(3);
    expect(await service.overview(String(user))).toMatchObject({ totalCourses: 53, notStarted: 53 });
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose, { type Model, Types } from 'mongoose';
import type { ClsService } from 'nestjs-cls';
import { NotFoundException } from '@nestjs/common';
import {
  CourseLevelEnum, CourseStatusEnum, LearningStatusEnum, LessonContentTypeEnum,
  OrderStatusEnum, ReviewStatusEnum, RoleEnum, UserStatusEnum,
} from 'share-lib';
import { UserEntity, UserSchema } from '../../user/schemas/user.schema.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { UserService } from '../../user/services/user.service.js';
import { CourseEntity, CourseSchema } from '../../course/schemas/course.schema.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { CourseCategoryEntity, CourseCategorySchema } from '../../course/schemas/course-category.schema.js';
import { SectionEntity, SectionSchema } from '../../course/schemas/section.schema.js';
import { SectionRepository } from '../../course/repositories/section.repository.js';
import { LessonEntity, LessonSchema } from '../../course/schemas/lesson.schema.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LessonQuizEntity, LessonQuizSchema } from '../../course/schemas/lesson-quiz.schema.js';
import { LessonQuizRepository } from '../../course/repositories/lesson-quiz.repository.js';
import { EnrollmentEntity, EnrollmentSchema } from '../../enrollment/schemas/enrollment.schema.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import { OrderEntity, OrderSchema } from '../../enrollment/schemas/order.schema.js';
import { LearningProgressEntity, LearningProgressSchema } from '../../learning-progress/schemas/learning-progress.schema.js';
import {
  LessonQuizAnswerEntity, LessonQuizAnswerSchema,
  LessonVideoCompletionEntity, LessonVideoCompletionSchema,
} from '../../learning-progress/schemas/lesson-completion.schema.js';
import { LearningProgressRepository } from '../../learning-progress/repositories/learning-progress.repository.js';
import { LessonCompletionRepository } from '../../learning-progress/repositories/lesson-completion.repository.js';
import { LessonCompletionService } from '../../learning-progress/services/lesson-completion.service.js';
import { LearningProgressService } from '../../learning-progress/services/learning-progress.service.js';
import { InstructorRevenueDataError } from '../../payment/utils/instructor-revenue.pipeline.js';
import { AdminUserCoursesRepository } from '../repositories/admin-user-courses.repository.js';
import { AdminUserCoursesService } from '../services/admin-user-courses.service.js';

describe('Admin user courses from isolated MongoDB', () => {
  const dbName = `thc_datn_admin_users_test_${process.pid}`;
  const paidAt = new Date('2026-10-12T08:30:00Z');
  let connection: mongoose.Connection;
  let users: Model<UserEntity>;
  let courses: Model<CourseEntity>;
  let enrollments: Model<EnrollmentEntity>;
  let orders: Model<OrderEntity>;
  let sections: Model<SectionEntity>;
  let lessons: Model<LessonEntity>;
  let progress: Model<LearningProgressEntity>;
  let completion: LessonCompletionService;
  let service: AdminUserCoursesService;
  let teacher: Types.ObjectId;
  let learner: Types.ObjectId;
  let admin: Types.ObjectId;

  beforeAll(async () => {
    connection = await mongoose.createConnection(`mongodb://127.0.0.1:27017/${dbName}`, {
      serverSelectionTimeoutMS: 5000,
    }).asPromise();
    users = connection.model(UserEntity.name, UserSchema);
    courses = connection.model(CourseEntity.name, CourseSchema);
    connection.model(CourseCategoryEntity.name, CourseCategorySchema);
    enrollments = connection.model(EnrollmentEntity.name, EnrollmentSchema);
    orders = connection.model(OrderEntity.name, OrderSchema);
    sections = connection.model(SectionEntity.name, SectionSchema);
    lessons = connection.model(LessonEntity.name, LessonSchema);
    progress = connection.model(LearningProgressEntity.name, LearningProgressSchema);
    const quizzes = connection.model(LessonQuizEntity.name, LessonQuizSchema);
    const answers = connection.model(LessonQuizAnswerEntity.name, LessonQuizAnswerSchema);
    const videos = connection.model(LessonVideoCompletionEntity.name, LessonVideoCompletionSchema);
    await Promise.all([users, courses, enrollments, orders, sections, lessons, progress, quizzes, answers, videos].map((model) => model.init()));
    const enrollmentRepository = new EnrollmentRepository(enrollments);
    const courseRepository = new CourseRepository(courses);
    const lessonRepository = new LessonRepository(lessons);
    completion = new LessonCompletionService(
      new LessonCompletionRepository(answers, videos), enrollmentRepository,
      courseRepository, new SectionRepository(sections), lessonRepository, new LessonQuizRepository(quizzes),
    );
    const learning = new LearningProgressService(
      new LearningProgressRepository(progress), enrollmentRepository, courseRepository, lessonRepository, completion,
    );
    service = new AdminUserCoursesService(
      new UserService(new UserRepository(users), { get: () => 'SYSTEM' } as unknown as ClsService),
      new AdminUserCoursesRepository(courses, enrollments, orders), learning,
    );
  });

  afterAll(async () => {
    if (connection) {
      if (connection.name !== dbName || !dbName.startsWith('thc_datn_admin_users_test_')) {
        throw new Error('Refusing to clean a non-test database');
      }
      await connection.dropDatabase();
      await connection.close();
    }
  });

  beforeEach(async () => {
    await Promise.all(Object.values(connection.collections).map((collection) => collection.deleteMany({})));
    // The native reviews/payments collections are created on demand by some tests.
    await Promise.all(['reviews', 'payments'].map((name) => connection.collection(name).deleteMany({})));
    const accounts = await users.create([
      { email: 'teacher@example.test', username: 'teacher', fullName: 'Teacher', role: RoleEnum.INSTRUCTOR },
      { email: 'learner@example.test', username: 'learner', fullName: 'Learner', role: RoleEnum.STUDENT },
      { email: 'admin@example.test', username: 'admin', fullName: 'Admin', role: RoleEnum.ADMIN },
    ]);
    [teacher, learner, admin] = accounts.map((user) => user._id);
  });

  async function course(owner = teacher, status = CourseStatusEnum.PUBLISHED) {
    const id = new Types.ObjectId();
    return courses.create({
      _id: id, instructorId: owner, title: `Course ${id.toHexString()}`, slug: `course-${id.toHexString()}`,
      status, level: CourseLevelEnum.ALL_LEVELS, price: 900000,
    });
  }

  async function sale(courseId: Types.ObjectId, buyer = learner, overrides: Record<string, unknown> = {}) {
    const id = new Types.ObjectId();
    // Native writes deliberately retain missing historical fields instead of Mongoose defaults.
    await orders.collection.insertOne({
      _id: id, userId: buyer, courseId, instructorId: teacher, orderCode: `ORDER-${id.toHexString()}`,
      amount: 150000, instructorEarnings: 120000, platformEarnings: 30000,
      status: OrderStatusEnum.PAID, paidAt, deletedAt: null, ...overrides,
    });
    return id;
  }

  it.each([RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN])('loads actual enrollments for %s accounts, including banned accounts', async (role) => {
    const id = role === RoleEnum.STUDENT ? learner : role === RoleEnum.INSTRUCTOR ? teacher : admin;
    await users.updateOne({ _id: id }, { $set: { status: UserStatusEnum.BANNED } });
    const registered = await course(admin);
    await enrollments.create({ userId: id, courseId: registered._id, orderId: null });
    expect((await service.getEnrolledCourses(id.toHexString())).map((row) => row.courseId)).toEqual([registered.id]);
  });

  it('keeps each account separate and displays the paid price, not the current course price', async () => {
    const first = await course();
    const second = await course();
    const orderId = await sale(first._id);
    await enrollments.create([
      { userId: learner, courseId: first._id, orderId },
      { userId: admin, courseId: second._id, orderId: null },
    ]);
    const actual = await service.getEnrolledCourses(learner.toHexString());
    expect(actual).toHaveLength(1);
    expect(actual[0]).toMatchObject({
      courseId: first.id, price: 150000, paidAt, paymentStatus: OrderStatusEnum.PAID,
      isFree: false, progressPercent: null, status: LearningStatusEnum.NOT_STARTED,
    });
    expect((await service.getEnrolledCourses(admin.toHexString())).map((row) => row.courseId)).toEqual([second.id]);
    expect(await service.getEnrolledCourses(teacher.toHexString())).toEqual([]);
  });

  it('retains free registrations after a price change and never invents a price for a missing or mismatched order', async () => {
    const free = await course();
    const missing = await course();
    const mismatched = await course();
    const legacy = await course();
    const wrongOrder = await sale(mismatched._id, admin);
    await enrollments.create([
      { userId: learner, courseId: free._id, orderId: null },
      { userId: learner, courseId: missing._id, orderId: new Types.ObjectId() },
      { userId: learner, courseId: mismatched._id, orderId: wrongOrder },
    ]);
    await enrollments.collection.insertOne({
      userId: learner, courseId: legacy._id, enrolledAt: paidAt, deletedAt: null,
    });
    const actual = await service.getEnrolledCourses(learner.toHexString());
    expect(actual.find((row) => row.courseId === free.id)).toMatchObject({ price: 0, isFree: true, paymentStatus: null });
    for (const id of [missing.id, mismatched.id, legacy.id]) {
      expect(actual.find((row) => row.courseId === id)).toMatchObject({ price: null, isFree: false, paymentStatus: null });
    }
  });

  it('only reconstructs a missing payment date from verified and applied payment evidence', async () => {
    const registered = await course();
    const orderId = await sale(registered._id, learner, { paidAt: null });
    await enrollments.create({ userId: learner, courseId: registered._id, orderId });
    expect((await service.getEnrolledCourses(learner.toHexString()))[0].paidAt).toBeNull();
    await connection.collection('payments').insertMany([
      { orderId, transactionDate: new Date('2026-10-01'), deletedAt: null },
      { orderId, transactionDate: paidAt, verifiedAt: paidAt, appliedAt: paidAt, deletedAt: null },
    ]);
    expect((await service.getEnrolledCourses(learner.toHexString()))[0].paidAt).toEqual(paidAt);
  });

  it('includes archived courses but excludes revoked enrollments and deleted courses', async () => {
    const archived = await course(teacher, CourseStatusEnum.ARCHIVED);
    const revoked = await course();
    const deleted = await course();
    await courses.updateOne({ _id: deleted._id }, { $set: { deletedAt: new Date() } });
    await enrollments.create([
      { userId: learner, courseId: archived._id },
      { userId: learner, courseId: revoked._id, deletedAt: new Date() },
      { userId: learner, courseId: deleted._id },
    ]);
    expect((await service.getEnrolledCourses(learner.toHexString())).map((row) => row.courseId)).toEqual([archived.id]);
  });

  it('reads actual per-account lesson results and preserves IN_PROGRESS at 0%', async () => {
    const registered = await course();
    const section = await sections.create({ courseId: registered._id, title: 'Section', order: 0 });
    const video = await lessons.create({
      sectionId: section._id, title: 'Video', order: 0,
      content: { type: LessonContentTypeEnum.VIDEO, url: 'https://example.test/video.mp4', duration: 100 },
    });
    await enrollments.create([
      { userId: learner, courseId: registered._id },
      { userId: admin, courseId: registered._id },
    ]);
    await progress.create({ userId: learner, courseId: registered._id, watchedMs: 20000 });
    expect((await service.getEnrolledCourses(learner.toHexString()))[0]).toMatchObject({
      totalLessons: 1, completedLessons: 0, progressPercent: 0, status: LearningStatusEnum.IN_PROGRESS,
    });
    const state = await completion.getLesson(learner.toHexString(), registered.id, video.id);
    await completion.videoEnded(learner.toHexString(), registered.id, video.id, {
      mediaVersion: state.mediaVersion, positionSeconds: 100,
    });
    expect((await service.getEnrolledCourses(learner.toHexString()))[0]).toMatchObject({
      completedLessons: 1, progressPercent: 100, status: LearningStatusEnum.COMPLETED,
    });
    expect((await service.getEnrolledCourses(admin.toHexString()))[0]).toMatchObject({
      completedLessons: 0, progressPercent: 0, status: LearningStatusEnum.NOT_STARTED,
    });
  });

  it('calculates distinct learners, weighted visible reviews, all real statuses and stored revenue', async () => {
    const first = await course();
    const second = await course(teacher, CourseStatusEnum.DRAFT);
    await course(teacher, CourseStatusEnum.PENDING_APPROVAL);
    await course(teacher, CourseStatusEnum.ARCHIVED);
    await course(admin);
    await enrollments.create([
      { userId: learner, courseId: first._id },
      { userId: learner, courseId: second._id },
      { userId: admin, courseId: first._id },
      { userId: teacher, courseId: first._id, deletedAt: new Date() },
    ]);
    await sale(first._id);
    await sale(first._id, admin, { status: OrderStatusEnum.PENDING });
    await sale(second._id, learner, { amount: 100000, instructorEarnings: 80000, platformEarnings: 20000 });
    await connection.collection('reviews').insertMany([
      ...[5, 5, 2].map((rating) => ({ courseId: first._id, rating, status: ReviewStatusEnum.VISIBLE, deletedAt: null })),
      { courseId: second._id, rating: 4, status: ReviewStatusEnum.VISIBLE, deletedAt: null },
      { courseId: first._id, rating: 1, status: ReviewStatusEnum.HIDDEN, deletedAt: null },
      { courseId: first._id, rating: 1, status: ReviewStatusEnum.VISIBLE, deletedAt: new Date() },
    ]);
    const actual = await service.getTeaching(teacher.toHexString());
    expect(actual.stats).toEqual({
      totalCourses: 4, totalStudents: 2, totalRevenue: 250000, netRevenue: 200000,
      averageRating: 4, totalReviews: 4,
    });
    expect(actual.courses.find((row) => row.id === first.id)).toMatchObject({
      studentCount: 2, revenue: 150000, rating: 4, reviewCount: 3, level: CourseLevelEnum.ALL_LEVELS,
    });
    expect(new Set(actual.courses.map((row) => row.status))).toEqual(new Set(Object.values(CourseStatusEnum)));
    const adminData = await service.getTeaching(admin.toHexString());
    expect(adminData.stats).toMatchObject({ totalCourses: 1, totalStudents: 0, totalRevenue: 0 });
  });

  it('keeps historical revenue with the transaction author after a transfer, deletion or role change', async () => {
    const transferred = await course();
    const deleted = await course();
    await sale(transferred._id);
    await sale(deleted._id, admin);
    await courses.updateOne({ _id: transferred._id }, { $set: { instructorId: admin } });
    await courses.updateOne({ _id: deleted._id }, { $set: { deletedAt: new Date() } });
    await users.updateOne({ _id: teacher }, { $set: { role: RoleEnum.STUDENT } });
    const original = await service.getTeaching(teacher.toHexString());
    expect(original.courses).toEqual([]);
    expect(original.stats).toMatchObject({ totalRevenue: 300000, netRevenue: 240000, totalCourses: 0 });
    expect((await service.getTeaching(admin.toHexString())).stats.totalRevenue).toBe(0);
  });

  it('returns true zero/empty data for a new account and rejects deleted or nonexistent accounts', async () => {
    expect(await service.getEnrolledCourses(learner.toHexString())).toEqual([]);
    expect(await service.getTeaching(learner.toHexString())).toEqual({
      courses: [],
      stats: { totalCourses: 0, totalStudents: 0, totalRevenue: 0, netRevenue: 0, averageRating: 0, totalReviews: 0 },
    });
    await users.updateOne({ _id: learner }, { $set: { deletedAt: new Date() } });
    await expect(service.getEnrolledCourses(learner.toHexString())).rejects.toThrow(NotFoundException);
    await expect(service.getTeaching(new Types.ObjectId().toHexString())).rejects.toThrow(NotFoundException);
  });

  it('does not replace missing stored financial evidence with a guessed commission', async () => {
    const registered = await course();
    await sale(registered._id, learner, { instructorEarnings: null, platformEarnings: null });
    await expect(service.getTeaching(teacher.toHexString())).rejects.toThrow(InstructorRevenueDataError);
    // A financial problem cannot break the independent enrolled-courses endpoint.
    expect(await service.getEnrolledCourses(teacher.toHexString())).toEqual([]);
  });
});

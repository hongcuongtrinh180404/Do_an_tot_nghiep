import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose, { type Model, Types } from 'mongoose';
import { ClsService } from 'nestjs-cls';
import { NotFoundException } from '@nestjs/common';
import { CourseStatusEnum, LessonContentTypeEnum, RoleEnum, UserStatusEnum } from 'share-lib';
import { UserEntity, UserSchema } from '../../user/schemas/user.schema.js';
import { CourseEntity, CourseSchema } from '../../course/schemas/course.schema.js';
import { CourseCategoryEntity, CourseCategorySchema } from '../../course/schemas/course-category.schema.js';
import { EnrollmentEntity, EnrollmentSchema } from '../../enrollment/schemas/enrollment.schema.js';
import { SectionEntity, SectionSchema } from '../../course/schemas/section.schema.js';
import { LessonEntity, LessonSchema } from '../../course/schemas/lesson.schema.js';
import { LearningProgressEntity, LearningProgressSchema } from '../../learning-progress/schemas/learning-progress.schema.js';
import { UserService } from '../../user/services/user.service.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LearningProgressRepository } from '../../learning-progress/repositories/learning-progress.repository.js';
import { PublicProfileService } from '../public-profile.service.js';
import { PublicProfileRepository } from '../public-profile.repository.js';

describe('public profile courses (isolated MongoDB)', () => {
  const dbName = 'thc_datn_public_profile_test';
  let connection: mongoose.Connection;
  let users: Model<UserEntity>;
  let courses: Model<CourseEntity>;
  let enrollments: Model<EnrollmentEntity>;
  let sections: Model<SectionEntity>;
  let lessons: Model<LessonEntity>;
  let progress: Model<LearningProgressEntity>;
  let service: PublicProfileService;
  let userService: UserService;
  let courseRepository: CourseRepository;
  let teacherId: Types.ObjectId;
  let learnerId: Types.ObjectId;
  const sameTime = new Date('2026-01-01T00:00:00Z');

  beforeAll(async () => {
    connection = await mongoose.createConnection(`mongodb://127.0.0.1:27017/${dbName}`).asPromise();
    users = connection.model(UserEntity.name, UserSchema);
    courses = connection.model(CourseEntity.name, CourseSchema);
    enrollments = connection.model(EnrollmentEntity.name, EnrollmentSchema);
    sections = connection.model(SectionEntity.name, SectionSchema);
    lessons = connection.model(LessonEntity.name, LessonSchema);
    progress = connection.model(LearningProgressEntity.name, LearningProgressSchema);
    connection.model(CourseCategoryEntity.name, CourseCategorySchema);
    await Promise.all([users, courses, enrollments, sections, lessons, progress].map((model) => model.init()));
    userService = new UserService(
      new UserRepository(users), { get: () => 'SYSTEM' } as unknown as ClsService,
    );
    courseRepository = new CourseRepository(courses);
    service = new PublicProfileService(
      userService, new PublicProfileRepository(courses, enrollments),
      new LearningProgressRepository(progress), new LessonRepository(lessons),
    );
  });

  afterAll(async () => {
    if (connection) {
      if (connection.name !== dbName) throw new Error('Refusing to clean a non-test database');
      await connection.dropDatabase();
      await connection.close();
    }
  });

  beforeEach(async () => {
    await Promise.all(Object.values(connection.collections).map((collection) => collection.deleteMany({})));
    const teacher = await users.create({
      email: 'teacher@example.test', username: 'teacher', fullName: 'Giảng viên Minh',
      bio: 'Giới thiệu thật của giảng viên.', role: RoleEnum.INSTRUCTOR, status: UserStatusEnum.ACTIVE,
    });
    const learner = await users.create({
      email: 'learner@example.test', username: 'learner', fullName: 'Học viên An', status: UserStatusEnum.ACTIVE,
    });
    teacherId = teacher._id;
    learnerId = learner._id;
  });

  async function addCourse(
    { status = CourseStatusEnum.PUBLISHED, deletedAt = null, enrolled = true, revoked = false, video = true }:
    { status?: CourseStatusEnum; deletedAt?: Date | null; enrolled?: boolean; revoked?: boolean; video?: boolean } = {},
  ) {
    const id = new Types.ObjectId();
    const course = await courses.create({
      _id: id, title: `Khóa học ${id.toHexString()}`, slug: `khoa-hoc-${id.toHexString()}`,
      instructorId: teacherId, status, deletedAt, createdAt: sameTime,
      description: 'private author data must not be spread into the profile',
      reviewedById: new Types.ObjectId(),
    });
    if (enrolled) {
      await enrollments.create({
        userId: learnerId, courseId: id, orderId: new Types.ObjectId(),
        enrolledAt: sameTime, deletedAt: revoked ? new Date() : null,
      });
    }
    if (video) {
      const section = await sections.create({ courseId: id, title: 'Chương đầu', order: 0 });
      await lessons.create({
        sectionId: section._id, title: 'Bài học', order: 0,
        content: { type: LessonContentTypeEnum.VIDEO, url: 'https://example.test/video.mp4', duration: 100 },
      });
    }
    return course;
  }

  it('returns five, five then two courses without duplicates for equal sort timestamps', async () => {
    await Promise.all(Array.from({ length: 12 }, () => addCourse()));
    const first = await service.getCourses('learner', { type: 'learning' });
    expect(first.items).toHaveLength(5);
    expect(first.counts).toEqual({ learning: 12, teaching: 0 });
    expect(first.nextCursor).toBeTruthy();
    const second = await service.getCourses('learner', { type: 'learning', cursor: first.nextCursor! });
    expect(second.items).toHaveLength(5);
    const third = await service.getCourses('learner', { type: 'learning', cursor: second.nextCursor! });
    expect(third.items).toHaveLength(2);
    expect(third.nextCursor).toBeNull();
    expect(new Set([...first.items, ...second.items, ...third.items].map((item) => item.id)).size).toBe(12);
  });

  it('does not show drafts, archives, deleted/revoked courses or another user enrollment', async () => {
    const allowed = await addCourse();
    await addCourse({ status: CourseStatusEnum.DRAFT });
    await addCourse({ status: CourseStatusEnum.ARCHIVED });
    await addCourse({ deletedAt: new Date() });
    await addCourse({ revoked: true });
    const otherCourse = await addCourse({ enrolled: false });
    await enrollments.create({ userId: teacherId, courseId: otherCourse._id });
    const result = await service.getCourses('learner', { type: 'learning' });
    expect(result.items.map((item) => item.id)).toEqual([allowed.id]);
    expect(result.counts.learning).toBe(1);
  });

  it('reads the target owner progress, not a different learner progress, without leaking session data', async () => {
    const course = await addCourse();
    await progress.create({
      userId: learnerId, courseId: course._id, watchedMs: 25000,
      sessionId: 'secret-session', lastPositionSeconds: 80,
    });
    await progress.create({ userId: teacherId, courseId: course._id, watchedMs: 99000 });
    const result = await service.getCourses('learner', { type: 'learning' });
    expect(result.items[0].progress?.percent).toBe(25);
    const serialized = JSON.stringify(result);
    for (const privateField of ['sessionId', 'orderId', 'watchedMs', 'lastPositionSeconds', 'email', 'reviewedById', 'description']) {
      expect(serialized).not.toContain(privateField);
    }
  });

  it('keeps unknown progress unknown and clamps actual completion at 100%', async () => {
    const unknown = await addCourse({ video: false });
    const complete = await addCourse();
    await progress.create({ userId: learnerId, courseId: complete._id, watchedMs: 150000 });
    const result = await service.getCourses('learner', { type: 'learning' });
    expect(result.items.find((item) => item.id === unknown.id)?.progress?.percent).toBeNull();
    expect(result.items.find((item) => item.id === complete.id)?.progress?.percent).toBe(100);
  });

  it('supports both teaching and learning for an instructor, with independent paging', async () => {
    await Promise.all(Array.from({ length: 7 }, () => addCourse({ enrolled: false })));
    const otherTeacher = await users.create({ email: 'other@example.test', username: 'other', fullName: 'Giảng viên khác', role: RoleEnum.INSTRUCTOR });
    const owned = await courses.create({
      title: 'Khóa học đã mua', slug: 'khoa-hoc-da-mua', instructorId: otherTeacher._id, status: CourseStatusEnum.PUBLISHED,
    });
    await enrollments.create({ userId: teacherId, courseId: owned._id });
    const teaching = await service.getCourses('teacher', { type: 'teaching' });
    const learning = await service.getCourses('teacher', { type: 'learning' });
    expect(teaching.items).toHaveLength(5);
    expect(teaching.items.every((item) => item.progress === null)).toBe(true);
    expect(teaching.counts).toEqual({ teaching: 7, learning: 1 });
    expect(learning.items.map((item) => item.id)).toEqual([owned.id]);
    const remaining = await service.getCourses('teacher', { type: 'teaching', cursor: teaching.nextCursor! });
    expect(remaining.items).toHaveLength(2);
  });

  it('never serves a banned or deleted account course list', async () => {
    await addCourse();
    await users.updateOne({ _id: learnerId }, { $set: { status: UserStatusEnum.BANNED } });
    await expect(service.getCourses('learner', { type: 'learning' })).rejects.toThrow(NotFoundException);
    await users.updateOne({ _id: learnerId }, { $set: { status: UserStatusEnum.ACTIVE, deletedAt: new Date() } });
    await expect(service.getCourses('learner', { type: 'learning' })).rejects.toThrow(NotFoundException);
  });

  it('uses the edited profile biography in public course instructor summaries, including clearing it', async () => {
    const course = await addCourse({ enrolled: false });
    await userService.updateProfile(teacherId.toHexString(), { bio: 'Nội dung mới.\nDòng thứ hai.' });
    const detail = await courseRepository.findPublicCourseDetail(course.id);
    expect(detail?.instructor?.username).toBe('teacher');
    expect(detail?.instructor?.bio).toBe('Nội dung mới.\nDòng thứ hai.');
    await userService.updateProfile(teacherId.toHexString(), { bio: '' });
    expect((await courseRepository.findPublicCourseDetail(course.id))?.instructor?.bio).toBe('');
  });
});

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { createConnection, type Connection, type Model, Types } from 'mongoose';
import type { ClsService } from 'nestjs-cls';
import { ReviewStatusEnum } from 'share-lib';
import { CourseEntity, CourseSchema } from '../../course/schemas/course.schema.js';
import { CourseCategoryEntity, CourseCategorySchema } from '../../course/schemas/course-category.schema.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import type { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import type { LearningProgressService } from '../../learning-progress/services/learning-progress.service.js';
import { UserEntity, UserSchema } from '../../user/schemas/user.schema.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { ReviewEntity, ReviewSchema, type ReviewDocument } from '../schemas/review.schema.js';
import { ReviewRepository } from '../repositories/review.repository.js';
import { ReviewService } from '../services/review.service.js';

// Opt in with REVIEW_REPLY_TEST_MONGO_URI. Every run owns a new, isolated test database.
describe.skipIf(!process.env.REVIEW_REPLY_TEST_MONGO_URI)('Instructor replies with MongoDB', () => {
  const dbName = `review_reply_test_${randomUUID().replaceAll('-', '')}`;
  const instructorId = new Types.ObjectId();
  const studentId = new Types.ObjectId();
  const createdAt = new Date('2026-01-01T00:00:00Z');
  let connection: Connection;
  let model: Model<ReviewDocument>;
  let repository: ReviewRepository;
  let service: ReviewService;
  let courseRepository: CourseRepository;
  let courseId: Types.ObjectId;
  let reviewId: string;

  beforeAll(async () => {
    connection = await createConnection(process.env.REVIEW_REPLY_TEST_MONGO_URI!, {
      dbName,
      serverSelectionTimeoutMS: 5000,
    }).asPromise();
    model = connection.model<ReviewDocument>(ReviewEntity.name, ReviewSchema);
    connection.model(CourseCategoryEntity.name, CourseCategorySchema);
    const courseModel = connection.model(CourseEntity.name, CourseSchema);
    const userModel = connection.model(UserEntity.name, UserSchema);
    await model.init();
    await userModel.collection.insertMany([
      { _id: instructorId, fullName: 'Giảng viên kiểm thử', email: 'instructor@example.test', deletedAt: null },
      { _id: studentId, fullName: 'Học viên kiểm thử', email: 'student@example.test', deletedAt: null },
    ]);
    repository = new ReviewRepository(model);
    courseRepository = new CourseRepository(courseModel);
    service = new ReviewService(
      repository,
      courseRepository,
      {} as EnrollmentRepository,
      {} as LearningProgressService,
      new UserRepository(userModel),
      { get: vi.fn() } as unknown as ClsService,
    );
  });

  beforeEach(async () => {
    courseId = new Types.ObjectId();
    await connection.collection('courses').insertOne({
      _id: courseId,
      title: 'Khóa học kiểm thử phản hồi',
      slug: `reply-test-${courseId.toString()}`,
      instructorId,
      deletedAt: null,
    });
    const review = await model.create({
      userId: studentId,
      courseId,
      rating: 4,
      comment: 'Nhận xét ban đầu của học viên.',
      createdAt,
      updatedAt: createdAt,
      updatedById: studentId.toString(),
    });
    reviewId = review.id;
  });

  afterAll(async () => {
    if (!connection) return;
    try {
      // Never clean up any database except the exact throwaway database created above.
      if (connection.name === dbName) await connection.dropDatabase();
    } finally {
      await connection.close();
    }
  });

  it('persists create/edit/delete and exposes the reply to public, instructor and admin reads', async () => {
    const ratingUpdate = vi.spyOn(courseRepository, 'updateRatingStats');
    const created = await service.replyToReview(instructorId.toString(), reviewId, { reply: 'Cảm ơn bạn.' });
    expect(created.instructorReply).toMatchObject({
      content: 'Cảm ơn bạn.',
      instructorId: instructorId.toString(),
      instructorName: 'Giảng viên kiểm thử',
      updatedAt: null,
    });
    const edited = await service.replyToReview(instructorId.toString(), reviewId, { reply: 'Cảm ơn, tôi sẽ cập nhật bài giảng.' });
    expect(edited.instructorReply?.repliedAt).toEqual(created.instructorReply?.repliedAt);
    expect(edited.instructorReply?.updatedAt).toBeInstanceOf(Date);

    const publicList = await repository.findCourseReviews(courseId.toString());
    const instructorList = await repository.findInstructorReviews(instructorId.toString(), { courseId: courseId.toString() });
    const adminList = await repository.findAdminReviews({ page: 1, limit: 10, isPagination: true, courseId: courseId.toString() });
    const adminDetail = await repository.findReviewByIdWithDetails(reviewId);
    for (const review of [publicList.items[0], instructorList.items[0], adminList.items[0], adminDetail]) {
      expect(review?.instructorReply).toEqual(edited.instructorReply);
      expect(review?.comment).toBe('Nhận xét ban đầu của học viên.');
      expect(review?.rating).toBe(4);
      expect(review?.updatedAt).toEqual(createdAt);
    }
    expect(ratingUpdate).not.toHaveBeenCalled();
    expect(await repository.calculateCourseReviewStats(courseId.toString())).toMatchObject({ totalReviews: 1, averageRating: 4 });

    await service.deleteInstructorReply(instructorId.toString(), reviewId);
    const saved = await model.findById(reviewId).lean();
    expect(saved).toMatchObject({
      instructorReply: null,
      deletedAt: null,
      comment: 'Nhận xét ban đầu của học viên.',
      rating: 4,
      updatedAt: createdAt,
      updatedById: studentId.toString(),
    });
    expect((await repository.findCourseReviews(courseId.toString())).items[0].instructorReply).toBeNull();
  });

  it('rejects another instructor for both saving and deleting a reply', async () => {
    await service.replyToReview(instructorId.toString(), reviewId, { reply: 'Phản hồi hợp lệ' });
    const stranger = new Types.ObjectId().toString();
    await expect(service.replyToReview(stranger, reviewId, { reply: 'Không hợp lệ' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.deleteInstructorReply(stranger, reviewId)).rejects.toBeInstanceOf(ForbiddenException);
    expect((await model.findById(reviewId))?.instructorReply?.content).toBe('Phản hồi hợp lệ');
  });

  it.each(['hidden', 'deleted'] as const)('guards the database write if the review becomes %s', async (state) => {
    const review = await service.replyToReview(instructorId.toString(), reviewId, { reply: 'Phản hồi đã lưu' });
    await model.updateOne({ _id: reviewId }, state === 'hidden'
      ? { status: ReviewStatusEnum.HIDDEN }
      : { deletedAt: new Date() });
    expect(await repository.setInstructorReply(reviewId, {
      ...review.instructorReply!,
      content: 'Không được ghi đè',
    })).toBeNull();
    expect(await repository.clearInstructorReply(reviewId)).toBeNull();
    expect((await model.findById(reviewId))?.instructorReply?.content).toBe('Phản hồi đã lưu');
    expect((await repository.findCourseReviews(courseId.toString())).items).toEqual([]);
  });
});

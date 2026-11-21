import { randomUUID } from 'node:crypto';
import mongoose, { Types, type Connection, type Model } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CourseStatusEnum } from 'share-lib';
import { CourseRepository } from '../repositories/course.repository.js';
import { CourseEntity, CourseSchema } from '../schemas/course.schema.js';

// Opt-in fixtures use a unique loopback-only database, never application data.
describe.skipIf(process.env.COURSE_STATS_DB_TESTS !== 'true')('Admin course statistics — MongoDB', () => {
  const dbName = `course_stats_test_${randomUUID().replaceAll('-', '')}`;
  let connection: Connection | undefined;
  let courses: Model<CourseEntity>;
  let repository: CourseRepository;

  beforeAll(async () => {
    connection = await mongoose.createConnection('mongodb://127.0.0.1:27017', {
      dbName,
      autoIndex: false,
      autoCreate: false,
      serverSelectionTimeoutMS: 3000,
    }).asPromise();
    courses = connection.model(CourseEntity.name, CourseSchema);
    repository = new CourseRepository(courses);
  });

  afterAll(async () => {
    if (!connection) return;
    try {
      if (connection.name === dbName && /^course_stats_test_[a-f0-9]{32}$/.test(dbName)) {
        await connection.dropDatabase();
      }
    } finally {
      await connection.close();
    }
  });

  it('returns zeros before any courses exist', async () => {
    expect(await repository.getAdminCourseStats()).toEqual({
      total: 0, published: 0, draft: 0, archived: 0, pendingApproval: 0,
    });
  });

  it('counts more than one page across instructors and includes drafts needing revision', async () => {
    const fixtures = [
      ...Array.from({ length: 15 }, () => ({ status: CourseStatusEnum.PUBLISHED })),
      { status: CourseStatusEnum.DRAFT },
      { status: CourseStatusEnum.DRAFT, rejectionReason: 'Cần bổ sung nội dung' },
      { status: CourseStatusEnum.ARCHIVED },
      { status: CourseStatusEnum.ARCHIVED },
      { status: CourseStatusEnum.PENDING_APPROVAL },
      { status: CourseStatusEnum.PENDING_APPROVAL },
      { status: CourseStatusEnum.PENDING_APPROVAL },
      ...Object.values(CourseStatusEnum).map((status) => ({ status, deletedAt: new Date() })),
    ];
    await courses.insertMany(fixtures.map((fixture, index) => ({
      title: `Khóa học kiểm thử ${index}`,
      slug: `course-stats-${index}`,
      instructorId: new Types.ObjectId(),
      ...fixture,
    })));

    expect(await repository.getAdminCourseStats()).toEqual({
      total: 22, published: 15, draft: 2, archived: 2, pendingApproval: 3,
    });
  });

  it('reflects approval, rejection, archiving, reopening and soft deletion', async () => {
    await courses.updateOne({ slug: 'course-stats-19' }, { $set: { status: CourseStatusEnum.PUBLISHED } });
    await courses.updateOne({ slug: 'course-stats-20' }, { $set: { status: CourseStatusEnum.DRAFT } });
    await courses.updateOne({ slug: 'course-stats-0' }, { $set: { status: CourseStatusEnum.ARCHIVED } });
    await courses.updateOne({ slug: 'course-stats-17' }, { $set: { status: CourseStatusEnum.PUBLISHED } });
    await courses.updateOne({ slug: 'course-stats-1' }, { $set: { deletedAt: new Date() } });

    const stats = await repository.getAdminCourseStats();
    expect(stats).toEqual({ total: 21, published: 15, draft: 3, archived: 2, pendingApproval: 1 });
    expect(stats.total).toBe(stats.published + stats.draft + stats.archived + stats.pendingApproval);
  });
});

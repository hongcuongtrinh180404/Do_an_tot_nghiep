import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import request from 'supertest';
import { ClsService } from 'nestjs-cls';
import {
  RoleEnum,
  UserStatusEnum,
  AuthProviderEnum,
  CourseStatusEnum,
  CourseLevelEnum,
  IUserProfile,
} from 'share-lib';
import { AppModule } from '../../../app.module.js';
import { AuditContextInterceptor, TransformInterceptor } from '../../base/index.js';
import { AuthTokenService } from '../../auth/services/auth-token.service.js';

describe('Course Section Endpoints (Integration/E2E Test)', () => {
  let app: INestApplication;
  let connection: Connection;
  let authTokenService: AuthTokenService;

  beforeAll(async () => {
    // Direct test traffic to a dedicated isolated test database
    process.env.MONGODB_DB_NAME = 'thc_datn_create_section_e2e_test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Mirror production configuration from main.ts
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const clsService = app.get(ClsService);
    app.useGlobalInterceptors(
      new AuditContextInterceptor(clsService),
      new TransformInterceptor(),
    );

    await app.init();

    connection = app.get<Connection>(getConnectionToken());
    authTokenService = app.get<AuthTokenService>(AuthTokenService);

    // CRITICAL SAFETY GUARD: Ensure test never touches development database
    if (connection.name === 'thc_datn') {
      throw new Error(
        'CRITICAL SAFETY ERROR: Test is connected to development database "thc_datn"! Aborting to prevent data loss.',
      );
    }
  });

  afterAll(async () => {
    if (connection && connection.name !== 'thc_datn') {
      await connection.dropDatabase();
    }
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    if (connection.name === 'thc_datn') {
      throw new Error(
        'CRITICAL SAFETY ERROR: Cannot wipe collections on development database "thc_datn"!',
      );
    }
    await connection.collection('sections').deleteMany({});
    await connection.collection('courses').deleteMany({});
    await connection.collection('users').deleteMany({});
    await connection.collection('sessions').deleteMany({});
  });

  describe('POST /api/v1/courses/:courseId/sections', () => {
    it('1. Happy path: should create section in MongoDB, return 201 Created with mapped ISection and valid ObjectId', async () => {
    // Given: Authenticated Instructor
    const instructorMongoId = new Types.ObjectId();
    const instructorId = instructorMongoId.toString();

    await connection.collection('users').insertOne({
      _id: instructorMongoId,
      email: 'instructor@example.com',
      passwordHash: 'dummy_hash_for_test',
      fullName: 'Master Java Instructor',
      role: RoleEnum.INSTRUCTOR,
      status: UserStatusEnum.ACTIVE,
      provider: AuthProviderEnum.LOCAL,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const userProfile: IUserProfile = {
      id: instructorId,
      email: 'instructor@example.com',
      fullName: 'Master Java Instructor',
      role: RoleEnum.INSTRUCTOR,
      status: UserStatusEnum.ACTIVE,
      provider: AuthProviderEnum.LOCAL,
      avatar: null,
      avatarUrl: null,
      bio: null,
      username: null,
    };

    const tokens = await authTokenService.generateTokens(userProfile);

    // Given: Course owned by the instructor
    const courseMongoId = new Types.ObjectId();
    const courseId = courseMongoId.toString();

    await connection.collection('courses').insertOne({
      _id: courseMongoId,
      title: 'Khóa học Lập trình Java Toàn Diện',
      slug: 'khoa-hoc-lap-trinh-java-toan-dien',
      instructorId: instructorMongoId,
      price: 299000,
      status: CourseStatusEnum.PUBLISHED,
      level: CourseLevelEnum.ALL_LEVELS,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // When: POST /api/v1/courses/:courseId/sections
    const payload = {
      title: 'Java Core',
      description: 'Các kiến thức nền tảng về Java',
      order: 0,
    };

    const response = await request(app.getHttpServer())
      .post(`/api/v1/courses/${courseId}/sections`)
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .send(payload);

    // Then: HTTP status 201 Created
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    const sectionData = response.body.data;
    expect(sectionData).toBeDefined();

    // Verify fields in HTTP response
    expect(sectionData.title).toBe('Java Core');
    expect(sectionData.description).toBe('Các kiến thức nền tảng về Java');
    expect(sectionData.order).toBe(0);
    expect(sectionData.courseId).toBe(courseId);

    // Confirm real MongoDB generated ID, not a stub
    expect(sectionData.id).toBeDefined();
    expect(sectionData.id).not.toBe('stub_section_id');
    expect(Types.ObjectId.isValid(sectionData.id)).toBe(true);

    // Confirm audit fields match authenticated user
    expect(sectionData.createdById).toBe(instructorId);
    expect(sectionData.updatedById).toBe(instructorId);

    // Confirm timestamps exist
    expect(sectionData.createdAt).toBeDefined();
    expect(sectionData.updatedAt).toBeDefined();

    // Then: Directly query MongoDB collection 'sections' to confirm physical persistence
    const savedSection = await connection.collection('sections').findOne({
      _id: new Types.ObjectId(sectionData.id),
    });

    expect(savedSection).toBeDefined();
    expect(savedSection!._id.toString()).toBe(sectionData.id);
    expect(savedSection!.courseId.toString()).toBe(courseId);
    expect(savedSection!.title).toBe('Java Core');
    expect(savedSection!.description).toBe('Các kiến thức nền tảng về Java');
    expect(savedSection!.order).toBe(0);
    expect(savedSection!.createdById).toBe(instructorId);
    expect(savedSection!.updatedById).toBe(instructorId);
    expect(savedSection!.deletedAt).toBeNull();
    expect(savedSection!.createdAt).toBeInstanceOf(Date);
    expect(savedSection!.updatedAt).toBeInstanceOf(Date);
  });

  it('2. Authorization: should return 403 Forbidden when instructor is not the course owner', async () => {
    // Owner of the course
    const ownerMongoId = new Types.ObjectId();
    await connection.collection('users').insertOne({
      _id: ownerMongoId,
      email: 'owner@example.com',
      passwordHash: 'dummy_hash',
      fullName: 'Owner Instructor',
      role: RoleEnum.INSTRUCTOR,
      status: UserStatusEnum.ACTIVE,
      provider: AuthProviderEnum.LOCAL,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const courseMongoId = new Types.ObjectId();
    const courseId = courseMongoId.toString();
    await connection.collection('courses').insertOne({
      _id: courseMongoId,
      title: 'Khóa học Độc quyền',
      slug: 'khoa-hoc-doc-quyen',
      instructorId: ownerMongoId,
      price: 199000,
      status: CourseStatusEnum.PUBLISHED,
      level: CourseLevelEnum.ALL_LEVELS,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Stranger instructor
    const strangerMongoId = new Types.ObjectId();
    await connection.collection('users').insertOne({
      _id: strangerMongoId,
      email: 'stranger@example.com',
      passwordHash: 'dummy_hash',
      fullName: 'Stranger Instructor',
      role: RoleEnum.INSTRUCTOR,
      status: UserStatusEnum.ACTIVE,
      provider: AuthProviderEnum.LOCAL,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const strangerTokens = await authTokenService.generateTokens({
      id: strangerMongoId.toString(),
      email: 'stranger@example.com',
      fullName: 'Stranger Instructor',
      role: RoleEnum.INSTRUCTOR,
      status: UserStatusEnum.ACTIVE,
      provider: AuthProviderEnum.LOCAL,
      avatar: null,
      avatarUrl: null,
      bio: null,
      username: null,
    });

    // When: Stranger attempts to create section for course they do not own
    const response = await request(app.getHttpServer())
      .post(`/api/v1/courses/${courseId}/sections`)
      .set('Authorization', `Bearer ${strangerTokens.accessToken}`)
      .send({
        title: 'Chương xâm nhập trái phép',
        order: 0,
      });

    // Then: 403 Forbidden
    expect(response.status).toBe(403);

    // Verify no section document was created
    const sectionCount = await connection.collection('sections').countDocuments();
    expect(sectionCount).toBe(0);
  });

  it('3. Error handling: should return 404 Not Found when course does not exist', async () => {
    // Authenticated instructor
    const instructorMongoId = new Types.ObjectId();
    await connection.collection('users').insertOne({
      _id: instructorMongoId,
      email: 'instructor404@example.com',
      passwordHash: 'dummy_hash',
      fullName: 'Instructor 404',
      role: RoleEnum.INSTRUCTOR,
      status: UserStatusEnum.ACTIVE,
      provider: AuthProviderEnum.LOCAL,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const tokens = await authTokenService.generateTokens({
      id: instructorMongoId.toString(),
      email: 'instructor404@example.com',
      fullName: 'Instructor 404',
      role: RoleEnum.INSTRUCTOR,
      status: UserStatusEnum.ACTIVE,
      provider: AuthProviderEnum.LOCAL,
      avatar: null,
      avatarUrl: null,
      bio: null,
      username: null,
    });

    const nonExistentCourseId = new Types.ObjectId().toString();

    // When: Attempting to create section for non-existent course ID
    const response = await request(app.getHttpServer())
      .post(`/api/v1/courses/${nonExistentCourseId}/sections`)
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .send({
        title: 'Chương cho khóa học không tồn tại',
        order: 0,
      });

    // Then: 404 Not Found
    expect(response.status).toBe(404);

    // Verify no section document was created
    const sectionCount = await connection.collection('sections').countDocuments();
    expect(sectionCount).toBe(0);
  });
});

  describe('GET /api/v1/courses/:courseId/sections', () => {
    it('1. Happy path: should return 200 with active sections ordered by order asc (0 -> 1 -> 2), excluding soft-deleted and other courses', async () => {
      // Given: Course A and Course B
      const instructorMongoId = new Types.ObjectId();
      const courseAMongoId = new Types.ObjectId();
      const courseAId = courseAMongoId.toString();

      const courseBMongoId = new Types.ObjectId();
      const courseBId = courseBMongoId.toString();

      await connection.collection('courses').insertMany([
        {
          _id: courseAMongoId,
          title: 'Khóa học Java Toàn Diện',
          slug: 'khoa-hoc-java-toan-dien',
          instructorId: instructorMongoId,
          price: 299000,
          status: CourseStatusEnum.PUBLISHED,
          level: CourseLevelEnum.ALL_LEVELS,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: courseBMongoId,
          title: 'Khóa học Python Toàn Diện',
          slug: 'khoa-hoc-python-toan-dien',
          instructorId: instructorMongoId,
          price: 199000,
          status: CourseStatusEnum.PUBLISHED,
          level: CourseLevelEnum.BEGINNER,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Given: Sections in DB with mixed orders, deleted section, and other course section
      const sectionOrder2Id = new Types.ObjectId();
      const sectionOrder0Id = new Types.ObjectId();
      const sectionOrder1Id = new Types.ObjectId();
      const deletedSectionId = new Types.ObjectId();
      const sectionCourseBId = new Types.ObjectId();

      await connection.collection('sections').insertMany([
        {
          _id: sectionOrder2Id,
          courseId: courseAMongoId,
          title: 'Chương 3: Java Nâng Cao',
          description: 'Mô tả chương 3',
          order: 2,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: sectionOrder0Id,
          courseId: courseAMongoId,
          title: 'Chương 1: Mở Đầu & Cài Đặt',
          description: 'Mô tả chương 1',
          order: 0,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: sectionOrder1Id,
          courseId: courseAMongoId,
          title: 'Chương 2: Cú Pháp Cơ Bản',
          description: 'Mô tả chương 2',
          order: 1,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: deletedSectionId,
          courseId: courseAMongoId,
          title: 'Chương Đã Xóa',
          description: 'Section đã bị soft delete',
          order: 0,
          deletedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: sectionCourseBId,
          courseId: courseBMongoId,
          title: 'Chương Khóa Học B',
          description: 'Section thuộc course khác',
          order: 0,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // When: GET /api/v1/courses/:courseId/sections
      const response = await request(app.getHttpServer()).get(
        `/api/v1/courses/${courseAId}/sections`,
      );

      // Then: HTTP status 200 OK
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const sections = response.body.data;
      expect(Array.isArray(sections)).toBe(true);
      expect(sections).toHaveLength(3);

      // Verify ordering is ascending: order 0 -> order 1 -> order 2
      expect(sections[0].id).toBe(sectionOrder0Id.toString());
      expect(sections[0].title).toBe('Chương 1: Mở Đầu & Cài Đặt');
      expect(sections[0].order).toBe(0);
      expect(sections[0].courseId).toBe(courseAId);

      expect(sections[1].id).toBe(sectionOrder1Id.toString());
      expect(sections[1].title).toBe('Chương 2: Cú Pháp Cơ Bản');
      expect(sections[1].order).toBe(1);
      expect(sections[1].courseId).toBe(courseAId);

      expect(sections[2].id).toBe(sectionOrder2Id.toString());
      expect(sections[2].title).toBe('Chương 3: Java Nâng Cao');
      expect(sections[2].order).toBe(2);
      expect(sections[2].courseId).toBe(courseAId);

      // Verify soft-deleted section is excluded
      const hasDeletedSection = sections.some((s: { id: string }) => s.id === deletedSectionId.toString());
      expect(hasDeletedSection).toBe(false);

      // Verify other course section is excluded
      const hasCourseBSection = sections.some((s: { id: string }) => s.id === sectionCourseBId.toString());
      expect(hasCourseBSection).toBe(false);
    });

    it('2. Error handling: should return 404 Not Found when course does not exist', async () => {
      const nonExistentCourseId = new Types.ObjectId().toString();

      const response = await request(app.getHttpServer()).get(
        `/api/v1/courses/${nonExistentCourseId}/sections`,
      );

      expect(response.status).toBe(404);
    });

    it('3. Error handling: should return 404 Not Found when course is soft-deleted', async () => {
      const deletedCourseMongoId = new Types.ObjectId();
      const deletedCourseId = deletedCourseMongoId.toString();

      await connection.collection('courses').insertOne({
        _id: deletedCourseMongoId,
        title: 'Khóa học đã xóa mềm',
        slug: 'khoa-hoc-da-xoa-mem',
        instructorId: new Types.ObjectId(),
        price: 0,
        status: CourseStatusEnum.PUBLISHED,
        level: CourseLevelEnum.ALL_LEVELS,
        deletedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app.getHttpServer()).get(
        `/api/v1/courses/${deletedCourseId}/sections`,
      );

      expect(response.status).toBe(404);
    });

    it('4. Empty list: should return 200 with empty array [] when course has no sections', async () => {
      const emptyCourseMongoId = new Types.ObjectId();
      const emptyCourseId = emptyCourseMongoId.toString();

      await connection.collection('courses').insertOne({
        _id: emptyCourseMongoId,
        title: 'Khóa học Mới Chưa Có Chương',
        slug: 'khoa-hoc-moi-chua-co-chuong',
        instructorId: new Types.ObjectId(),
        price: 0,
        status: CourseStatusEnum.PUBLISHED,
        level: CourseLevelEnum.ALL_LEVELS,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app.getHttpServer()).get(
        `/api/v1/courses/${emptyCourseId}/sections`,
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('5. Param validation: should return 400 Bad Request when courseId is not a valid ObjectId', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/courses/not-a-valid-hex-id/sections',
      );

      expect(response.status).toBe(400);
    });
  });
});

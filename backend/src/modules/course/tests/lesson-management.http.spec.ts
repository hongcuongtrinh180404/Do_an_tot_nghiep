import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { CourseStatusEnum, RoleEnum } from 'share-lib';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { LessonManagementGuard } from '../guards/lesson-management.guard.js';
import { LessonController } from '../lesson.controller.js';
import { LessonsController } from '../lessons.controller.js';
import { LessonQuizController } from '../lesson-quiz.controller.js';
import { CourseRepository } from '../repositories/course.repository.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { SectionRepository } from '../repositories/section.repository.js';
import { LessonQuizRepository } from '../repositories/lesson-quiz.repository.js';
import { LessonService } from '../services/lesson.service.js';
import { LessonQuizService } from '../services/lesson-quiz.service.js';
import { LessonTranscriptService } from '../services/lesson-transcript.service.js';
import { TranscriptAnalysisController } from '../../transcript-analysis/transcript-analysis.controller.js';
import { MindmapAnalysisService } from '../../transcript-analysis/services/mindmap-analysis.service.js';
import { QuizGenerationService } from '../../transcript-analysis/services/quiz-generation.service.js';
import { SummaryGenerationService } from '../../transcript-analysis/services/summary-generation.service.js';

const lessonId = '607f1f77bcf86cd799439011';
const sectionId = '607f1f77bcf86cd799439022';
const courseId = '607f1f77bcf86cd799439033';
const quizId = '607f1f77bcf86cd799439044';
const materialId = '607f1f77bcf86cd799439055';

interface ProtectedRoute {
  method: 'get' | 'post' | 'put' | 'delete';
  path: string;
  upload?: boolean;
}

const protectedRoutes: ProtectedRoute[] = [
  { method: 'get', path: `/lessons/${lessonId}/quizzes/manage` },
  { method: 'post', path: `/sections/${sectionId}/lessons` },
  { method: 'post', path: `/lessons/${lessonId}/materials`, upload: true },
  { method: 'delete', path: `/lessons/${lessonId}/materials/${materialId}` },
  { method: 'delete', path: `/lessons/${lessonId}` },
  { method: 'post', path: `/lessons/${lessonId}/transcript/retry` },
  { method: 'put', path: `/lessons/${lessonId}/quizzes/sync` },
  { method: 'put', path: `/lessons/${lessonId}/quizzes/move-merge` },
  { method: 'delete', path: `/lessons/quizzes/${quizId}` },
  { method: 'delete', path: `/lessons/${lessonId}/quizzes/timestamp/10` },
  { method: 'post', path: `/lessons/${lessonId}/analysis/mindmap` },
  { method: 'put', path: `/lessons/${lessonId}/analysis/mindmap` },
  { method: 'post', path: `/lessons/${lessonId}/analysis/mindmap/apply` },
  { method: 'post', path: `/lessons/${lessonId}/analysis/quiz` },
  { method: 'post', path: `/lessons/${lessonId}/analysis/quiz/apply` },
  { method: 'post', path: `/lessons/${lessonId}/analysis/summary` },
  { method: 'put', path: `/lessons/${lessonId}/analysis/summary` },
  { method: 'post', path: `/lessons/${lessonId}/analysis/summary/apply` },
];

describe('Lesson authoring HTTP authorization (isolated, no database or AI calls)', () => {
  let app: INestApplication;
  const lessons = { findById: vi.fn() };
  const sections = { findById: vi.fn() };
  const courses = { findById: vi.fn() };
  const quizzes = { findById: vi.fn() };
  const lessonService = {
    createLesson: vi.fn(),
    getLessonForUser: vi.fn(),
    getLessonsBySectionId: vi.fn(),
    addMaterial: vi.fn(),
    deleteMaterial: vi.fn(),
    deleteLesson: vi.fn(),
  };
  const quizService = {
    getQuizzesByLessonId: vi.fn(),
    syncQuizzesAtTimestamp: vi.fn(),
    moveOrMergeQuizCluster: vi.fn(),
    deleteQuiz: vi.fn(),
    deleteQuizzesAtTimestamp: vi.fn(),
  };
  const transcriptService = { getTranscriptByLessonId: vi.fn(), retryTranscription: vi.fn() };
  const mindmapService = { getMindmap: vi.fn(), generateMindmap: vi.fn(), updateMindmap: vi.fn(), applyDraft: vi.fn() };
  const quizGenerationService = { getQuizDraft: vi.fn(), generateQuiz: vi.fn(), applyDraft: vi.fn() };
  const summaryService = { getSummary: vi.fn(), generateSummary: vi.fn(), updateSummary: vi.fn(), applyDraft: vi.fn() };
  const services = [lessonService, quizService, transcriptService, mindmapService, quizGenerationService, summaryService];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [LessonController, LessonsController, LessonQuizController, TranscriptAnalysisController],
      providers: [
        LessonManagementGuard,
        { provide: LessonRepository, useValue: lessons },
        { provide: SectionRepository, useValue: sections },
        { provide: CourseRepository, useValue: courses },
        { provide: LessonQuizRepository, useValue: quizzes },
        { provide: LessonService, useValue: lessonService },
        { provide: LessonQuizService, useValue: quizService },
        { provide: LessonTranscriptService, useValue: transcriptService },
        { provide: MindmapAnalysisService, useValue: mindmapService },
        { provide: QuizGenerationService, useValue: quizGenerationService },
        { provide: SummaryGenerationService, useValue: summaryService },
      ],
    }).compile();

    app = module.createNestApplication();
    // Test-only identity injection: production identity is supplied by JwtAuthGuard.
    app.use((req: Request & { user?: { id: string; role: RoleEnum } }, _res: Response, next: NextFunction) => {
      const role = req.header('x-test-role');
      if (role) req.user = { id: req.header('x-test-user') || 'owner', role: role as RoleEnum };
      next();
    });
    app.useGlobalGuards(new RolesGuard(new Reflector()));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    vi.resetAllMocks();
    lessons.findById.mockResolvedValue({ id: lessonId, sectionId });
    sections.findById.mockResolvedValue({ id: sectionId, courseId });
    courses.findById.mockResolvedValue({ id: courseId, instructorId: 'owner', status: CourseStatusEnum.PUBLISHED });
    quizzes.findById.mockResolvedValue({ id: quizId, lessonId });
    for (const service of services) {
      for (const method of Object.values(service)) method.mockResolvedValue({ id: lessonId });
    }
    quizService.getQuizzesByLessonId.mockResolvedValue([]);
  });

  function send(route: ProtectedRoute, role: RoleEnum, userId = 'owner') {
    const action = request(app.getHttpServer())[route.method](route.path)
      .set('x-test-role', role)
      .set('x-test-user', userId);
    return route.upload
      ? action.attach('file', Buffer.from('%PDF-test'), { filename: 'slides.pdf', contentType: 'application/pdf' })
      : action.send({ title: 'Test lesson', order: 0 });
  }

  function expectNoServiceCalls() {
    for (const service of services) {
      for (const method of Object.values(service)) expect(method).not.toHaveBeenCalled();
    }
  }

  for (const route of protectedRoutes) {
    describe(`${route.method.toUpperCase()} ${route.path}`, () => {
      it.each([RoleEnum.STUDENT, RoleEnum.USER])('rejects %s without reaching a write or AI service', async (role) => {
        const response = await send(route, role);
        expect(response.status).toBe(403);
        expectNoServiceCalls();
      });

      it('rejects another instructor without reaching a write or AI service', async () => {
        const response = await send(route, RoleEnum.INSTRUCTOR, 'other');
        expect(response.status).toBe(403);
        expectNoServiceCalls();
      });

      it.each([RoleEnum.INSTRUCTOR, RoleEnum.ADMIN])('allows authorized %s management', async (role) => {
        const response = await send(route, role, role === RoleEnum.ADMIN ? 'admin' : 'owner');
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(300);
      });

      it('blocks pending-approval courses before any side effect', async () => {
        courses.findById.mockResolvedValue({ instructorId: 'owner', status: CourseStatusEnum.PENDING_APPROVAL });
        const response = await send(route, RoleEnum.INSTRUCTOR);
        expect(response.status).toBe(409);
        expectNoServiceCalls();
      });
    });
  }

  it('cannot bypass ownership using mode, courseId or userId supplied by the client', async () => {
    const response = await request(app.getHttpServer())
      .put(`/lessons/${lessonId}/analysis/summary?mode=edit&courseId=owned-course`)
      .set('x-test-role', RoleEnum.INSTRUCTOR)
      .set('x-test-user', 'other')
      .send({ userId: 'owner', courseId: 'owned-course', title: 'Spoofed' });
    expect(response.status).toBe(403);
    expectNoServiceCalls();
  });

  it('does not apply a write lock to existing admin draft reads', async () => {
    courses.findById.mockResolvedValue({ instructorId: 'owner', status: CourseStatusEnum.PENDING_APPROVAL });
    const response = await request(app.getHttpServer())
      .get(`/lessons/${lessonId}/analysis/quiz`)
      .set('x-test-role', RoleEnum.ADMIN);
    expect(response.status).toBe(200);
    expect(courses.findById).not.toHaveBeenCalled();
  });

  it.each([
    `/lessons/${lessonId}`,
    `/lessons/${lessonId}/quizzes`,
    `/lessons/${lessonId}/transcript`,
    `/lessons/${lessonId}/analysis/mindmap`,
    `/lessons/${lessonId}/analysis/summary`,
  ])('preserves learner read routes: %s', async (path) => {
    const response = await request(app.getHttpServer()).get(path).set('x-test-role', RoleEnum.STUDENT);
    expect(response.status).toBe(200);
    expect(courses.findById).not.toHaveBeenCalled();
  });
});

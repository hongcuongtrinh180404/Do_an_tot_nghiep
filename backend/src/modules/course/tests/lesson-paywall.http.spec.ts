import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ClsService } from 'nestjs-cls';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { LessonContentTypeEnum, RoleEnum } from 'share-lib';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import { StorageService } from '../../storage/storage.service.js';
import { LessonService } from '../services/lesson.service.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { SectionRepository } from '../repositories/section.repository.js';
import { CourseRepository } from '../repositories/course.repository.js';
import { LessonsController } from '../lessons.controller.js';
import { LessonQuizController } from '../lesson-quiz.controller.js';
import { LessonContentController } from '../lesson-content.controller.js';
import { LessonAccessGuard } from '../guards/lesson-access.guard.js';
import { LessonManagementGuard } from '../guards/lesson-management.guard.js';
import { LessonQuizRepository } from '../repositories/lesson-quiz.repository.js';
import { LessonTranscriptService } from '../services/lesson-transcript.service.js';
import { LessonQuizService } from '../services/lesson-quiz.service.js';
import { TranscriptAnalysisController } from '../../transcript-analysis/transcript-analysis.controller.js';
import { MindmapAnalysisService } from '../../transcript-analysis/services/mindmap-analysis.service.js';
import { QuizGenerationService } from '../../transcript-analysis/services/quiz-generation.service.js';
import { SummaryGenerationService } from '../../transcript-analysis/services/summary-generation.service.js';

const lockedId = '607f1f77bcf86cd799439011';
const previewId = '607f1f77bcf86cd799439012';
const freeId = '607f1f77bcf86cd799439013';
const privateUrl = 'http://localhost:9000/thc-datn-media-private/courses/lesson.mp4';
const suffixes = ['', '/transcript', '/quizzes', '/analysis/mindmap', '/analysis/summary'];

describe('Learner paywall HTTP (no database writes or external services)', () => {
  let app: INestApplication;
  const lessons = { findById: vi.fn(), findByMediaUrl: vi.fn() };
  const sections = { findById: vi.fn() };
  const courses = { findById: vi.fn() };
  const enrollments = { findByUserAndCourse: vi.fn() };
  const storage = {
    isPrivateMedia: vi.fn(), getPresignedStreamUrl: vi.fn(), getMediaReference: vi.fn(),
  };
  const transcript = { getTranscriptByLessonId: vi.fn() };
  const quizzes = { getQuizzesByLessonId: vi.fn() };
  const mindmaps = { getMindmap: vi.fn() };
  const summaries = { getSummary: vi.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [LessonsController, LessonQuizController, LessonContentController, TranscriptAnalysisController],
      providers: [
        LessonService, LessonAccessGuard, LessonManagementGuard,
        { provide: LessonRepository, useValue: lessons },
        { provide: SectionRepository, useValue: sections },
        { provide: CourseRepository, useValue: courses },
        { provide: EnrollmentRepository, useValue: enrollments },
        { provide: StorageService, useValue: storage },
        { provide: ClsService, useValue: { get: vi.fn() } },
        { provide: LessonQuizRepository, useValue: {} },
        { provide: LessonTranscriptService, useValue: transcript },
        { provide: LessonQuizService, useValue: quizzes },
        { provide: MindmapAnalysisService, useValue: mindmaps },
        { provide: SummaryGenerationService, useValue: summaries },
        { provide: QuizGenerationService, useValue: {} },
      ],
    }).compile();
    app = module.createNestApplication();
    app.use((req: Request & { user?: { id: string; role: RoleEnum } }, _res: Response, next: NextFunction) => {
      const user = req.header('x-test-user');
      if (user) req.user = { id: user, role: (req.header('x-test-role') ?? RoleEnum.STUDENT) as RoleEnum };
      next();
    });
    app.useGlobalGuards(new RolesGuard(new Reflector()));
    await app.init();
  });

  afterAll(async () => { await app?.close(); });

  beforeEach(() => {
    vi.resetAllMocks();
    lessons.findById.mockImplementation(async (id) => ({
      id, sectionId: id === freeId ? 'free-section' : 'paid-section', title: 'Video',
      isPreview: id === previewId, materials: [],
      content: { type: LessonContentTypeEnum.VIDEO, url: privateUrl, duration: 535 },
    }));
    lessons.findByMediaUrl.mockResolvedValue({ id: lockedId });
    sections.findById.mockImplementation(async (id) => ({ courseId: id === 'free-section' ? 'free-course' : 'paid-course' }));
    courses.findById.mockImplementation(async (id) => ({ id, instructorId: 'owner', price: id === 'free-course' ? 0 : 2000 }));
    enrollments.findByUserAndCourse.mockImplementation(async (user, course) =>
      (user === 'paid-student' && course === 'paid-course') || (user === 'free-enrolled' && course === 'free-course')
        ? { id: 'enrollment', deletedAt: null } : null);
    storage.isPrivateMedia.mockReturnValue(true);
    storage.getMediaReference.mockReturnValue({ url: privateUrl, isPrivate: true });
    storage.getPresignedStreamUrl.mockResolvedValue(`${privateUrl}?signed=temporary`);
    transcript.getTranscriptByLessonId.mockResolvedValue({ rawTranscript: 'Vietnamese content' });
    quizzes.getQuizzesByLessonId.mockResolvedValue([]);
    mindmaps.getMindmap.mockResolvedValue({ mindmap: { root: { title: 'Mindmap' } } });
    summaries.getSummary.mockResolvedValue({ summary: { title: 'Summary' } });
  });

  for (const suffix of suffixes) {
    it(`blocks anonymous and unregistered viewers on ${suffix || 'lesson detail'}`, async () => {
      expect((await request(app.getHttpServer()).get(`/lessons/${lockedId}${suffix}`)).status).toBe(403);
      expect((await request(app.getHttpServer()).get(`/lessons/${lockedId}${suffix}`).set('x-test-user', 'unregistered')).status).toBe(403);
      expect(storage.getPresignedStreamUrl).not.toHaveBeenCalled();
      for (const read of [transcript.getTranscriptByLessonId, quizzes.getQuizzesByLessonId, mindmaps.getMindmap, summaries.getSummary]) {
        expect(read).not.toHaveBeenCalled();
      }
    });

    it(`opens ${suffix || 'lesson detail'} after paid enrollment`, async () => {
      expect((await request(app.getHttpServer()).get(`/lessons/${lockedId}${suffix}`).set('x-test-user', 'paid-student')).status).toBe(200);
    });

    it(`requires registration even on the free course: ${suffix || 'detail'}`, async () => {
      expect((await request(app.getHttpServer()).get(`/lessons/${freeId}${suffix}`).set('x-test-user', 'unregistered')).status).toBe(403);
      expect((await request(app.getHttpServer()).get(`/lessons/${freeId}${suffix}`).set('x-test-user', 'free-enrolled')).status).toBe(200);
    });

    it(`preserves anonymous preview content: ${suffix || 'detail'}`, async () => {
      expect((await request(app.getHttpServer()).get(`/lessons/${previewId}${suffix}`)).status).toBe(200);
    });
  }

  it('rejects key-based signature requests before enrollment', async () => {
    const response = await request(app.getHttpServer()).get('/lesson-content/stream-url')
      .query({ key: privateUrl }).set('x-test-user', 'unregistered');
    expect(response.status).toBe(403);
    expect(storage.getPresignedStreamUrl).not.toHaveBeenCalled();
  });

  it('returns short-lived signatures only for authorized users', async () => {
    const response = await request(app.getHttpServer()).get('/lesson-content/stream-url')
      .query({ key: privateUrl }).set('x-test-user', 'paid-student');
    expect(response.status).toBe(200);
    expect(storage.getPresignedStreamUrl).toHaveBeenCalledWith(privateUrl, 1800);
  });
});

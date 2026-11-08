import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { CourseStatusEnum, RoleEnum } from 'share-lib';
import { LessonManagementGuard } from '../guards/lesson-management.guard.js';
import { CourseRepository } from '../repositories/course.repository.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { SectionRepository } from '../repositories/section.repository.js';
import { LessonQuizRepository } from '../repositories/lesson-quiz.repository.js';
import { LessonController } from '../lesson.controller.js';
import { LessonsController } from '../lessons.controller.js';
import { LessonQuizController } from '../lesson-quiz.controller.js';
import { TranscriptAnalysisController } from '../../transcript-analysis/transcript-analysis.controller.js';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator.js';

const lessonId = '607f1f77bcf86cd799439011';
const sectionId = '607f1f77bcf86cd799439022';
const courseId = '607f1f77bcf86cd799439033';
const quizId = '607f1f77bcf86cd799439044';
const user = { id: 'owner', role: RoleEnum.INSTRUCTOR };

function context(
  params: { id?: string; quizId?: string; sectionId?: string } = { id: lessonId },
  currentUser: { id: string; role: RoleEnum } | undefined = user,
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: currentUser, params }) }),
  } as unknown as ExecutionContext;
}

describe('LessonManagementGuard', () => {
  const lessons = { findById: vi.fn() };
  const sections = { findById: vi.fn() };
  const courses = { findById: vi.fn() };
  const quizzes = { findById: vi.fn() };
  let guard: LessonManagementGuard;

  beforeEach(() => {
    vi.resetAllMocks();
    lessons.findById.mockResolvedValue({ id: lessonId, sectionId });
    sections.findById.mockResolvedValue({ id: sectionId, courseId });
    courses.findById.mockResolvedValue({ id: courseId, instructorId: user.id, status: CourseStatusEnum.PUBLISHED });
    quizzes.findById.mockResolvedValue({ id: quizId, lessonId });
    guard = new LessonManagementGuard(
      lessons as unknown as LessonRepository,
      sections as unknown as SectionRepository,
      courses as unknown as CourseRepository,
      quizzes as unknown as LessonQuizRepository,
    );
  });

  it('authorizes the owner using the actual lesson and section hierarchy', async () => {
    await expect(guard.canActivate(context())).resolves.toBe(true);
    expect(lessons.findById).toHaveBeenCalledWith(lessonId);
    expect(sections.findById).toHaveBeenCalledWith(sectionId);
    expect(courses.findById).toHaveBeenCalledWith(courseId);
  });

  it('preserves admin access without bypassing resource resolution', async () => {
    await expect(guard.canActivate(context({ id: lessonId }, { id: 'admin', role: RoleEnum.ADMIN }))).resolves.toBe(true);
    expect(courses.findById).toHaveBeenCalledWith(courseId);
  });

  it('rejects unauthenticated requests before repository access', async () => {
    const anonymous = { switchToHttp: () => ({ getRequest: () => ({ params: { id: lessonId } }) }) } as unknown as ExecutionContext;
    await expect(guard.canActivate(anonymous)).rejects.toThrow(UnauthorizedException);
    expect(lessons.findById).not.toHaveBeenCalled();
  });

  it.each([RoleEnum.STUDENT, RoleEnum.USER])('rejects %s even if their id matches the owner', async (role) => {
    await expect(guard.canActivate(context({ id: lessonId }, { id: 'owner', role }))).rejects.toThrow(ForbiddenException);
    expect(lessons.findById).not.toHaveBeenCalled();
  });

  it('rejects instructors who do not own the lesson course', async () => {
    await expect(guard.canActivate(context({ id: lessonId }, { id: 'other', role: RoleEnum.INSTRUCTOR }))).rejects.toThrow(ForbiddenException);
  });

  it.each([RoleEnum.INSTRUCTOR, RoleEnum.ADMIN])('preserves the pending-approval lock for %s', async (role) => {
    courses.findById.mockResolvedValue({ instructorId: 'owner', status: CourseStatusEnum.PENDING_APPROVAL });
    await expect(guard.canActivate(context({ id: lessonId }, { id: 'owner', role }))).rejects.toThrow(ConflictException);
  });

  it('resolves a quiz deletion through the quiz owning lesson', async () => {
    await expect(guard.canActivate(context({ quizId }))).resolves.toBe(true);
    expect(quizzes.findById).toHaveBeenCalledWith(quizId);
    expect(lessons.findById).toHaveBeenCalledWith(lessonId);
  });

  it('checks section ownership before allowing lesson creation', async () => {
    await expect(guard.canActivate(context({ sectionId }))).resolves.toBe(true);
    expect(lessons.findById).not.toHaveBeenCalled();
    expect(courses.findById).toHaveBeenCalledWith(courseId);
  });

  it.each(['lesson', 'section', 'course'])('rejects missing or deleted %s records', async (resource) => {
    const repository = { lesson: lessons, section: sections, course: courses }[resource]!;
    const params = { id: lessonId };
    repository.findById.mockResolvedValueOnce(null);
    await expect(guard.canActivate(context(params))).rejects.toThrow(NotFoundException);
    repository.findById.mockResolvedValueOnce({ deletedAt: new Date() });
    await expect(guard.canActivate(context(params))).rejects.toThrow(NotFoundException);
  });

  it('rejects a missing or soft-deleted quiz without checking another lesson', async () => {
    quizzes.findById.mockResolvedValueOnce(null);
    await expect(guard.canActivate(context({ quizId }))).rejects.toThrow(NotFoundException);
    expect(lessons.findById).not.toHaveBeenCalled();
  });

  it.each([{ id: 'invalid' }, { sectionId: 'invalid' }, { quizId: 'invalid' }, {}])('fails closed for invalid routes: %o', async (params) => {
    await expect(guard.canActivate(context(params))).rejects.toThrow(BadRequestException);
  });
});

describe('Lesson authoring endpoint protection', () => {
  const protectedHandlers: Array<[object, string]> = [
    [LessonController.prototype, 'createLesson'],
    [LessonsController.prototype, 'uploadMaterial'],
    [LessonsController.prototype, 'deleteMaterial'],
    [LessonsController.prototype, 'deleteLesson'],
    [LessonsController.prototype, 'retryTranscription'],
    [LessonQuizController.prototype, 'createQuiz'],
    [LessonQuizController.prototype, 'updateQuiz'],
    [LessonQuizController.prototype, 'syncQuizzes'],
    [LessonQuizController.prototype, 'moveOrMergeQuizzes'],
    [LessonQuizController.prototype, 'deleteQuiz'],
    [LessonQuizController.prototype, 'deleteQuizzesAtTimestamp'],
    [TranscriptAnalysisController.prototype, 'generateMindmap'],
    [TranscriptAnalysisController.prototype, 'updateMindmap'],
    [TranscriptAnalysisController.prototype, 'applyDraftMindmap'],
    [TranscriptAnalysisController.prototype, 'generateQuiz'],
    [TranscriptAnalysisController.prototype, 'applyDraftQuiz'],
    [TranscriptAnalysisController.prototype, 'generateSummary'],
    [TranscriptAnalysisController.prototype, 'updateSummary'],
    [TranscriptAnalysisController.prototype, 'applyDraftSummary'],
  ];

  for (const [prototype, name] of protectedHandlers) {
    it(`requires ownership and author roles on ${name}`, () => {
      const handler: object = Reflect.get(prototype, name);
      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(LessonManagementGuard);
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([RoleEnum.INSTRUCTOR, RoleEnum.ADMIN]);
    });
  }
});

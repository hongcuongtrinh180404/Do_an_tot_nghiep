import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { LessonContentTypeEnum, RoleEnum, type ILesson } from 'share-lib';
import { LessonService } from '../services/lesson.service.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { SectionRepository } from '../repositories/section.repository.js';
import { CourseRepository } from '../repositories/course.repository.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import { StorageService } from '../../storage/index.js';
import { LessonAccessGuard } from '../guards/lesson-access.guard.js';

describe('Non-preview lesson authorization and private media', () => {
  const url = 'http://localhost:9000/thc-datn-media-private/courses/locked/lesson.mp4';
  const lesson: ILesson = {
    id: '607f1f77bcf86cd799439011', sectionId: 'section', title: 'Bài không xem thử', order: 1,
    isPreview: false, materials: [],
    content: { type: LessonContentTypeEnum.VIDEO, url, duration: 535 },
    createdAt: new Date(), updatedAt: new Date(),
  };
  const lessons = { findById: vi.fn(), findByMediaUrl: vi.fn() };
  const sections = { findById: vi.fn() };
  const courses = { findById: vi.fn() };
  const enrollments = { findByUserAndCourse: vi.fn() };
  const storage = { isPrivateMedia: vi.fn(), getPresignedStreamUrl: vi.fn(), getMediaReference: vi.fn() };
  let service: LessonService;

  beforeEach(() => {
    vi.resetAllMocks();
    lessons.findById.mockResolvedValue(lesson);
    lessons.findByMediaUrl.mockResolvedValue(lesson);
    sections.findById.mockResolvedValue({ id: 'section', courseId: 'course' });
    courses.findById.mockResolvedValue({ id: 'course', instructorId: 'owner', price: 2000 });
    enrollments.findByUserAndCourse.mockResolvedValue(null);
    storage.isPrivateMedia.mockReturnValue(true);
    storage.getPresignedStreamUrl.mockResolvedValue(`${url}?signed=valid`);
    storage.getMediaReference.mockReturnValue({ url, isPrivate: true });
    service = new LessonService(
      lessons as unknown as LessonRepository, sections as unknown as SectionRepository,
      {} as ClsService, enrollments as unknown as EnrollmentRepository,
      storage as unknown as StorageService, courses as unknown as CourseRepository,
    );
  });

  it.each([undefined, 'unregistered'])('does not sign video for an unenrolled viewer: %s', async (id) => {
    await expect(service.getLessonForUser(lesson.id, id, id ? RoleEnum.STUDENT : undefined)).rejects.toThrow(ForbiddenException);
    expect(storage.getPresignedStreamUrl).not.toHaveBeenCalled();
  });

  it('cannot bypass the paywall by requesting a signature for a known key', async () => {
    await expect(service.getAuthorizedStreamUrl(url, 'unregistered', RoleEnum.STUDENT)).rejects.toThrow(ForbiddenException);
    expect(storage.getPresignedStreamUrl).not.toHaveBeenCalled();
  });

  it.each([0, 2000])('opens a %s VND course only after enrollment', async (price) => {
    courses.findById.mockResolvedValue({ id: 'course', instructorId: 'owner', price });
    enrollments.findByUserAndCourse.mockResolvedValue({ id: 'enrollment', deletedAt: null });
    const result = await service.getLessonForUser(lesson.id, 'student', RoleEnum.STUDENT);
    expect(result.content?.url).toContain('?signed=valid');
    expect(lesson.content?.url).toBe(url); // Never persist expiring signatures.
    expect(storage.getPresignedStreamUrl).toHaveBeenCalledWith(url, 1800);
  });

  it('does not grant access based on a free price alone', async () => {
    courses.findById.mockResolvedValue({ id: 'course', instructorId: 'owner', price: 0 });
    await expect(service.getLessonForUser(lesson.id, 'student', RoleEnum.STUDENT)).rejects.toThrow(ForbiddenException);
  });

  it('rejects deleted enrollments', async () => {
    enrollments.findByUserAndCourse.mockResolvedValue({ deletedAt: new Date() });
    await expect(service.getLessonForUser(lesson.id, 'student', RoleEnum.STUDENT)).rejects.toThrow(ForbiddenException);
  });

  it.each([['owner', RoleEnum.INSTRUCTOR], ['admin', RoleEnum.ADMIN]])('preserves privileged access for %s', async (id, role) => {
    expect((await service.getLessonForUser(lesson.id, id, role as RoleEnum)).content?.url).toContain('?signed=valid');
  });

  it('does not grant blanket access to other instructors', async () => {
    await expect(service.getLessonForUser(lesson.id, 'another-instructor', RoleEnum.INSTRUCTOR)).rejects.toThrow(ForbiddenException);
  });

  it('retains anonymous public preview access', async () => {
    lessons.findById.mockResolvedValue({ ...lesson, isPreview: true, content: { ...lesson.content, url: 'https://example.test/public.mp4' } });
    storage.isPrivateMedia.mockReturnValue(false);
    expect((await service.getLessonForUser(lesson.id)).isPreview).toBe(true);
    expect(storage.getPresignedStreamUrl).not.toHaveBeenCalled();
  });

  it('rejects unknown media even for admins', async () => {
    lessons.findByMediaUrl.mockResolvedValue(null);
    await expect(service.getAuthorizedStreamUrl(url, 'admin', RoleEnum.ADMIN)).rejects.toThrow(NotFoundException);
  });

  it('signs the canonical media only after access is checked', async () => {
    enrollments.findByUserAndCourse.mockResolvedValue({ id: 'enrollment' });
    expect(await service.getAuthorizedStreamUrl('bucket/key', 'student', RoleEnum.STUDENT)).toContain('?signed=valid');
    expect(lessons.findByMediaUrl).toHaveBeenCalledWith(url);
  });

  it('protects analysis reads with the same lesson policy', async () => {
    const guard = new LessonAccessGuard(service);
    const context = { switchToHttp: () => ({ getRequest: () => ({
      params: { id: lesson.id }, user: { id: 'student', role: RoleEnum.STUDENT },
    }) }) };
    await expect(guard.canActivate(context as never)).rejects.toThrow(ForbiddenException);
    enrollments.findByUserAndCourse.mockResolvedValue({ id: 'enrollment' });
    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(storage.getPresignedStreamUrl).not.toHaveBeenCalled();
  });

  it('validates lesson IDs in guards before database access', async () => {
    const guard = new LessonAccessGuard(service);
    const context = { switchToHttp: () => ({ getRequest: () => ({ params: { id: 'invalid' } }) }) };
    await expect(guard.canActivate(context as never)).rejects.toThrow(BadRequestException);
    expect(lessons.findById).not.toHaveBeenCalled();
  });
});

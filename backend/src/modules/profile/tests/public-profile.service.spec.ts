import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import { BadRequestException, NotFoundException, ValidationPipe } from '@nestjs/common';
import { LearningStatusEnum, RoleEnum } from 'share-lib';
import { UserService } from '../../user/services/user.service.js';
import { LearningProgressRepository } from '../../learning-progress/repositories/learning-progress.repository.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { PublicProfileService } from '../public-profile.service.js';
import { PublicProfileRepository, type ProfileCourseRow } from '../public-profile.repository.js';
import { ProfileCoursesDto } from '../dto/profile-courses.dto.js';
import { decodeProfileCursor, encodeProfileCursor } from '../profile-cursor.util.js';
import { PublicProfileController } from '../public-profile.controller.js';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator.js';
import { UpdateProfileDto } from '../../user/dto/update-profile.dto.js';

const row = (index: number): ProfileCourseRow => ({
  id: index.toString(16).padStart(24, '0'),
  title: `Khóa học ${index}`, slug: `khoa-hoc-${index}`, thumbnailUrl: null,
  instructorName: 'Giảng viên', instructorUsername: 'teacher',
  sortId: new Types.ObjectId(index.toString(16).padStart(24, '0')),
  sortDate: new Date('2026-01-01T00:00:00Z'),
});

describe('public profile course service', () => {
  const users = { findPublicUserByUsername: vi.fn() };
  const profiles = {
    findLearning: vi.fn(), findTeaching: vi.fn(),
    countLearning: vi.fn(), countTeaching: vi.fn(),
  };
  const progress = { findForCourses: vi.fn() };
  const lessons = { getCourseVideoStats: vi.fn() };
  const service = new PublicProfileService(
    users as unknown as UserService, profiles as unknown as PublicProfileRepository,
    progress as unknown as LearningProgressRepository, lessons as unknown as LessonRepository,
  );
  const userId = new Types.ObjectId().toHexString();

  beforeEach(() => {
    vi.resetAllMocks();
    users.findPublicUserByUsername.mockResolvedValue({ id: userId, username: 'target', role: RoleEnum.INSTRUCTOR });
    profiles.findLearning.mockResolvedValue([]);
    profiles.findTeaching.mockResolvedValue([]);
    profiles.countLearning.mockResolvedValue(7);
    profiles.countTeaching.mockResolvedValue(6);
    progress.findForCourses.mockResolvedValue([]);
    lessons.getCourseVideoStats.mockResolvedValue([]);
  });

  it('returns five courses and a cursor, computing progress for the profile owner in one batch', async () => {
    const rows = Array.from({ length: 6 }, (_, index) => row(index + 1));
    profiles.findLearning.mockResolvedValue(rows);
    progress.findForCourses.mockResolvedValue([{
      courseId: rows[0].id, watchedMs: 25000, revision: 1,
      sessionId: 'private-session', lastPositionSeconds: 99,
    }]);
    lessons.getCourseVideoStats.mockResolvedValue(rows.slice(0, 5).map((course) => ({
      courseId: course.id, totalSeconds: 100, videoCount: 1, missingDurationCount: 0, videos: [],
    })));
    const result = await service.getCourses('target', { type: 'learning' });
    expect(result.items).toHaveLength(5);
    expect(progress.findForCourses).toHaveBeenCalledWith(userId, rows.slice(0, 5).map((course) => course.id));
    expect(progress.findForCourses).toHaveBeenCalledTimes(1);
    expect(result.items[0].progress).toEqual({ percent: 25, status: LearningStatusEnum.IN_PROGRESS });
    expect(result.items[1].progress).toEqual({ percent: 0, status: LearningStatusEnum.NOT_STARTED });
    expect(decodeProfileCursor(result.nextCursor!, 'learning')?.id).toEqual(rows[4].sortId);
    expect(result.counts).toEqual({ learning: 7, teaching: 6 });
    expect(Object.keys(result.items[0]).sort((a, b) => a.localeCompare(b))).toEqual(
      ['id', 'title', 'slug', 'thumbnailUrl', 'instructorName', 'instructorUsername', 'progress'].sort((a, b) => a.localeCompare(b)),
    );
    expect(Object.keys(result.items[0].progress!)).toEqual(['percent', 'status']);
  });

  it('does not return learner progress or query learning sessions for teaching cards', async () => {
    profiles.findTeaching.mockResolvedValue([row(1)]);
    const result = await service.getCourses('target', { type: 'teaching' });
    expect(result.items[0].progress).toBeNull();
    expect(result.nextCursor).toBeNull();
    expect(progress.findForCourses).not.toHaveBeenCalled();
    expect(lessons.getCourseVideoStats).not.toHaveBeenCalled();
  });

  it('returns an empty teaching tab for non-instructors', async () => {
    users.findPublicUserByUsername.mockResolvedValue({ id: userId, username: 'target', role: RoleEnum.STUDENT });
    const result = await service.getCourses('target', { type: 'teaching' });
    expect(result.items).toEqual([]);
    expect(result.counts.teaching).toBe(0);
    expect(profiles.findTeaching).not.toHaveBeenCalled();
    expect(profiles.countTeaching).not.toHaveBeenCalled();
  });

  it('does not invent a numeric percentage when duration is unknown', async () => {
    profiles.findLearning.mockResolvedValue([row(1)]);
    const result = await service.getCourses('target', { type: 'learning' });
    expect(result.items[0].progress?.percent).toBeNull();
  });

  it('does not query courses for a nonexistent or non-public account', async () => {
    users.findPublicUserByUsername.mockRejectedValue(new NotFoundException());
    await expect(service.getCourses('missing', { type: 'learning' })).rejects.toThrow(NotFoundException);
    expect(profiles.findLearning).not.toHaveBeenCalled();
    expect(progress.findForCourses).not.toHaveBeenCalled();
  });

  it('rejects malformed/cross-tab cursors before querying course data', async () => {
    const cursor = encodeProfileCursor({ at: row(1).sortDate, id: row(1).sortId }, 'teaching');
    await expect(service.getCourses('target', { type: 'learning', cursor })).rejects.toThrow(BadRequestException);
    expect(profiles.findLearning).not.toHaveBeenCalled();
  });
});

describe('public profile course HTTP validation', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

  it('defaults to learning courses', async () => {
    const dto: ProfileCoursesDto = await pipe.transform({}, { type: 'query', metatype: ProfileCoursesDto });
    expect(dto.type).toBe('learning');
  });

  it.each([
    { type: 'drafts' }, { userId: 'another-account' }, { limit: '1000' },
    { type: 'learning', cursor: 'a'.repeat(301) }, { cursor: ['a', 'b'] },
  ])('rejects an invalid query %j', async (query) => {
    await expect(pipe.transform(query, { type: 'query', metatype: ProfileCoursesDto })).rejects.toThrow(BadRequestException);
  });

  it('is an anonymous read-only endpoint', () => {
    const handler = Object.getOwnPropertyDescriptor(PublicProfileController.prototype, 'getCourses')!.value as object;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
  });

  it('allows clearing the biography instead of silently leaving the old text', async () => {
    const dto: UpdateProfileDto = await pipe.transform({ bio: '   ' }, { type: 'body', metatype: UpdateProfileDto });
    expect(dto.bio).toBe('');
  });
});

describe('profile pagination cursor', () => {
  it('round trips date/id and is bound to a tab', () => {
    const source = { at: row(1).sortDate, id: row(1).sortId };
    const cursor = encodeProfileCursor(source, 'learning');
    expect(decodeProfileCursor(cursor, 'learning')).toEqual(source);
    expect(() => decodeProfileCursor(cursor, 'teaching')).toThrow(BadRequestException);
  });

  it.each(['!', 'bm90LWpzb24', Buffer.from(JSON.stringify({ at: 'bad-date', id: row(1).id, type: 'learning' })).toString('base64url')])('rejects invalid cursor %s', (value) => {
    expect(() => decodeProfileCursor(value, 'learning')).toThrow(BadRequestException);
  });
});

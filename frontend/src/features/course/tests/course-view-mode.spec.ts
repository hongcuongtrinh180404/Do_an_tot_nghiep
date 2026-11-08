import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CourseStatusEnum, RoleEnum } from 'share-lib';
import { canEditCourseContent } from '../utils/course-access.util';
import { getCourseUrl, getLessonUrl, parseCourseViewMode } from '../utils/course-view-mode.util';

const owner = { id: 'owner', role: RoleEnum.INSTRUCTOR };
const admin = { id: 'admin', role: RoleEnum.ADMIN };
const course = { instructorId: 'owner', status: CourseStatusEnum.PUBLISHED };

describe('Explicit course viewing mode', () => {
  it('defaults to learner mode, including invalid or repeated query parameters', () => {
    for (const value of [undefined, null, '', 'learn', 'preview', 'EDIT', ['edit'], ['edit', 'learn']]) {
      assert.equal(parseCourseViewMode(value), 'learn');
    }
    assert.equal(parseCourseViewMode('edit'), 'edit');
  });

  it('never infers editing from course ownership or admin role', () => {
    for (const user of [owner, admin]) {
      assert.equal(canEditCourseContent(user, course), false);
      assert.equal(canEditCourseContent(user, course, 'learn'), false);
    }
  });

  it('allows the owner and admin to explicitly edit a writable course', () => {
    for (const status of [CourseStatusEnum.DRAFT, CourseStatusEnum.PUBLISHED, CourseStatusEnum.ARCHIVED]) {
      assert.equal(canEditCourseContent(owner, { ...course, status }, 'edit'), true);
      assert.equal(canEditCourseContent(admin, { ...course, status }, 'edit'), true);
    }
  });

  it('does not grant management to another instructor or a learner who requests edit mode', () => {
    for (const role of [RoleEnum.INSTRUCTOR, RoleEnum.STUDENT, RoleEnum.USER]) {
      assert.equal(canEditCourseContent({ id: 'other', role }, course, 'edit'), false);
    }
    assert.equal(canEditCourseContent({ id: 'owner', role: RoleEnum.STUDENT }, course, 'edit'), false);
  });

  it('fails closed while authentication, ownership or course status is unresolved', () => {
    assert.equal(canEditCourseContent(undefined, course, 'edit'), false);
    assert.equal(canEditCourseContent(null, course, 'edit'), false);
    assert.equal(canEditCourseContent(owner, undefined, 'edit'), false);
    assert.equal(canEditCourseContent(admin, null, 'edit'), false);
    assert.equal(canEditCourseContent(owner, { instructorId: 'owner' }, 'edit'), false);
  });

  it('preserves the pending-approval lock for owners and admins', () => {
    const lockedCourse = { ...course, status: CourseStatusEnum.PENDING_APPROVAL };
    assert.equal(canEditCourseContent(owner, lockedCourse, 'edit'), false);
    assert.equal(canEditCourseContent(admin, lockedCourse, 'edit'), false);
  });

  it('keeps preview, learning and default lesson links read-only', () => {
    assert.equal(getCourseUrl('course-1'), '/courses/course-1');
    assert.equal(getCourseUrl('course-1', 'learn'), '/courses/course-1');
    assert.equal(getLessonUrl('course-1', 'lesson-1'), '/courses/course-1/lessons/lesson-1');
    assert.equal(getLessonUrl('course-1', 'lesson-2', 'learn'), '/courses/course-1/lessons/lesson-2');
  });

  it('preserves explicit editing when switching lessons and returning to management', () => {
    assert.equal(getCourseUrl('course-1', 'edit'), '/courses/course-1?mode=edit');
    assert.equal(getLessonUrl('course-1', 'lesson-2', 'edit'), '/courses/course-1/lessons/lesson-2?mode=edit');
  });
});

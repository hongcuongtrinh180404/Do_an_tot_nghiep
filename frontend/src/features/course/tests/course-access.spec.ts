import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RoleEnum } from 'share-lib';
import { canManageCourse } from '../utils/course-access.util';

const course = { instructorId: 'owner' };

describe('Shared course lesson management access', () => {
  it('enables management for the instructor who owns the course', () => {
    assert.equal(canManageCourse({ id: 'owner', role: RoleEnum.INSTRUCTOR }, course), true);
  });

  it('preserves admin access to another instructor\'s course', () => {
    assert.equal(canManageCourse({ id: 'admin', role: RoleEnum.ADMIN }, course), true);
  });

  it('keeps another instructor in learner mode', () => {
    assert.equal(canManageCourse({ id: 'other', role: RoleEnum.INSTRUCTOR }, course), false);
  });

  it('keeps students in learner mode even when an owner id is present', () => {
    assert.equal(canManageCourse({ id: 'owner', role: RoleEnum.STUDENT }, course), false);
  });

  it('disables management before authentication resolves and for guests', () => {
    assert.equal(canManageCourse(undefined, course), false);
    assert.equal(canManageCourse(null, course), false);
  });

  it('requires a course response for both instructors and admins', () => {
    assert.equal(canManageCourse({ id: 'owner', role: RoleEnum.INSTRUCTOR }, undefined), false);
    assert.equal(canManageCourse({ id: 'admin', role: RoleEnum.ADMIN }, null), false);
  });
});

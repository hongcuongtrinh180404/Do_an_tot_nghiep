import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { RoleEnum, UserStatusEnum } from 'share-lib';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy.js';
import { UserService } from '../../user/services/user.service.js';
import { CourseController } from '../course.controller.js';
import { CourseService } from '../services/course.service.js';

const secret = 'course-preview-http-test-secret-only';

describe('Learner course preview viewer identity over HTTP', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const getPublicCourseDetail = vi.fn().mockResolvedValue({ id: 'course', sections: [] });
  const users = {
    findById: vi.fn(async (id: RoleEnum) => ({
      id, role: id, status: UserStatusEnum.ACTIVE,
    })),
    toUserProfile: vi.fn((user) => user),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret })],
      controllers: [CourseController],
      providers: [
        JwtStrategy,
        { provide: CourseService, useValue: { getPublicCourseDetail } },
        { provide: UserService, useValue: users },
        { provide: ConfigService, useValue: { get: () => secret } },
      ],
    }).compile();
    app = module.createNestApplication();
    const reflector = new Reflector();
    app.useGlobalGuards(new JwtAuthGuard(reflector), new RolesGuard(reflector));
    await app.init();
    jwt = module.get(JwtService);
  });

  beforeEach(() => { vi.clearAllMocks(); });
  afterAll(async () => { await app?.close(); });

  it.each([RoleEnum.ADMIN, RoleEnum.STUDENT, RoleEnum.INSTRUCTOR])(
    'passes the authenticated %s role to the read-only detail service',
    async (role) => {
      const token = jwt.sign({ sub: role, role });
      const response = await request(app.getHttpServer())
        .get('/courses/public/course')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(getPublicCourseDetail).toHaveBeenCalledExactlyOnceWith('course', role);
      expect(response.headers['cache-control']).toBe('private, no-store');
    },
  );

  it('does not trust a query parameter or unsigned role header from a guest', async () => {
    const response = await request(app.getHttpServer())
      .get('/courses/public/course?viewerRole=admin&includeUnpublished=true')
      .set('x-role', RoleEnum.ADMIN);

    expect(response.status).toBe(200);
    expect(getPublicCourseDetail).toHaveBeenCalledExactlyOnceWith('course', null);
    expect(users.findById).not.toHaveBeenCalled();
  });

  it('falls back to the public-only role when a token is invalid or expired', async () => {
    const tokens = ['invalid.admin.token', jwt.sign({ sub: RoleEnum.ADMIN }, { expiresIn: -1 })];
    for (const token of tokens) {
      getPublicCourseDetail.mockClear();
      const response = await request(app.getHttpServer())
        .get('/courses/public/course')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(getPublicCourseDetail).toHaveBeenCalledExactlyOnceWith('course', null);
    }
  });

  it('uses the current account role, not an outdated admin claim in the token', async () => {
    const token = jwt.sign({ sub: RoleEnum.STUDENT, role: RoleEnum.ADMIN });
    await request(app.getHttpServer())
      .get('/courses/public/course')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(getPublicCourseDetail).toHaveBeenCalledExactlyOnceWith('course', RoleEnum.STUDENT);
  });
});

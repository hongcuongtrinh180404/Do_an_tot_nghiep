import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Logger, Module, ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  CourseLevelEnum,
  RoleEnum,
  UserStatusEnum,
  type IUser,
} from 'share-lib';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy.js';
import { UserService } from '../../user/services/user.service.js';
import { TransformInterceptor } from '../../base/interceptors/transform.interceptor.js';
import { CourseEntity } from '../../course/schemas/course.schema.js';
import { CourseCategoryEntity } from '../../course/schemas/course-category.schema.js';
import { PublicCourseSearchService } from '../../course/services/public-course-search.service.js';
import { ChatbotAiClient } from '../chatbot-ai.client.js';
import { ChatbotAiError, type ChatbotAiErrorCode } from '../chatbot.errors.js';
import { ChatbotHttpModule } from '../chatbot-http.module.js';
import { LearningProgressModule } from '../../learning-progress/learning-progress.module.js';
import { LearningProgressService } from '../../learning-progress/services/learning-progress.service.js';
import { EnrollmentEntity } from '../../enrollment/schemas/enrollment.schema.js';
import { LessonEntity } from '../../course/schemas/lesson.schema.js';
import { ChatbotLearningReadService } from '../services/chatbot-learning-read.service.js';
import { parseSearchCoursesArguments } from '../tools/search-courses.contract.js';
import {
  CHATBOT_HTTP_EXPOSED_HEADERS,
  CHATBOT_HTTP_RATE_LIMIT,
} from '../http/chatbot-http.constants.js';

const path = '/api/v1/chatbot/messages';
const secret = 'synthetic-chatbot-http-jwt-secret-at-least-32-characters';

@Module({
  providers: [{ provide: LearningProgressService, useValue: {} }],
  exports: [LearningProgressService],
})
class TestLearningProgressModule {}

function toolCompletion(args: Record<string, unknown> = { keyword: 'React' }, name = 'search_courses') {
  return {
    assistantMessage: {
      role: 'assistant',
      content: 'Fabricated course from provider',
      reasoning_content: 'private-provider-reasoning',
      tool_calls: [
        {
          id: 'call_1',
          type: 'function',
          function: { name, arguments: JSON.stringify(args) },
        },
      ],
    },
    finishReason: 'tool_calls',
  };
}

describe('Chatbot HTTP — real JWT/validation/limits, mocked external data', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let token: string;
  const complete = vi.fn();
  const search = vi.fn();
  const learning = { list: vi.fn(), detail: vi.fn(), overview: vi.fn(), candidates: vi.fn() };
  const users = {
    findById: vi.fn(),
    toUserProfile: vi.fn((user: IUser) => ({
      id: user.id,
      role: user.role,
      status: user.status,
    })),
  };
  let warn: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const config = {
      get: (key: string, fallback?: unknown) =>
        key === 'JWT_SECRET' ? secret : fallback,
    };
    const module = await Test.createTestingModule({
      imports: [
        ChatbotHttpModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret, signOptions: { expiresIn: '5m' } }),
      ],
      providers: [
        { provide: UserService, useValue: users },
        {
          provide: JwtStrategy,
          useFactory: () =>
            new JwtStrategy(
              config as ConfigService,
              users as unknown as UserService,
            ),
        },
      ],
    })
      .overrideModule(LearningProgressModule).useModule(TestLearningProgressModule)
      .overrideProvider(getModelToken(EnrollmentEntity.name)).useValue({})
      .overrideProvider(getModelToken(LessonEntity.name)).useValue({})
      .overrideProvider(ChatbotLearningReadService).useValue(learning)
      .overrideProvider(ConfigService)
      .useValue(config)
      .overrideProvider(ChatbotAiClient)
      .useValue({ complete })
      .overrideProvider(PublicCourseSearchService)
      .useValue({ search })
      .overrideProvider(getModelToken(CourseEntity.name))
      .useValue({})
      .overrideProvider(getModelToken(CourseCategoryEntity.name))
      .useValue({})
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.enableCors({
      origin: 'http://localhost:3000',
      credentials: true,
      exposedHeaders: CHATBOT_HTTP_EXPOSED_HEADERS,
    });
    // The actual application registers these guards globally via AuthModule.
    app.useGlobalGuards(
      new JwtAuthGuard(new Reflector()),
      new RolesGuard(new Reflector()),
    );
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
    jwt = module.get(JwtService);
  });

  afterAll(async () => {
    await app?.close();
    warn?.mockRestore();
  });

  beforeEach(() => {
    for (const method of Object.values(learning)) method.mockReset();
    complete.mockReset().mockResolvedValue(toolCompletion());
    users.findById.mockReset().mockImplementation((id: string) =>
      Promise.resolve({
        id,
        role: RoleEnum.STUDENT,
        status: UserStatusEnum.ACTIVE,
      }),
    );
    search.mockReset().mockImplementation((filters) =>
      Promise.resolve({
        filtersApplied: filters,
        items: [
          {
            id: '0123456789abcdef01234567',
            title: 'Khóa học từ database',
            price:
              filters.isFree === true
                ? 0
                : Math.min(
                    299000,
                    filters.maxPrice === undefined
                      ? 299000
                      : filters.maxPrice - (filters.maxPriceExclusive ? 1 : 0),
                  ),
            level: filters.level ?? CourseLevelEnum.BEGINNER,
            categoryName: 'Lập trình',
            url: '/courses/0123456789abcdef01234567',
            reasoning_content: 'private-extra-item-field',
          },
        ],
        total: 1,
        page: filters.page,
        limit: filters.limit,
        hasMore: false,
        currency: 'VND',
        reasoning_content: 'private-extra-result-field',
      }),
    );
    token = jwt.sign({ sub: randomUUID() });
  });

  function post(body: unknown, bearer = token) {
    return request(app.getHttpServer())
      .post(path)
      .set('Authorization', `Bearer ${bearer}`)
      .send(body as Record<string, unknown>);
  }

  it('routes owned courses and selected progress through the authenticated HTTP caller', async () => {
    const id = '0123456789abcdef01234567';
    const course = {
      id, title: 'Khóa thật của tài khoản', enrolledAt: '2026-11-20T00:00:00.000Z',
      url: `/courses/${id}`, resumeUrl: null,
      progress: { status: 'NOT_STARTED', progressPercent: 0, completedLessons: 0, totalLessons: 2,
        watchedMs: 0, lastLessonId: null, lastPositionSeconds: 0, sessionId: 'private-session' },
      orderId: 'private-order',
    };
    learning.list.mockResolvedValue({
      filtersApplied: { page: 1, limit: 5 }, items: [course], total: 1, page: 1, limit: 5, hasMore: false,
    });
    complete.mockResolvedValue(toolCompletion({}, 'get_my_courses'));
    const first = await post({ message: 'Các khóa của tôi' });
    expect(first.status).toBe(200);
    expect(first.body.data.kind).toBe('my_courses');
    expect(learning.list).toHaveBeenCalledWith(jwt.decode(token).sub, { page: 1, limit: 5 }, expect.any(AbortSignal));
    expect(JSON.stringify(first.body)).not.toContain('private-');
    learning.detail.mockResolvedValue({ scope: 'course', course, remainingLessons: 2, lastLessonTitle: null });
    complete.mockResolvedValue(toolCompletion({ scope: 'course', position: 1 }, 'get_my_learning_progress'));
    const detail = await post({ message: 'Tiến độ khóa đầu tiên', context: first.body.data.context });
    expect(detail.status).toBe(200);
    expect(detail.body.data.result.scope).toBe('course');
    expect(learning.detail).toHaveBeenCalledWith(jwt.decode(token).sub, id, expect.any(AbortSignal));
    expect(JSON.stringify(detail.body)).not.toContain('private-');
    const other = await post({ message: 'Tiến độ khóa đầu tiên', context: first.body.data.context }, jwt.sign({ sub: randomUUID() }));
    expect(other.status).toBe(400);
    expect(other.body.code).toBe('CHATBOT_CONTEXT_INVALID');
    expect(learning.detail).toHaveBeenCalledOnce();
  });

  it('treats missing ownership as a business result and database failure as 503', async () => {
    complete.mockResolvedValue(toolCompletion({ scope: 'course', courseId: '0123456789abcdef01234567' }, 'get_my_learning_progress'));
    learning.detail.mockResolvedValue({ scope: 'not_owned' });
    const missing = await post({ message: 'Tiến độ /courses/0123456789abcdef01234567' });
    expect(missing.status).toBe(200);
    expect(missing.body.data.result).toEqual({ scope: 'not_owned' });
    const { ChatbotLearningError } = await import('../tools/my-learning.types.js');
    learning.overview.mockRejectedValue(new ChatbotLearningError('CHATBOT_LEARNING_UNAVAILABLE'));
    complete.mockResolvedValue(toolCompletion({ scope: 'overview' }, 'get_my_learning_progress'));
    const failed = await post({ message: 'Tiến độ của tôi' });
    expect(failed.status).toBe(503);
    expect(failed.body.code).toBe('CHATBOT_LEARNING_UNAVAILABLE');
    expect(failed.body).not.toHaveProperty('result');
  });

  it('rejects model-supplied account overrides before any personal read', async () => {
    complete.mockResolvedValue(toolCompletion({ userId: 'other' }, 'get_my_courses'));
    const response = await post({ message: 'Khóa của tôi' });
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('needs_clarification');
    expect(learning.list).not.toHaveBeenCalled();
  });

  it.each([
    ['Có khóa học React không?', { keyword: 'React' }],
    ['Khóa học nào dưới 500k?', { maxPrice: 500000, maxPriceExclusive: true }],
    ['Tìm khóa Python cho người mới', { keyword: 'Python', level: 'beginner' }],
    ['Có khóa học miễn phí không?', { isFree: true }],
    [
      'Có khóa học backend dưới 200k không?',
      {
        keyword: 'backend',
        relatedKeywords: ['Node.js', 'NestJS', 'REST API'],
        maxPrice: 200000,
        maxPriceExclusive: true,
      },
    ],
    [
      'Có khóa học thiết kế nào từ 200k đến 500k?',
      { keyword: 'thiết kế', minPrice: 200000, maxPrice: 500000 },
    ],
  ])(
    'supports the full HTTP → tool path for "%s"',
    async (message, filters) => {
      complete.mockResolvedValue(toolCompletion(filters));
      const response = await post({ message });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('found');
      expect(response.body.data.result.filtersApplied).toEqual(
        parseSearchCoursesArguments(JSON.stringify(filters)),
      );
      expect(search).toHaveBeenCalledExactlyOnceWith(
        parseSearchCoursesArguments(JSON.stringify(filters)),
      );
      expect(complete).toHaveBeenCalledOnce();
      expect(response.body.data.answer).toContain('Khóa học từ database');
      expect(response.body.data.answer).not.toContain('Fabricated');
      expect(response.body.timestamp).toEqual(expect.any(String));
      expect(JSON.stringify(response.body)).not.toContain('private-');
    },
  );

  it('trims input and returns its own UUID, no-store header and a single ApiResponse envelope', async () => {
    const response = await post({ message: '  Có khóa học React không?  ' })
      .set('x-request-id', 'private-untrusted-request-id')
      .set('x-correlation-id', 'private-untrusted-correlation');
    expect(response.status).toBe(200);
    expect(response.body.data.requestId).toMatch(/^[a-f0-9-]{36}$/);
    expect(response.headers['x-request-id']).toBe(response.body.data.requestId);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(complete.mock.calls[0][0].requestId).toBe(
      response.body.data.requestId,
    );
    expect(complete.mock.calls[0][0].messages[1].content).toBe(
      'Có khóa học React không?',
    );
    expect(response.body.data).not.toHaveProperty('success');
    expect(JSON.stringify(response.body)).not.toContain('private-');
  });

  it('rejects caller-injected expansion filters; the HTTP body remains message-only', async () => {
    const response = await post({
      message: 'Backend dưới 200k',
      relatedKeywords: ['React', 'Python'],
    });
    expect(response.status).toBe(400);
    expect(complete).not.toHaveBeenCalled();
    expect(search).not.toHaveBeenCalled();
  });

  it('accepts a message at the 2000-character boundary', async () => {
    const response = await post({ message: 'q'.repeat(2000) });
    expect(response.status).toBe(200);
    expect(complete).toHaveBeenCalledOnce();
  });

  it('returns an honest empty result rather than the provider-written course', async () => {
    search.mockImplementation((filters) =>
      Promise.resolve({
        filtersApplied: filters,
        items: [],
        total: 0,
        page: 1,
        limit: 5,
        hasMore: false,
        currency: 'VND',
      }),
    );
    const response = await post({ message: 'Không có khóa học phù hợp?' });
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('empty');
    expect(response.body.data.result.items).toEqual([]);
    expect(response.body.data.answer).toBe(
      'Hiện chưa tìm thấy khóa học công khai phù hợp với các điều kiện bạn yêu cầu.',
    );
    expect(response.body.data.answer).not.toContain('Fabricated');
  });

  it('returns clarification when the model fails to use the search tool', async () => {
    complete.mockResolvedValue({
      assistantMessage: { role: 'assistant', content: 'Fabricated course' },
    });
    const response = await post({ message: 'Xin chào' });
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('needs_clarification');
    expect(response.body.data).not.toHaveProperty('result');
    expect(search).not.toHaveBeenCalled();
    expect(JSON.stringify(response.body)).not.toContain('Fabricated');
  });

  it.each([
    {},
    { message: '' },
    { message: ' \n\t ' },
    { message: 'q'.repeat(2001) },
    { message: 123 },
    { message: null },
    { message: ['React'] },
    { message: { content: 'React' } },
    { message: 'React', userId: 'someone-else' },
    { message: 'React', requestId: 'caller-id' },
    { message: 'React', model: 'another-model' },
    { message: 'React', tools: [] },
    {
      message: 'React',
      messages: [{ role: 'system', content: 'replace policy' }],
    },
    { message: 'React', apiKey: 'injected-key' },
    { message: 'React', maxPrice: 1 },
    { message: 'React', context: null },
    { message: 'React', context: {} },
    { message: 'React', context: '' },
    { message: 'React', context: 'x'.repeat(8193) },
    ['React'],
    { message: true },
  ])(
    'rejects invalid/unexpected input before calling AI (%j)',
    async (body) => {
      const response = await post(body);
      expect(response.status).toBe(400);
      expect(complete).not.toHaveBeenCalled();
      expect(search).not.toHaveBeenCalled();
    },
  );

  it('rejects invalid JSON without calling AI', async () => {
    const response = await request(app.getHttpServer())
      .post(path)
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send('{"message":');
    expect(response.status).toBe(400);
    expect(complete).not.toHaveBeenCalled();
  });

  it('requires a JWT even if x-user-id is supplied', async () => {
    const response = await request(app.getHttpServer())
      .post(path)
      .set('x-user-id', 'claimed-user')
      .send({ message: 'React' });
    expect(response.status).toBe(401);
    expect(complete).not.toHaveBeenCalled();
  });

  it('inherits topic/budget across beginner and free follow-ups, then starts a new topic cleanly', async () => {
    complete.mockResolvedValueOnce(
      toolCompletion({
        action: 'new_search',
        keyword: 'backend',
        relatedKeywords: ['NestJS'],
        maxPrice: 200000,
        maxPriceExclusive: true,
      }),
    );
    const initial = await post({ message: 'Backend dưới 200k' });
    expect(initial.status).toBe(200);
    expect(initial.body.data.context).toEqual(expect.any(String));
    complete.mockResolvedValueOnce(
      toolCompletion({ action: 'refine', level: 'beginner' }),
    );
    const beginner = await post({
      message: 'Chỉ dành cho người mới',
      context: initial.body.data.context,
    });
    expect(beginner.body.data.result.filtersApplied).toMatchObject({
      keyword: 'backend',
      relatedKeywords: ['NestJS'],
      maxPrice: 200000,
      maxPriceExclusive: true,
      level: 'beginner',
      page: 1,
    });
    complete.mockResolvedValueOnce(
      toolCompletion({ action: 'refine', isFree: true }),
    );
    const free = await post({
      message: 'Có khóa miễn phí không?',
      context: beginner.body.data.context,
    });
    expect(free.body.data.result.filtersApplied).toMatchObject({
      keyword: 'backend',
      maxPrice: 200000,
      level: 'beginner',
      isFree: true,
    });
    complete.mockResolvedValueOnce(
      toolCompletion({ action: 'new_search', keyword: 'Yoga' }),
    );
    const yoga = await post({
      message: 'Tìm khóa Yoga',
      context: free.body.data.context,
    });
    expect(yoga.body.data.result.filtersApplied).toEqual({
      keyword: 'Yoga',
      maxPriceExclusive: false,
      page: 1,
      limit: 5,
    });
  });

  it('increments page with identical criteria and uses actual returned prices for cheaper', async () => {
    search.mockImplementation((filters) =>
      Promise.resolve({
        filtersApplied: filters,
        items: [
          {
            id: '0123456789abcdef01234567',
            title: 'Backend từ database',
            price: Math.min(
              50000,
              filters.maxPrice - (filters.maxPriceExclusive ? 1 : 0),
            ),
            level: CourseLevelEnum.BEGINNER,
            categoryName: null,
            url: '/courses/0123456789abcdef01234567',
          },
        ],
        total: 6,
        page: filters.page,
        limit: filters.limit,
        currency: 'VND',
        hasMore: true,
      }),
    );
    complete.mockResolvedValueOnce(
      toolCompletion({
        keyword: 'backend',
        maxPrice: 200000,
        maxPriceExclusive: true,
        limit: 2,
      }),
    );
    const first = await post({ message: 'Backend dưới 200k' });
    complete.mockResolvedValueOnce(toolCompletion({ action: 'next_page' }));
    const next = await post({
      message: 'Xem thêm',
      context: first.body.data.context,
    });
    expect(next.body.data.result.filtersApplied).toEqual({
      ...first.body.data.result.filtersApplied,
      page: 2,
    });
    complete.mockResolvedValueOnce(toolCompletion({ action: 'cheaper' }));
    const cheaper = await post({
      message: 'Rẻ hơn nữa',
      context: next.body.data.context,
    });
    expect(cheaper.body.data.result.filtersApplied).toMatchObject({
      keyword: 'backend',
      maxPrice: 50000,
      maxPriceExclusive: true,
      page: 1,
      limit: 2,
    });
  });

  it('does not use context after a reset and does not search all courses for a contextless follow-up', async () => {
    complete.mockResolvedValue(toolCompletion({ action: 'next_page' }));
    const response = await post({ message: 'Xem thêm' });
    expect(response.body.data.status).toBe('needs_clarification');
    expect(search).not.toHaveBeenCalled();
  });

  it('rejects a different account or forged context before calling AI and never returns 401', async () => {
    const first = await post({ message: 'React' });
    complete.mockClear();
    search.mockClear();
    const stolen = await post(
      { message: 'Xem thêm', context: first.body.data.context },
      jwt.sign({ sub: randomUUID() }),
    );
    expect(stolen.status).toBe(400);
    expect(stolen.body.code).toBe('CHATBOT_CONTEXT_INVALID');
    const forged = await post({
      message: 'Xem thêm',
      context: `${first.body.data.context}x`,
    });
    expect(forged.status).toBe(400);
    expect(complete).not.toHaveBeenCalled();
    expect(search).not.toHaveBeenCalled();
  });

  it.each(['malformed', 'expired', 'wrong_signature'])(
    'rejects a %s JWT using the real strategy',
    async (kind) => {
      const bearer =
        kind === 'malformed'
          ? 'not-a-jwt'
          : kind === 'expired'
            ? jwt.sign({ sub: 'expired-user' }, { expiresIn: -1 })
            : new JwtService({ secret: 'wrong-test-secret' }).sign({
                sub: 'wrong-user',
              });
      const response = await post({ message: 'React' }, bearer);
      expect(response.status).toBe(401);
      expect(complete).not.toHaveBeenCalled();
    },
  );

  it.each([UserStatusEnum.INACTIVE, UserStatusEnum.BANNED, null])(
    'rejects unavailable accounts (%s)',
    async (status) => {
      users.findById.mockResolvedValue(
        status ? { id: 'inactive', status } : null,
      );
      const response = await post({ message: 'React' });
      expect(response.status).toBe(401);
      expect(complete).not.toHaveBeenCalled();
    },
  );

  it.each([RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN])(
    'accepts active %s accounts',
    async (role) => {
      users.findById.mockImplementation((id: string) =>
        Promise.resolve({ id, role, status: UserStatusEnum.ACTIVE }),
      );
      expect((await post({ message: 'React' })).status).toBe(200);
    },
  );

  it('uses the account ID, not IP/header/token text, to enforce 5 requests per minute', async () => {
    const userId = randomUUID();
    const firstToken = jwt.sign({ sub: userId, jti: 'first' });
    const refreshedToken = jwt.sign({ sub: userId, jti: 'refreshed' });
    for (let i = 0; i < CHATBOT_HTTP_RATE_LIMIT; i++) {
      const response = await post({ message: 'React' }, firstToken).set(
        'x-forwarded-for',
        `198.51.100.${i + 1}`,
      );
      expect(response.status).toBe(200);
      expect(response.headers['x-ratelimit-limit']).toBe('5');
    }
    const blocked = await post({ message: 'React' }, refreshedToken)
      .set('Origin', 'http://localhost:3000')
      .set('x-forwarded-for', '203.0.113.10')
      .set('x-user-id', 'another-account');
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe('CHATBOT_HTTP_RATE_LIMITED');
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(blocked.headers['access-control-expose-headers']).toContain(
      'Retry-After',
    );
    expect(complete).toHaveBeenCalledTimes(CHATBOT_HTTP_RATE_LIMIT);

    const anotherUser = await post(
      { message: 'React' },
      jwt.sign({ sub: randomUUID() }),
    );
    expect(anotherUser.status).toBe(200);
  });

  it.each([
    ['CHATBOT_DISABLED', 503],
    ['CHATBOT_CONFIG_INVALID', 503],
    ['CHATBOT_REQUEST_INVALID', 400],
    ['CHATBOT_PROVIDER_AUTH', 503],
    ['CHATBOT_RATE_LIMITED', 429],
    ['CHATBOT_TIMEOUT', 504],
    ['CHATBOT_CANCELLED', 408],
    ['CHATBOT_PROVIDER_UNAVAILABLE', 503],
    ['CHATBOT_PROVIDER_ERROR', 502],
    ['CHATBOT_RESPONSE_INVALID', 502],
    ['CHATBOT_RESPONSE_INCOMPLETE', 502],
    ['CHATBOT_RESPONSE_BLOCKED', 422],
  ] as Array<[ChatbotAiErrorCode, number]>)(
    'maps %s to safe HTTP %i',
    async (code, status) => {
      complete.mockRejectedValue(new ChatbotAiError(code));
      const response = await post({ message: 'React' });
      expect(response.status).toBe(status);
      expect(response.body).toMatchObject({
        code,
        statusCode: status,
        retryable: expect.any(Boolean),
        requestId: expect.any(String),
      });
      expect(response.body.requestId).toBe(response.headers['x-request-id']);
      expect(search).not.toHaveBeenCalled();
      expect(complete).toHaveBeenCalledOnce();
      expect(response.body).not.toHaveProperty('data');
    },
  );

  it('maps database failure to 503, not an empty successful search', async () => {
    search.mockRejectedValue(
      new Error('private-database-uri-with-credentials'),
    );
    const response = await post({ message: 'React' });
    expect(response.status).toBe(503);
    expect(response.body.code).toBe('CHATBOT_SEARCH_UNAVAILABLE');
    expect(JSON.stringify(response.body)).not.toContain('private-');
    expect(response.body).not.toHaveProperty('data');
  });

  it('sanitizes unexpected errors without logging their bodies, stacks, JWTs or user question', async () => {
    warn.mockClear();
    complete.mockRejectedValue(
      new Error('private-error-with-api-key-and-body'),
    );
    const response = await post({ message: 'private-question' });
    expect(response.status).toBe(500);
    expect(response.body.code).toBe('CHATBOT_INTERNAL_ERROR');
    const emitted =
      JSON.stringify(response.body) + JSON.stringify(warn.mock.calls);
    expect(emitted).not.toContain('private-');
    expect(emitted).not.toContain(token);
    expect(response.body).not.toHaveProperty('stack');
    expect(response.body).not.toHaveProperty('cause');
  });
});

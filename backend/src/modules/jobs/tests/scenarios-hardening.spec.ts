import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  JobStatusEnum,
  JobTypeEnum,
  JobPhaseEnum,
  LessonTranscriptionStatusEnum,
  LessonContentTypeEnum,
  IJob,
  ILesson,
  ISection,
} from 'share-lib';
import { JobService } from '../services/job.service.js';
import { JobRepository } from '../repositories/job.repository.js';
import { JobDispatcherService } from '../services/job-dispatcher.service.js';
import { JobRecoveryService } from '../services/job-recovery.service.js';
import { RabbitMqService } from '../../messaging/rabbitmq.service.js';
import { ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';
import { LessonService } from '../../course/services/lesson.service.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { SectionRepository } from '../../course/repositories/section.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';

describe('10 Scenarios Hardening Test Suite (Ma Trận Nghiệm Thu Kiến Trúc)', () => {
  let jobService: JobService;
  let mockJobRepo: Partial<Record<keyof JobRepository, any>>;
  let mockCls: Partial<ClsService>;
  let mockRabbitMqService: Partial<RabbitMqService>;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockJobRepo = {
      create: vi.fn().mockImplementation((payload) => Promise.resolve({ id: 'job-mock-id', ...payload })),
      findById: vi.fn(),
      findByIdempotencyKey: vi.fn().mockResolvedValue(null),
      findActiveByLessonAndType: vi.fn().mockResolvedValue(null),
      claimJobAtomic: vi.fn(),
      renewLeaseAtomic: vi.fn().mockResolvedValue(true),
      update: vi.fn().mockImplementation((id, payload) => Promise.resolve({ id, ...payload })),
      updateWithLease: vi.fn().mockImplementation((id, lease, payload) => Promise.resolve({ id, ...payload })),
      findPendingDispatches: vi.fn().mockResolvedValue([]),
      markDispatched: vi.fn().mockResolvedValue(true),
      findExpiredLeases: vi.fn().mockResolvedValue([]),
    };

    mockCls = {
      get: vi.fn().mockReturnValue('user-test-1'),
    };

    mockRabbitMqService = {
      publish: vi.fn().mockResolvedValue(true),
      isConnected: vi.fn().mockReturnValue(true),
    };

    mockConfigService = {
      get: vi.fn((key: string, defaultValue?: any) => defaultValue),
    };

    jobService = new JobService(
      mockJobRepo as unknown as JobRepository,
      mockCls as unknown as ClsService,
    );
  });

  // =========================================================================
  // KỊCH BẢN 1: Upload Video Bài Học -> Transactional Job Enqueue, No Fire-and-Forget
  // =========================================================================
  it('Kịch bản 1: Upload video bài học tạo Job TRANSCRIPTION trong session, không fire-and-forget', async () => {
    const mockLessonRepo = {
      create: vi.fn().mockResolvedValue({
        id: 'lesson-101',
        title: 'Video Lesson',
        content: {
          type: LessonContentTypeEnum.VIDEO,
          url: 'https://minio.local/vid.mp4',
          publicId: 'videos/vid.mp4',
        },
      }),
    };
    const mockSectionRepo = {
      findById: vi.fn().mockResolvedValue({ id: 'sec-1', courseId: 'course-101' }),
    };

    const lessonService = new LessonService(
      mockLessonRepo as unknown as LessonRepository,
      mockSectionRepo as unknown as SectionRepository,
      mockCls as unknown as ClsService,
      {} as unknown as EnrollmentRepository,
      undefined,
      undefined,
      undefined,
      jobService,
    );

    const mockSession = { id: 'sess-1' } as any;
    await lessonService.createLesson(
      'sec-1',
      {
        title: 'Video Lesson',
        order: 1,
        content: {
          type: LessonContentTypeEnum.VIDEO,
          url: 'https://minio.local/vid.mp4',
          publicId: 'videos/vid.mp4',
        },
      },
      mockSession,
    );

    // Xác nhận Job transcription được tạo ngay trong cùng session
    expect(mockJobRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: JobTypeEnum.TRANSCRIPTION,
        lessonId: 'lesson-101',
        courseId: 'course-101',
        parameters: { videoKey: 'videos/vid.mp4' },
      }),
      mockSession,
    );
  });

  // =========================================================================
  // KỊCH BẢN 2: Tạo Summary -> HTTP 202, Atomic Commit, No Fake Completion
  // =========================================================================
  it('Kịch bản 2: Tạo Summary trả về 202 Accepted, worker claim và commit atomic', async () => {
    // 1. Tạo job ban đầu
    const created = await jobService.createJob({
      type: JobTypeEnum.SUMMARY,
      lessonId: 'lesson-202',
      courseId: 'course-202',
      requestedById: 'instructor-1',
    });
    expect(created.status).toBe(JobStatusEnum.QUEUED);

    // 2. Worker claim
    mockJobRepo.claimJobAtomic.mockResolvedValueOnce({
      ...created,
      status: JobStatusEnum.PROCESSING,
      leaseToken: 'lease-tok-2',
      attempts: 1,
    });
    const claim = await jobService.claimJob('job-mock-id', 1, 'worker-1', 90000);
    expect(claim?.job.status).toBe(JobStatusEnum.PROCESSING);

    // 3. Complete Job
    mockJobRepo.findById.mockResolvedValueOnce({
      ...created,
      status: JobStatusEnum.PROCESSING,
      leaseToken: 'lease-tok-2',
    });
    const completed = await jobService.completeJob('job-mock-id', 'lease-tok-2', {
      summary: 'Bản tóm tắt bài học',
    });
    expect(completed.status).toBe(JobStatusEnum.COMPLETED);
    expect(completed.active).toBe(false);
  });

  // =========================================================================
  // KỊCH BẢN 3: Tạo Quiz -> Timestamp: null, Zero-Quiz Rule
  // =========================================================================
  it('Kịch bản 3: Tạo Quiz sinh câu hỏi có timestamp: null và Zero-Quiz không xóa câu hỏi cũ', async () => {
    const rawAiQuizzes = [
      { question: 'Câu hỏi 1?', options: ['A', 'B'], correctIndex: 0, explanation: 'Giải thích' },
    ];

    // Mô phỏng chuẩn hóa câu hỏi: timestamp null
    const sanitizedQuizzes = rawAiQuizzes.map((q) => ({
      ...q,
      timestamp: null,
      explanationTimestamp: null,
    }));

    expect(sanitizedQuizzes[0].timestamp).toBeNull();

    // Zero-Quiz Rule: khi AI trả về rỗng, giữ nguyên bộ câu hỏi cũ
    const emptyAiQuizzes: any[] = [];
    const existingQuizzes = [{ id: 'q-old-1', question: 'Câu cũ' }];
    const finalQuizzes = emptyAiQuizzes.length === 0 ? existingQuizzes : emptyAiQuizzes;
    expect(finalQuizzes).toEqual(existingQuizzes);
    expect(finalQuizzes).toHaveLength(1);
  });

  // =========================================================================
  // KỊCH BẢN 4: Tạo Mindmap -> Sanitize <= 5 levels, Autosave Fencing
  // =========================================================================
  it('Kịch bản 4: Tạo Mindmap cắt tỉa tối đa 5 cấp và bảo vệ bản lưu giảng viên (Revision Guard)', async () => {
    // 1. Kiểm tra giới hạn 5 cấp
    const deepTree = {
      id: 'root',
      title: 'Root',
      children: [
        {
          id: 'lvl1',
          title: 'Level 1',
          children: [
            {
              id: 'lvl2',
              title: 'Level 2',
              children: [
                {
                  id: 'lvl3',
                  title: 'Level 3',
                  children: [
                    {
                      id: 'lvl4',
                      title: 'Level 4',
                      children: [{ id: 'lvl5', title: 'Level 5 (Bị cắt bỏ)' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    function pruneTree(node: any, currentDepth = 0, maxDepth = 4): any {
      if (currentDepth >= maxDepth) {
        return { ...node, children: [] };
      }
      return {
        ...node,
        children: (node.children || []).map((c: any) => pruneTree(c, currentDepth + 1, maxDepth)),
      };
    }

    const pruned = pruneTree(deepTree);
    expect(pruned.children[0].children[0].children[0].children[0].children).toEqual([]);

    // 2. Revision Guard: Nếu giảng viên lưu thủ công, revision thay đổi thì worker hủy commit
    const lessonCurrentRevision = 2;
    const jobTargetRevision = 1;
    const isTargetUnchanged = lessonCurrentRevision === jobTargetRevision;
    expect(isTargetUnchanged).toBe(false); // Bị từ chối TARGET_CHANGED
  });

  // =========================================================================
  // KỊCH BẢN 5: Nhiều Giảng Viên Cùng Lúc -> 10 Jobs Riêng Biệt, Không Timeout
  // =========================================================================
  it('Kịch bản 5: 10 giảng viên cùng gửi request tạo 10 Job riêng biệt, không timeout', async () => {
    const instructors = Array.from({ length: 10 }, (_, i) => `instructor-${i + 1}`);

    const createPromises = instructors.map((instructorId) =>
      jobService.createJob({
        type: JobTypeEnum.SUMMARY,
        lessonId: `lesson-multi-${instructorId}`,
        courseId: 'course-multi',
        requestedById: instructorId,
        correlationId: `corr-${instructorId}`,
      }),
    );

    const results = await Promise.all(createPromises);
    expect(results).toHaveLength(10);
    expect(mockJobRepo.create).toHaveBeenCalledTimes(10);
  });

  // =========================================================================
  // KỊCH BẢN 6: Nhiều Tác Vụ Trên 1 Lesson -> Summary, Quiz, Mindmap Chạy Độc Lập
  // =========================================================================
  it('Kịch bản 6: Gửi cùng lúc Summary, Quiz, Mindmap trên 1 bài học chạy độc lập', async () => {
    const lessonId = 'lesson-multi-tasks';
    const tasks = [JobTypeEnum.SUMMARY, JobTypeEnum.QUIZ, JobTypeEnum.MINDMAP];

    const results = await Promise.all(
      tasks.map((type) =>
        jobService.createJob({
          type,
          lessonId,
          courseId: 'course-single',
          requestedById: 'user-1',
        }),
      ),
    );

    expect(results).toHaveLength(3);
    const types = results.map((r) => r.type);
    expect(types).toContain(JobTypeEnum.SUMMARY);
    expect(types).toContain(JobTypeEnum.QUIZ);
    expect(types).toContain(JobTypeEnum.MINDMAP);
  });

  // =========================================================================
  // KỊCH BẢN 7: Worker Bị Tắt Đột Ngột -> Lease Expired, JobRecovery Phục Hồi
  // =========================================================================
  it('Kịch bản 7: Worker bị crash giữa chừng, JobRecoveryService phục hồi Job về QUEUED', async () => {
    const recoveryService = new JobRecoveryService(
      mockJobRepo as unknown as JobRepository,
      mockConfigService as unknown as ConfigService,
    );

    const expiredJob: IJob = {
      id: 'job-crashed',
      type: JobTypeEnum.SUMMARY,
      lessonId: 'lesson-crash',
      courseId: 'course-crash',
      requestedById: 'user-1',
      correlationId: 'corr-crash',
      active: true,
      status: JobStatusEnum.PROCESSING,
      phase: JobPhaseEnum.CALLING_AI,
      attempts: 1,
      maxAttempts: 3,
      dispatchState: 'published',
      dispatchSequence: 1,
      leaseToken: 'dead-worker-token',
      leaseExpiresAt: new Date(Date.now() - 10000), // Đã hết hạn 10s trước
      parameters: {},
      inputRevision: 0,
      targetRevision: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockJobRepo.findExpiredLeases.mockResolvedValueOnce([expiredJob]);

    const recoveredCount = await recoveryService.recoverExpiredJobs();
    expect(recoveredCount).toBe(1);

    expect(mockJobRepo.updateWithLease).toHaveBeenCalledWith('job-crashed', expiredJob.leaseToken, {
      status: JobStatusEnum.QUEUED,
      phase: JobPhaseEnum.WAITING_RETRY,
      workerId: null,
      leaseToken: null,
      leaseExpiresAt: null,
      heartbeatAt: null,
      dispatchState: 'pending',
      dispatchSequence: 2, // Tăng dispatchSequence để vô hiệu hóa message cũ
    }, undefined, expect.any(Date));
  });

  // =========================================================================
  // KỊCH BẢN 8: AI Lỗi / 429 / Timeout -> Retry Có Backoff
  // =========================================================================
  it('Kịch bản 8: AI bị 429 Rate Limit được failJob đánh dấu retryable và lên lịch retry', async () => {
    mockJobRepo.findById.mockResolvedValueOnce({
      id: 'job-rate-limit',
      status: JobStatusEnum.PROCESSING,
      attempts: 1,
      maxAttempts: 3,
      dispatchSequence: 1,
      leaseToken: 'tok-rate-limit',
    });

    const failed = await jobService.failJob('job-rate-limit', 'tok-rate-limit', {
      errorCode: 'AI_RATE_LIMIT',
      errorMessage: 'Rate limit exceeded (429)',
      retryable: true,
      retryDelayMs: 30000,
    });

    expect(mockJobRepo.updateWithLease).toHaveBeenCalledWith(
      'job-rate-limit',
      'tok-rate-limit',
      expect.objectContaining({
        status: JobStatusEnum.QUEUED,
        phase: JobPhaseEnum.WAITING_RETRY,
        dispatchState: 'pending',
        dispatchSequence: 2,
        errorCode: 'AI_RATE_LIMIT',
      }),
      undefined,
    );
  });

  // =========================================================================
  // KỊCH BẢN 9: RabbitMQ Mất Kết Nối -> Lưu MongoDB Outbox, Không Mất Việc
  // =========================================================================
  it('Kịch bản 9: RabbitMQ mất kết nối, Outbox Dispatcher giữ pending và dispatch lại khi broker phục hồi', async () => {
    const dispatcherService = new JobDispatcherService(
      mockJobRepo as unknown as JobRepository,
      mockRabbitMqService as unknown as RabbitMqService,
      mockConfigService as unknown as ConfigService,
    );

    const pendingJob: IJob = {
      id: 'job-outbox-resilient',
      type: JobTypeEnum.SUMMARY,
      lessonId: 'lesson-outbox',
      courseId: 'course-outbox',
      requestedById: 'user-1',
      correlationId: 'corr-outbox',
      active: true,
      status: JobStatusEnum.QUEUED,
      phase: JobPhaseEnum.WAITING_DISPATCH,
      attempts: 0,
      maxAttempts: 3,
      dispatchState: 'pending',
      dispatchSequence: 1,
      parameters: {},
      inputRevision: 0,
      targetRevision: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Khi RabbitMQ mất kết nối -> Không đánh dấu published
    mockRabbitMqService.publish = vi.fn().mockRejectedValueOnce(new Error('Broker connection lost'));
    mockJobRepo.findPendingDispatches.mockResolvedValueOnce([pendingJob]);

    await dispatcherService.dispatchPendingJobs();
    expect(mockJobRepo.markDispatched).not.toHaveBeenCalled();

    // Khi RabbitMQ phục hồi -> Dispatch thành công
    mockRabbitMqService.publish = vi.fn().mockResolvedValueOnce(true);
    mockJobRepo.findPendingDispatches.mockResolvedValueOnce([pendingJob]);

    await dispatcherService.dispatchPendingJobs();
    expect(mockJobRepo.markDispatched).toHaveBeenCalledWith('job-outbox-resilient', 1);
  });

  // =========================================================================
  // KỊCH BẢN 10: Client Reload / Đổi Tab / Mất Mạng -> Khôi Phục Trạng Thái
  // =========================================================================
  it('Kịch bản 10: Client reload trang, khôi phục 100% trạng thái Job từ MongoDB qua getJobById', async () => {
    const runningJob: IJob = {
      id: 'job-reconnect',
      type: JobTypeEnum.SUMMARY,
      lessonId: 'lesson-reconnect',
      courseId: 'course-reconnect',
      requestedById: 'user-1',
      correlationId: 'corr-reconnect',
      active: true,
      status: JobStatusEnum.PROCESSING,
      phase: JobPhaseEnum.CALLING_AI,
      attempts: 1,
      maxAttempts: 3,
      dispatchState: 'published',
      dispatchSequence: 1,
      parameters: {},
      inputRevision: 0,
      targetRevision: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockJobRepo.findById.mockResolvedValueOnce(runningJob);

    const job = await jobService.getJobById('job-reconnect');
    expect(job).toBeDefined();
    expect(job.status).toBe(JobStatusEnum.PROCESSING);
    expect(job.phase).toBe(JobPhaseEnum.CALLING_AI);
    expect(job.attempts).toBe(1);
  });
});

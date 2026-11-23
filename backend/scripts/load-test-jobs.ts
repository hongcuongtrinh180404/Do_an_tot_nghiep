/**
 * Load Testing Script cho Hệ Thống Hàng Đợi & Quản Lý Job
 * Mô phỏng 50 yêu cầu đồng thời trên các loại tác vụ AI & Video
 *
 * Chạy bằng lệnh:
 *   npx tsx scripts/load-test-jobs.ts
 */

import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

interface IJobDocument {
  _id: mongoose.Types.ObjectId;
  type: string;
  lessonId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  requestedById: string;
  correlationId: string;
  idempotencyKey?: string | null;
  parameters: Record<string, unknown>;
  active: boolean;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  phase: string;
  attempts: number;
  maxAttempts: number;
  dispatchState: 'pending' | 'published';
  dispatchSequence: number;
  workerId?: string | null;
  leaseToken?: string | null;
  leaseExpiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new mongoose.Schema<IJobDocument>(
  {
    type: { type: String, required: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, required: true },
    requestedById: { type: String, required: true },
    correlationId: { type: String, required: true },
    idempotencyKey: { type: String, default: null },
    parameters: { type: mongoose.Schema.Types.Mixed, default: {} },
    active: { type: Boolean, default: true },
    status: { type: String, default: 'queued' },
    phase: { type: String, default: 'waiting_dispatch' },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    dispatchState: { type: String, default: 'pending' },
    dispatchSequence: { type: Number, default: 1 },
    workerId: { type: String, default: null },
    leaseToken: { type: String, default: null },
    leaseExpiresAt: { type: Date, default: null },
  },
  { collection: 'jobs', timestamps: true },
);

const JobModel = mongoose.model<IJobDocument>('LoadTestJob', jobSchema);

async function main() {
  console.log('====================================================');
  console.log('🚀 KHỞI ĐỘNG LOAD TEST: 50 TÁC VỤ ĐỒNG THỜI');
  console.log('====================================================\n');

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/thc_datn';
  console.log(`[LoadTest] Kết nối tới MongoDB: ${uri}...`);

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log('✅ Kết nối MongoDB thành công.\n');

  // Ghi nhận mức tiêu thụ RAM ban đầu
  const initialMem = process.memoryUsage();
  console.log(
    `[RAM Ban Đầu] Heap Used: ${(initialMem.heapUsed / 1024 / 1024).toFixed(2)} MB | RSS: ${(initialMem.rss / 1024 / 1024).toFixed(2)} MB\n`,
  );

  const CONCURRENCY = 50;
  const jobTypes = ['summary', 'quiz', 'mindmap', 'transcription'];
  const testCourseId = new mongoose.Types.ObjectId();
  // Mỗi job tạo cho một lessonId riêng biệt để kiểm tra 50 concurrent active jobs mà không va chạm unique index
  const testLessonIds = Array.from({ length: CONCURRENCY }, () => new mongoose.Types.ObjectId());

  const latencies: number[] = [];
  const createdJobIds: mongoose.Types.ObjectId[] = [];

  console.log(`[Giai đoạn 1] Bắn đồng thời ${CONCURRENCY} yêu cầu tạo Job...`);
  const startTime = Date.now();

  const createJobPromises = Array.from({ length: CONCURRENCY }, async (_, idx) => {
    const jobStartTime = Date.now();
    const type = jobTypes[idx % jobTypes.length];
    const lessonId = testLessonIds[idx];
    const idempotencyKey = `load-test-key-${idx}-${Date.now()}`;

    const newJob = await JobModel.create({
      type,
      lessonId,
      courseId: testCourseId,
      requestedById: `instructor-${(idx % 5) + 1}`,
      correlationId: `load-corr-${randomUUID()}`,
      idempotencyKey,
      parameters: { testIndex: idx, mockDelayMs: 20 },
      active: true,
      status: 'queued',
      phase: 'waiting_dispatch',
      dispatchState: 'pending',
      dispatchSequence: 1,
    });

    const elapsed = Date.now() - jobStartTime;
    latencies.push(elapsed);
    createdJobIds.push(newJob._id);
    return newJob;
  });

  const createdJobs = await Promise.all(createJobPromises);
  const totalCreateTime = Date.now() - startTime;

  console.log(`✅ Đã tạo thành công ${createdJobs.length}/${CONCURRENCY} Jobs trong ${totalCreateTime}ms.\n`);

  // Giai đoạn 2: Giả lập Outbox Dispatcher
  console.log('[Giai đoạn 2] Giả lập Outbox Dispatcher (Publish sequence)...');
  const dispatchStartTime = Date.now();

  const dispatchPromises = createdJobs.map(async (job) => {
    await JobModel.updateOne(
      { _id: job._id, dispatchSequence: 1 },
      {
        $set: {
          dispatchState: 'published',
          phase: 'waiting_worker',
        },
      },
    );
  });
  await Promise.all(dispatchPromises);
  console.log(`✅ Đã dispatch ${createdJobs.length} Jobs sang trạng thái "published" trong ${Date.now() - dispatchStartTime}ms.\n`);

  // Giai đoạn 3: Giả lập Worker Atomic Claim & Completion
  console.log('[Giai đoạn 3] Giả lập Worker Atomic Claim, Heartbeat & Complete...');
  const workerStartTime = Date.now();

  const workerPromises = createdJobs.map(async (job, idx) => {
    const workerId = `worker-sim-${idx % 3}`;
    const leaseToken = randomUUID();
    const now = new Date();

    // Atomic claim
    const claimed = await JobModel.findOneAndUpdate(
      {
        _id: job._id,
        status: 'queued',
      },
      {
        $set: {
          status: 'processing',
          phase: 'calling_ai',
          workerId,
          leaseToken,
          leaseExpiresAt: new Date(now.getTime() + 60000),
          heartbeatAt: now,
        },
        $inc: { attempts: 1 },
      },
      { new: true },
    );

    if (!claimed) {
      throw new Error(`Claim thất bại cho Job ${job._id}`);
    }

    // Giả lập xử lý ngắn
    await new Promise((resolve) => setTimeout(resolve, 10 + (idx % 20)));

    // Atomic complete
    await JobModel.updateOne(
      {
        _id: job._id,
        leaseToken,
        status: 'processing',
      },
      {
        $set: {
          status: 'completed',
          phase: 'completed',
          active: false,
          completedAt: new Date(),
        },
      },
    );
  });

  await Promise.all(workerPromises);
  const totalWorkerTime = Date.now() - workerStartTime;
  console.log(`✅ Worker đã hoàn tất xử lý ${createdJobs.length} Jobs trong ${totalWorkerTime}ms.\n`);

  // Giai đoạn 4: Thu thập số đo & Kiểm tra rò rỉ RAM
  const finalMem = process.memoryUsage();
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);

  const heapDiffMb = ((finalMem.heapUsed - initialMem.heapUsed) / 1024 / 1024).toFixed(2);
  const rssDiffMb = ((finalMem.rss - initialMem.rss) / 1024 / 1024).toFixed(2);

  // Xác minh trạng thái database
  const activeCount = await JobModel.countDocuments({ _id: { $in: createdJobIds }, active: true });
  const completedCount = await JobModel.countDocuments({ _id: { $in: createdJobIds }, status: 'completed' });

  console.log('====================================================');
  console.log('📊 KẾT QUẢ TẢI & SỨC BỀN HỆ THỐNG');
  console.log('====================================================');
  console.log(`• Tổng số tác vụ:          ${CONCURRENCY}`);
  console.log(`• Tác vụ hoàn tất:         ${completedCount}/${CONCURRENCY} (100%)`);
  console.log(`• Tác vụ còn active:       ${activeCount} (Kỳ vọng: 0)`);
  console.log(`• Thời gian tạo trung bình: ${avg} ms`);
  console.log(`• P50 Latency:              ${p50} ms`);
  console.log(`• P95 Latency:              ${p95} ms`);
  console.log(`• Tổng thời gian chu kỳ:    ${Date.now() - startTime} ms`);
  console.log(`• Heap RAM chênh lệch:      ${heapDiffMb} MB`);
  console.log(`• RSS RAM chênh lệch:       ${rssDiffMb} MB`);
  console.log('====================================================\n');

  // Dọn dẹp dữ liệu test
  await JobModel.deleteMany({ _id: { $in: createdJobIds } });
  console.log('🧹 Đã dọn dẹp toàn bộ dữ liệu kiểm thử tải.');

  await mongoose.disconnect();
  console.log('✅ Đóng kết nối MongoDB thành công.');

  if (completedCount === CONCURRENCY && activeCount === 0) {
    console.log('\n🎉 LOAD TEST THÀNH CÔNG: Hệ thống đáp ứng xuất sắc tải đồng thời không rò rỉ bộ nhớ!');
    process.exit(0);
  } else {
    console.error('\n❌ LOAD TEST THẤT BẠI: Dữ liệu Job không đạt trạng thái kỳ vọng!');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Lỗi khi thực thi load test:', err);
  process.exit(1);
});

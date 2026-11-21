# Giai Đoạn 2: Nền Tảng Job Management & Outbox Dispatcher

> **Thuộc kế hoạch:** [`docs/chatbot/plan-rabbitmq-ai-jobs/README.md`](./README.md)  
> **Trạng thái:** Sẵn sàng thực hiện  
> **Giai đoạn trước:** [`phase-1-infrastructure-worker.md`](./phase-1-infrastructure-worker.md)  
> **Mục tiêu:** Xây dựng vòng đời Job bền vững trong MongoDB, mô hình Embedded Outbox, cơ chế Atomic Claim với Lease Token, dịch vụ phục hồi lỗi (Recovery), và các API quản lý/tra cứu Job.

---

## 1. Mục Tiêu Giai Đoạn

1. **Chuẩn Hóa Mô Hình Dữ Liệu:** Định nghĩa enum trạng thái (`JobStatus`, `JobType`, `JobPhase`) và schema `jobs` kế thừa `BaseAbstractDocument` theo chuẩn kiến trúc dự án.
2. **Cơ Chế Chống Trùng Hai Lớp:**
   - Lớp 1: Idempotency Key từ client (chống gửi trùng do mạng).
   - Lớp 2: Partial unique index `(lessonId, type)` khi `active: true` (ngăn chạy đồng thời 2 job cùng loại trên 1 bài học).
3. **Mô Hình Embedded Outbox & Dispatcher:** Đảm bảo Job không bao giờ bị rơi rớt ngay cả khi RabbitMQ gặp sự cố lúc API nhận việc.
4. **Atomic Claim & Lease Fencing:** Sử dụng cập nhật nguyên tử (`findAndModify`) trong MongoDB để cấp quyền xử lý (lease) cho Worker; ngăn chặn hoàn toàn hiện tượng 2 worker cùng làm 1 việc hoặc worker chậm ghi đè dữ liệu.
5. **Dịch Vụ Phục Hồi (JobRecoveryService):** Tự động phát hiện và đưa các Job có lease bị quá hạn (worker chết đột ngột) hoặc dispatch dở dang trở lại hàng đợi.
6. **API Tra Cứu Trạng Thái:** Cung cấp các endpoint GET trạng thái và POST retry thủ công.

---

## 2. Thiết Kế Kỹ Thuật Chi Tiết

### 2.1. Chuẩn Hóa Enums Trong `share-lib`

```typescript
// share-lib/src/enums/job-status.enum.ts
export enum JobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// share-lib/src/enums/job-type.enum.ts
export enum JobType {
  SUMMARY = 'summary',
  QUIZ = 'quiz',
  MINDMAP = 'mindmap',
  TRANSCRIPTION = 'transcription',
}

// share-lib/src/enums/job-phase.enum.ts
export enum JobPhase {
  WAITING_DISPATCH = 'waiting_dispatch',
  WAITING_WORKER = 'waiting_worker',
  WAITING_RETRY = 'waiting_retry',
  CALLING_AI = 'calling_ai',
  SAVING_RESULT = 'saving_result',
}
```

### 2.2. Schema MongoDB `jobs` (`backend/src/modules/jobs/schemas/job.schema.ts`)

Schema kế thừa `BaseAbstractDocument` (chứa `deletedAt`, `createdById`, `updatedById`, `createdAt`, `updatedAt`):

| Trường | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `type` | `enum (JobType)` | Loại tác vụ: `summary`, `quiz`, `mindmap`, `transcription` |
| `lessonId` | `ObjectId (ref: Lesson)` | Bài học mục tiêu |
| `courseId` | `ObjectId (ref: Course)` | Khóa học chứa bài học |
| `requestedById` | `ObjectId (ref: User)` | Giảng viên hoặc admin yêu cầu |
| `correlationId` | `string` | UUID theo vết xuyên suốt từ HTTP -> Outbox -> Worker -> Logs |
| `idempotencyKey` | `string` | Khóa chống trùng do client gửi |
| `requestHash` | `string` | Hash SHA256 của parameters đầu vào |
| `parameters` | `Record<string, unknown>` | Cấu hình tác vụ (`saveAsDraft`, `count`, `targetLanguage`) |
| `active` | `boolean` | `true` khi đang queued/processing; `false` khi completed/failed |
| `status` | `enum (JobStatus)` | Trạng thái vòng đời (`queued`, `processing`, `completed`, `failed`) |
| `phase` | `enum (JobPhase)` | Giai đoạn chi tiết hiển thị cho UI |
| `attempts` | `number` | Số lần đã thực thi (mặc định: `0`) |
| `maxAttempts` | `number` | Số lần thử tối đa (mặc định: `3`) |
| `nextRunAt` | `Date \| null` | Mốc thời gian được phép chạy lượt tiếp theo (cho retry backoff) |
| `workerId` | `string \| null` | Định danh tiến trình Worker đang giữ lease |
| `leaseToken` | `string \| null` | UUID ngẫu nhiên của phiên xử lý hiện tại |
| `leaseExpiresAt` | `Date \| null` | Thời điểm lease hết hạn nếu không có heartbeat |
| `heartbeatAt` | `Date \| null` | Thời điểm Worker gửi heartbeat gần nhất |
| `dispatchState` | `enum ('pending', 'published')` | Trạng thái gửi ra broker của Embedded Outbox |
| `dispatchSequence` | `number` | Số thứ tự lần dispatch (tăng dần mỗi lần enqueue lại) |
| `publishedAt` | `Date \| null` | Thời điểm publish thành công lên RabbitMQ |
| `inputRevision` | `number` | Phiên bản nguồn transcript lúc tạo Job |
| `targetRevision` | `number` | Phiên bản kết quả đích mong đợi lúc tạo Job |
| `resultRef` | `Record<string, unknown> \| null` | Tham chiếu ID kết quả sau khi commit thành công |
| `errorCode` | `string \| null` | Mã lỗi phân loại (`RATE_LIMIT`, `TIMEOUT`, `INPUT_CHANGED`,...) |
| `errorMessage` | `string \| null` | Thông báo lỗi an toàn cho UI |
| `retryOfJobId` | `ObjectId \| null` | ID của Job cũ nếu đây là lượt retry thủ công |

### 2.3. Hệ Thống Indexes Bắt Buộc

```typescript
// 1. Chống trùng request từ client
JobSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

// 2. Chống chạy đồng thời 2 job cùng loại trên 1 bài học (Critical Fencing)
JobSchema.index(
  { lessonId: 1, type: 1 },
  { unique: true, partialFilterExpression: { active: true } }
);

// 3. Phục vụ Dispatcher và Retry scheduler
JobSchema.index({ status: 1, nextRunAt: 1, dispatchState: 1 });

// 4. Phục vụ Recovery Service quét lease quá hạn
JobSchema.index({ status: 1, leaseExpiresAt: 1 });

// 5. Phục vụ truy vấn danh sách Job theo bài học
JobSchema.index({ lessonId: 1, createdAt: -1 });

// 6. Phục vụ kiểm tra giới hạn Job active theo người dùng
JobSchema.index({ requestedById: 1, active: 1 });
```

### 2.4. Luồng Embedded Outbox & Dispatcher

```text
API Controller
    │
    ▼
Tạo Job trong MongoDB (status: 'queued', dispatchState: 'pending', active: true)
    │
    ├── Trả HTTP 202 Accepted { jobId } ngay lập tức
    │
    ▼
JobDispatcherService (Chạy định kỳ 2-5s hoặc được kích hoạt ngay sau insert)
    ├── Quét batch các job có: dispatchState = 'pending', status = 'queued', nextRunAt <= now
    ├── Gửi message vào RabbitMQ với:
    │      exchange: 'mindly.tasks.v1'
    │      routingKey: `ai.${type}`
    │      body: { jobId, dispatchSequence, type, correlationId }
    │      mandatory: true, persistent: true
    ├── Chờ Publisher Confirm từ RabbitMQ
    └── Sau khi confirm: cập nhật dispatchState = 'published', publishedAt = now
```

### 2.5. Giao Thức Atomic Claim & Heartbeat

Khi Worker nhận message từ RabbitMQ:
1. Thực hiện câu lệnh cập nhật nguyên tử:
```typescript
const claimedJob = await this.jobModel.findOneAndUpdate(
  {
    _id: message.jobId,
    status: JobStatus.QUEUED,
    dispatchSequence: message.dispatchSequence,
    $or: [
      { nextRunAt: null },
      { nextRunAt: { $lte: new Date() } }
    ],
    $or: [
      { leaseExpiresAt: null },
      { leaseExpiresAt: { $lte: new Date() } }
    ]
  },
  {
    $set: {
      status: JobStatus.PROCESSING,
      phase: JobPhase.CALLING_AI,
      workerId: this.workerId,
      leaseToken: randomUUID(),
      leaseExpiresAt: new Date(Date.now() + LEASE_DURATION_MS), // ví dụ: 90s
      heartbeatAt: new Date(),
      startedAt: new Date(),
    },
    $inc: { attempts: 1 }
  },
  { new: true }
);
```
2. Nếu `claimedJob === null`: Message này thuộc về dispatch cũ, đã có worker khác nhận, hoặc job đã completed. Worker thực hiện **Manual ACK và bỏ qua**.
3. Nếu claim thành công: Khởi động timer định kỳ (mỗi 15s) gia hạn `leaseExpiresAt` thêm 90s trong lúc chờ AI trả về.

---

## 3. Ma Trận File Thay Đổi

| File | Hành động | Mục đích |
|---|---|---|
| `share-lib/src/enums/job-*.enum.ts` | **Tạo mới** | Enums `JobStatus`, `JobType`, `JobPhase` |
| `share-lib/src/interfaces/job.interface.ts` | **Tạo mới** | TypeScript interface cho Job contract |
| `share-lib/src/index.ts` | Chỉnh sửa | Export các enums và interfaces mới |
| `backend/src/modules/jobs/schemas/job.schema.ts` | **Tạo mới** | Mongoose schema kế thừa `BaseAbstractDocument` |
| `backend/src/modules/jobs/repositories/job.repository.ts` | **Tạo mới** | Abstract & Mongo repository theo kiến trúc dự án |
| `backend/src/modules/jobs/services/job.service.ts` | **Tạo mới** | Nghiệp vụ tạo job, claim, complete, fail, renew lease |
| `backend/src/modules/jobs/services/job-dispatcher.service.ts` | **Tạo mới** | Dispatcher quét outbox và publish sang RabbitMQ |
| `backend/src/modules/jobs/services/job-recovery.service.ts` | **Tạo mới** | Quét các job quá hạn lease hoặc kẹt outbox để phục hồi |
| `backend/src/modules/jobs/policies/job-management.policy.ts` | **Tạo mới** | Kiểm tra quyền truy cập bài học/khóa học (dùng chung cho API & Worker) |
| `backend/src/modules/transcript-analysis/analysis-jobs.controller.ts` | **Tạo mới** | Endpoints tra cứu Job và retry |
| `backend/src/modules/transcript-analysis/services/analysis-job.service.ts` | **Tạo mới** | Facade kết nối giữa Module Course/Analysis và JobsModule |

---

## 4. Danh Sách Nhiệm Vụ Cụ Thể (Checklist)

- [ ] Cập nhật `share-lib` với các enums và types của Job; build lại `share-lib`.
- [ ] Xây dựng `JobSchema` và khai báo đầy đủ 6 indexes bắt buộc trong Mongoose.
- [ ] Xây dựng `JobRepository` triển khai `BaseMongoRepository` theo đúng quy chuẩn dự án (Rule 1).
- [ ] Cài đặt `JobService` chứa logic `createJob`, `claimJob`, `renewLease`, `completeJob`, `failJob`.
- [ ] Cài đặt `JobDispatcherService` với batch query, publisher confirms và exponential backoff khi lỗi broker.
- [ ] Cài đặt `JobRecoveryService` chạy background (mỗi 30-60s) để reset các job có lease quá hạn về `status: queued`.
- [ ] Xây dựng controller `analysis-jobs.controller.ts` cung cấp:
  - `GET /lessons/:id/analysis/jobs`
  - `GET /lessons/:id/analysis/jobs/:jobId`
  - `POST /lessons/:id/analysis/jobs/:jobId/retry`
- [ ] Đảm bảo CLS (AsyncLocalStorage) nhận đúng `requestedById` và `correlationId` trong tiến trình Worker khi claim job.

---

## 5. Kịch Bản Kiểm Thử & Nghiệm Thu (Verification)

1. **Race Condition Chống Trùng:** Gửi đồng thời 10 requests tạo job cùng loại trên cùng 1 `lessonId`; hệ thống chỉ được tạo đúng 1 document Job với `active: true`, 9 requests còn lại trả về thông tin Job hiện có hoặc `409 Conflict`.
2. **Idempotency Key:** Gửi 2 request có cùng header `Idempotency-Key`; request thứ 2 trả về cùng kết quả của request 1 mà không sinh thêm job mới.
3. **Outbox Recovery khi Broker Tắt:** Tắt RabbitMQ, gọi API tạo Job; Job được lưu vào MongoDB với `dispatchState: pending`. Bật lại RabbitMQ; Dispatcher tự động quét và đẩy message thành công sang RabbitMQ.
4. **Worker Crash & Lease Recovery:** Worker nhận Job và chuyển thành `processing`, sau đó giả lập crash tiến trình (kill process). Chờ lease hết hạn (90s); `JobRecoveryService` tự động phát hiện và đưa Job về `queued` với `phase: waiting_retry`.
5. **Duplicate Delivery Fencing:** Giả lập gửi 2 delivery của cùng 1 `jobId` và `dispatchSequence` đến 2 worker song song; chỉ đúng 1 worker claim thành công, worker thứ 2 nhận `null` và ACK bỏ qua.

---

## 6. Tiêu Chí Nghiệm Thu (Exit Gate)

Giai đoạn 2 hoàn thành khi:
- [ ] Unit tests cho `JobService` và `JobDispatcherService` đạt 100% pass.
- [ ] Không thể tạo nhiều hơn 1 Job `active: true` trên cùng một bộ `(lessonId, type)`.
- [ ] Quá trình Claim Job là nguyên tử (Atomic), không có hiện tượng race condition.
- [ ] Recovery Service phục hồi thành công job bị treo mà không cần can thiệp thủ công.
- [ ] Toàn bộ log có gắn kèm `jobId`, `correlationId`, `leaseToken` (rút gọn) và `attempts`.

---

## 7. Kế Hoạch Rollback

Nếu có sự cố phát sinh ở tầng Job Management:
1. Đặt cấu hình tắt `JobDispatcherService` và `JobRecoveryService` trong file `.env`.
2. Giữ nguyên collection `jobs` trong MongoDB (không ảnh hưởng tới dữ liệu khóa học hay bài học).
3. Các module khác vẫn tiếp tục hoạt động bình thường vì chưa có nghiệp vụ AI nào chuyển sang dùng queue.

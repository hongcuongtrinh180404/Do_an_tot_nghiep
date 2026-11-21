# PLAN tích hợp RabbitMQ cho xử lý AI và video bài học

> **Trạng thái:** Đề xuất — chờ phê duyệt trước khi triển khai.
>
> **Ngày lập:** 21/11/2026
>
> **Phạm vi:** Backend NestJS, Frontend Next.js, MongoDB, MinIO, Docker Compose, `share-lib`.
>
> **Nguyên tắc:** giữ nguyên kiến trúc modular monolith hiện tại; không tách microservice; không đưa file video lớn qua RabbitMQ; không thay đổi nghiệp vụ AI, prompt, validator hoặc quy tắc lưu kết quả hiện có.
>
> 📁 **Bộ Kế Hoạch Theo Từng Giai Đoạn (Sẵn Sàng Cho `/plan`):**
> Tài liệu này đã được module hóa thành các file giai đoạn độc lập tại thư mục [`docs/chatbot/plan-rabbitmq-ai-jobs/`](./plan-rabbitmq-ai-jobs/README.md):
> - **Tổng quan & Bản đồ thực thi:** [`plan-rabbitmq-ai-jobs/README.md`](./plan-rabbitmq-ai-jobs/README.md)
> - **Phase 0:** [`plan-rabbitmq-ai-jobs/phase-0-baseline-contracts.md`](./plan-rabbitmq-ai-jobs/phase-0-baseline-contracts.md)
> - **Phase 1:** [`plan-rabbitmq-ai-jobs/phase-1-infrastructure-worker.md`](./plan-rabbitmq-ai-jobs/phase-1-infrastructure-worker.md)
> - **Phase 2:** [`plan-rabbitmq-ai-jobs/phase-2-job-management.md`](./plan-rabbitmq-ai-jobs/phase-2-job-management.md)
> - **Phase 3:** [`plan-rabbitmq-ai-jobs/phase-3-summary-backend.md`](./plan-rabbitmq-ai-jobs/phase-3-summary-backend.md)
> - **Phase 4:** [`plan-rabbitmq-ai-jobs/phase-4-summary-frontend.md`](./plan-rabbitmq-ai-jobs/phase-4-summary-frontend.md)
> - **Phase 5:** [`plan-rabbitmq-ai-jobs/phase-5-quiz-mindmap.md`](./plan-rabbitmq-ai-jobs/phase-5-quiz-mindmap.md)
> - **Phase 6:** [`plan-rabbitmq-ai-jobs/phase-6-transcription-video.md`](./plan-rabbitmq-ai-jobs/phase-6-transcription-video.md)
> - **Phase 7:** [`plan-rabbitmq-ai-jobs/phase-7-hardening-rollout.md`](./plan-rabbitmq-ai-jobs/phase-7-hardening-rollout.md)
> - **Vận hành & Runbook:** [`plan-rabbitmq-ai-jobs/runbook.md`](./plan-rabbitmq-ai-jobs/runbook.md)

Tài liệu này là kế hoạch triển khai. **Chưa có source, package, migration hay cấu hình nào được thay đổi.** Các nội dung ghi "đã xác minh" được đọc trực tiếp từ source hoặc metadata dependency; các nội dung ghi "đề xuất" cần được duyệt trước khi code.

---

## Mục lục

1. [Mục tiêu và phạm vi](#1-mục-tiêu-và-phạm-vi)
2. [Hiện trạng và vấn đề](#2-hiện-trạng-và-vấn-đề)
3. [Kiến trúc mục tiêu](#3-kiến-trúc-mục-tiêu)
4. [Thiết kế tham chiếu](#4-thiết-kế-tham-chiếu)
5. [Lộ trình theo giai đoạn](#5-lộ-trình-theo-giai-đoạn)
6. [Ma trận file thay đổi](#6-ma-trận-file-thay-đổi)
7. [Kiểm thử và nghiệm thu](#7-kiểm-thử-và-nghiệm-thu)
8. [Rủi ro, rollout và rollback](#8-rủi-ro-rollout-và-rollback)
9. [Câu hỏi cần chốt và Definition of Done](#9-câu-hỏi-cần-chốt-và-definition-of-done)
10. [Phụ lục và tài liệu tham khảo](#10-phụ-lục-và-tài-liệu-tham-khảo)

---

## 1. Mục tiêu và phạm vi

### 1.1. Mục tiêu

- Tách các tác vụ AI dài khỏi HTTP request để giảng viên không phải giữ kết nối 60–120 giây.
- Giới hạn số tác vụ AI và FFmpeg chạy đồng thời trên máy development.
- Có trạng thái Job bền vững, sống sót khi reload trang, đổi tab, mất mạng hoặc Backend restart.
- Có cơ chế retry, dead-letter và phục hồi khi Worker hoặc RabbitMQ gặp sự cố.
- Giữ nguyên kết quả nghiệp vụ hiện có: Summary, Quiz, Mindmap, transcript, draft, quyền truy cập và trạng thái khóa học.

### 1.2. Trong phạm vi

| Hạng mục | Nội dung |
|---|---|
| Hạ tầng | Thêm RabbitMQ vào `docker-compose.yml`, volume, healthcheck, Management UI |
| Backend | Module kết nối AMQP, Job Management, Outbox Dispatcher, Worker standalone |
| AI | Summary, Quiz, Mindmap chuyển sang queue theo từng giai đoạn |
| Video | Transcript/FFmpeg/AssemblyAI chuyển sang queue riêng ở giai đoạn sau |
| Frontend | Nhận `202 + jobId`, polling trạng thái, khôi phục sau reload, hiển thị retry/failure |
| Database | Collection `jobs`, index, revision bảo vệ dữ liệu khi có chỉnh sửa đồng thời |
| Tài liệu | Hướng dẫn chạy Worker, biến môi trường, xử lý sự cố, rollback |

### 1.3. Ngoài phạm vi

- Không đưa binary video/audio qua RabbitMQ.
- Không chuyển toàn bộ Backend sang microservices.
- Không thay prompt, model mặc định, thuật toán sinh nội dung hoặc validator nghiệp vụ.
- Không tự động tạo chuỗi `Summary → Quiz → Mindmap`; ba tác vụ vẫn độc lập.
- Không xây hệ thống multi-tenant, cluster RabbitMQ hoặc HA production trong đợt này.
- Không sửa luồng upload file lớn trong cùng đợt; đây là nút thắt riêng cần đo RAM trước.
- Không đưa Chatbot hoặc Mindmap cấp khóa học vào queue AI này.

### 1.4. Kết quả mong đợi

```text
Giảng viên bấm tạo Summary
        ↓
API kiểm tra quyền + dữ liệu, lưu Job, trả 202 kèm jobId
        ↓
RabbitMQ giữ message
        ↓
Worker xử lý tuần tự (concurrency = 1)
        ↓
Lưu kết quả + đánh dấu completed trong transaction ngắn
        ↓
Frontend polling thấy completed, tải kết quả
```

---

## 2. Hiện trạng và vấn đề

### 2.1. Hiện trạng đã xác minh

| Thành phần | Hiện trạng |
|---|---|
| NestJS | `12.0.3`, Backend ESM (`type: module`, NodeNext, import đuôi `.js`) |
| Node.js | `v25.9.0` trên máy phát triển |
| MongoDB | MongoDB 7, replica set `rs0` trong Compose |
| RabbitMQ | **Chưa có** service, dependency hoặc module trong source |
| Summary/Quiz/Mindmap | Controller `await` toàn bộ AI + lưu DB, trả HTTP `200` |
| Transcript | `LessonTranscriptService.triggerTranscription()` chạy `void async` ngay trong tiến trình API |
| Frontend | Ba request AI có timeout `120s`; transcript có polling; AI chưa có Job polling |
| Upload | `FileInterceptor('file')` nhận buffer, sau đó đẩy lên MinIO |

**Lưu ý tài liệu:** README hiện còn mô tả NestJS 11, Mongoose 8 và RabbitMQ, trong khi source thực tế dùng NestJS 12, Mongoose 9 và chưa có RabbitMQ. Khi triển khai phải cập nhật README để tránh hướng dẫn sai.

Các file trọng tâm:

```text
backend/src/modules/transcript-analysis/
backend/src/modules/course/services/lesson-transcript.service.ts
backend/src/modules/course/services/lesson.service.ts
backend/src/modules/course/services/audio-extractor.service.ts
backend/src/modules/gemini/
backend/src/modules/assemblyai/
frontend/src/features/course/api/transcript-analysis.api.ts
frontend/src/features/course/components/player/
docker-compose.yml
```

### 2.2. Vấn đề cần giải quyết

1. **Không giới hạn concurrency:** nhiều giảng viên hoặc nhiều tab có thể tạo nhiều lời gọi AI/FFmpeg cùng lúc.
2. **Không có trạng thái bền vững:** Frontend timeout không chứng minh Backend đã dừng; reload làm mất `isPending`.
3. **Fire-and-forget transcript:** Backend restart có thể để lesson ở `TRANSCRIBING` mãi mãi.
4. **Nguy cơ ghi đè:** kết quả AI đến muộn có thể ghi đè chỉnh sửa mới của giảng viên.
5. **Quiz bị thay ID:** gọi lại `replaceAllQuizzesForLesson()` có thể xóa và tạo bộ quiz mới.
6. **Retry có thể nhân lên:** facade đã có retry, OpenAI SDK cũng có retry mặc định, nếu thêm Job retry mà không kiểm soát sẽ tăng số request thật.
7. **Không có DLQ/quan sát:** lỗi AI cuối cùng chỉ nằm trong log hoặc trạng thái rời rạc.

### 2.3. Giới hạn của RabbitMQ

RabbitMQ giải quyết **vận chuyển và phân phối**, không tự giải quyết:

- Chống trùng request.
- Ghi kết quả đúng một lần về mặt nghiệp vụ.
- Phân loại lỗi AI.
- Quota/rate limit của provider.
- Xung đột với chỉnh sửa thủ công.
- Upload file lớn.

Vì vậy thiết kế dùng **MongoDB làm nguồn sự thật cho Job**, RabbitMQ chỉ là kênh giao việc.

---

## 3. Kiến trúc mục tiêu

### 3.1. Sơ đồ tổng thể

```text
Next.js
   │ POST tạo yêu cầu AI
   ▼
NestJS REST API
   ├── Kiểm tra quyền, trạng thái khóa học, transcript READY
   ├── Tạo Job + ý định publish trong MongoDB (embedded outbox)
   └── Trả 202 + jobId
             │
             ▼
     Outbox Dispatcher (trong API)
             │ publisher confirm + mandatory
             ▼
          RabbitMQ
             │ manual ACK
             ▼
  NestJS Worker standalone
   ├── Claim Job bằng lease token
   ├── Gọi logic AI hiện có
   ├── Validate kết quả
   ├── Transaction ngắn: lưu kết quả + completed
   └── ACK
             │
             ▼
       MongoDB hiện tại
             ▲
             │ GET trạng thái/kết quả
           Next.js
```

### 3.2. Quyết định kiến trúc

| # | Quyết định | Lý do |
|---|---|---|
| 1 | Giữ modular monolith, thêm Worker standalone dùng chung source | Tái sử dụng service/repository, không cần microservice |
| 2 | Một queue AI chung cho Summary/Quiz/Mindmap | Dễ kiểm soát tổng concurrency và quota |
| 3 | Queue transcript riêng ở giai đoạn sau | Tải FFmpeg/AssemblyAI khác tải LLM |
| 4 | MongoDB lưu Job + embedded outbox | Không mất việc khi publish thất bại |
| 5 | Manual ACK, publisher confirm, durable message | Giảm mất message, kiểm soát commit |
| 6 | At-least-once + idempotent commit | Không hứa exactly-once với dịch vụ ngoài |
| 7 | Concurrency AI ban đầu = 1 | Bảo vệ máy dev và quota provider |
| 8 | Summary triển khai trước | Luồng đơn giản nhất, ít rủi ro dữ liệu nhất |
| 9 | Feature flag theo loại tác vụ | Rollout và rollback từng bước |
| 10 | Không tự fallback gọi AI trực tiếp khi broker lỗi | Tránh phá concurrency đúng lúc hệ thống có sự cố |

### 3.3. Tổ chức module đề xuất

```text
backend/src/modules/
├── messaging/
│   ├── rabbitmq.module.ts
│   ├── rabbitmq.service.ts
│   └── rabbitmq-topology.ts
│
├── jobs/
│   ├── jobs.module.ts
│   ├── job-dispatch.module.ts
│   ├── schemas/job.schema.ts
│   ├── repositories/job.repository.ts
│   ├── services/
│   │   ├── job.service.ts
│   │   ├── job-dispatcher.service.ts
│   │   ├── job-recovery.service.ts
│   │   └── job-consumer.service.ts
│   ├── policies/job-retry.policy.ts
│   ├── interfaces/job-message.interface.ts
│   └── tests/
│
└── transcript-analysis/
    ├── analysis-jobs.controller.ts
    ├── services/analysis-job.service.ts
    └── processors/analysis-job.processor.ts
```

Quan hệ phụ thuộc cần giữ:

```text
TranscriptAnalysisModule → CourseModule, JobsModule
CourseModule             → JobsModule (khi thêm transcript queue)
JobsModule               → không import CourseModule
```

Worker chỉ bootstrap các module cần thiết, không import toàn bộ `AppModule`, không mở HTTP listener.

---

## 4. Thiết kế tham chiếu

Phần này là hợp đồng kỹ thuật để triển khai. Có thể điều chỉnh tên file nhưng không nên thay đổi các nguyên tắc bên dưới nếu chưa có quyết định mới.

### 4.1. Topology RabbitMQ

| Thành phần | Tên đề xuất | Ghi chú |
|---|---|---|
| Exchange công việc | `mindly.tasks.v1` | `direct`, durable |
| Queue AI | `mindly.ai.v1` | durable, classic |
| Routing key AI | `ai.summary`, `ai.quiz`, `ai.mindmap` | cùng bind vào queue AI |
| Dead-letter exchange | `mindly.dead.v1` | durable |
| AI DLQ | `mindly.ai.dead.v1` | durable |
| Queue transcript | `mindly.transcription.v1` | giai đoạn sau |
| Transcript DLQ | `mindly.transcription.dead.v1` | giai đoạn sau |

Giai đoạn đầu dùng **một broker, classic durable queue**. Quorum queue/cluster chỉ xem xét khi cần chịu lỗi node.

Message:

```json
{
  "version": 1,
  "jobId": "665f...",
  "dispatchSequence": 1,
  "type": "summary",
  "correlationId": "req-..."
}
```

- `persistent: true`
- `contentType: application/json`
- `messageId` là Job ID + dispatch sequence
- `mandatory: true`
- Publisher phải xử lý cả **confirm** và **unroutable return**

Không đưa transcript, prompt, API key, presigned URL hoặc binary vào message.

### 4.2. Trạng thái Job

```text
queued → processing → completed
             │
             ├── queued       khi chờ retry
             └── failed       lỗi cuối cùng
```

Dùng thêm `phase` để diễn giải:

```text
waiting_dispatch
waiting_worker
waiting_retry
calling_ai
saving_result
```

Không hiển thị phần trăm hoàn thành giả khi provider không cung cấp progress.

### 4.3. Dữ liệu Job

| Nhóm | Trường đề xuất |
|---|---|
| Nhận dạng | `_id`, `type`, `lessonId`, `courseId` |
| Người yêu cầu | `requestedById`, `correlationId` |
| Tham số | `parameters` (`saveAsDraft`, `count`, `targetLanguage`) |
| Chống trùng | `idempotencyKey`, `requestHash`, `active` |
| Phiên bản | `inputRevision`, `targetRevision`, thông tin transcript nguồn |
| Trạng thái | `status`, `phase` |
| Thực thi | `attempts`, `maxAttempts`, `nextRunAt` |
| Lease | `workerId`, `leaseToken`, `leaseExpiresAt`, `heartbeatAt` |
| Publish | `dispatchSequence`, `dispatchState`, `publishedAt`, `publishAttempts` |
| Kết quả | `resultRef`, metadata, số câu/ý chính, model, thời gian |
| Lỗi | `errorCode`, thông báo an toàn cho UI, chi tiết kỹ thuật giới hạn |
| Thời gian | `createdAt`, `startedAt`, `completedAt`, `failedAt`, `updatedAt` |
| Retry thủ công | `retryOfJobId` |

Kết quả nghiệp vụ vẫn nằm trong `lesson_summaries`, `lesson_quizzes`, `lesson_quiz_drafts`, `lesson_mindmaps`, `lesson_transcripts`.

### 4.4. Index đề xuất

1. Unique `idempotencyKey` theo scope phù hợp.
2. Unique partial `(lessonId, type)` khi `active = true`.
3. `(status, nextRunAt)` cho dispatcher/retry.
4. `(status, leaseExpiresAt)` cho recovery.
5. `(lessonId, createdAt)` cho danh sách Job.
6. `(requestedById, status)` cho giới hạn theo người dùng.
7. TTL tùy chọn cho Job cũ đã terminal, nếu chốt chính sách lưu trữ.

### 4.5. Chống trùng

**Hai lớp độc lập:**

#### A. Idempotency của request

- Frontend tạo `Idempotency-Key` cho một lần thao tác.
- Gửi lại do lỗi mạng dùng cùng key → trả Job đã tạo.
- Cùng key nhưng payload khác → `409`.
- Người dùng chủ động "Tạo lại" sau khi hoàn thành → key mới.

#### B. Một Job active cho mỗi loại trên mỗi lesson

Unique partial index `(lessonId, type)` với `active = true`:

- Cùng loại, cùng tham số, đang active → trả Job hiện có.
- Cùng loại, tham số khác → `409` kèm Job đang chạy.
- Khác loại → tạo Job độc lập.

Unique index là lớp bảo vệ thật; "find rồi insert" riêng lẻ không đủ.

### 4.6. Claim, lease và commit

Worker claim Job bằng cập nhật MongoDB atomic:

```text
Điều kiện:
  status = queued
  dispatchSequence khớp
  nextRunAt đã tới
  không có lease hợp lệ

Cập nhật:
  status = processing
  attempts += 1
  leaseToken mới
  leaseExpiresAt mới
```

Quy tắc:

- Job `completed`: ACK, bỏ qua AI.
- Message thuộc dispatch cũ: ACK, bỏ qua.
- Job đang có lease của Worker khác: không gọi AI.
- Lease hết hạn: recovery đưa Job về hàng chờ bằng conditional update.
- Worker cũ chỉ commit nếu `leaseToken` còn hợp lệ.

### 4.7. Atomic completion

Không giữ transaction trong suốt thời gian gọi AI.

```text
Gọi AI ngoài transaction
    ↓
Transaction ngắn:
  kiểm tra lease + revision
  lưu kết quả nghiệp vụ
  completed + active = false
    ↓
Commit
    ↓
ACK
```

Với Quiz, transaction hoàn tất phải bao gồm:

- Thay bộ quiz nếu kết quả khác rỗng.
- Xóa draft theo nghiệp vụ hiện tại.
- Tăng revision.
- Đánh dấu Job `completed`.

Với Summary/Mindmap, giữ nguyên hành vi draft hiện có, kể cả `$setOnInsert` khi lưu draft lần đầu.

### 4.8. Revision chống ghi đè

Đề xuất bổ sung:

- `analysisInputRevision`: tăng khi transcript hoặc dữ liệu nguồn thay đổi.
- `analysisOutputRevisions.summary`
- `analysisOutputRevisions.quiz`
- `analysisOutputRevisions.mindmap`

Job ghi nhận revision khi tạo. Worker kiểm tra trước xử lý và khi commit. Nếu revision đổi:

- Job kết thúc với `INPUT_CHANGED` hoặc `TARGET_CHANGED`.
- Kết quả chính thức hiện tại được giữ.
- UI giải thích cần gửi lại nếu vẫn muốn tạo mới.

Các đường chỉnh sửa Summary/Mindmap, Quiz CRUD và apply phải tăng revision trong transaction ngắn. Chỉ kiểm tra ở UI không đủ.

### 4.9. Retry và DLQ

Đề xuất ban đầu:

- Tối đa 3 lần thực thi: lần đầu + 2 retry.
- Độ trễ tham khảo: 30 giây, 120 giây, có jitter.
- Tôn trọng `Retry-After`/cooldown dài hơn nếu có.

Lưu lịch retry trong `nextRunAt` và dùng lại dispatcher để publish khi đến hạn. Không cần delayed-message plugin, không giữ timer dài trong RAM.

| Tình huống | Xử lý |
|---|---|
| Lưu kết quả + completed thành công | ACK |
| Retry đã lưu bền vào DB | ACK delivery hiện tại; dispatcher gửi lượt sau |
| Lỗi cuối cùng đã lưu | Đánh dấu failed; ghi ý định DLQ vào outbox; ACK |
| Message malformed/không có Job hợp lệ | NACK `requeue=false` sang DLQ |
| DB không lưu được quyết định | Không ACK; dừng consumer và phục hồi có backoff |

Không dùng `nack(requeue=true)` liên tục cho lỗi AI.

### 4.10. Phân loại lỗi

| Lỗi | Chính sách |
|---|---|
| Mạng, timeout, 5xx tạm thời | Retry có giới hạn |
| 429/cooldown | Retry sau thời điểm phù hợp |
| Thiếu cấu hình, toàn bộ key bị thu hồi | Failed cấu hình, không retry vô ích |
| Lesson/transcript không còn hợp lệ | Failed, không gọi lại AI |
| JSON/AI output không hợp lệ | Retry giới hạn, sau đó failed |
| Revision hoặc quyền đã đổi | Failed dạng xung đột, không tự ghi đè |

`GeminiAllKeysExhaustedException` và `RiverAllKeysExhaustedException` hiện gộp cooldown, thiếu key và key chết. Worker không được chỉ đọc `retryable`; cần thêm dữ liệu lỗi có cấu trúc.

### 4.11. Concurrency và rate limit

Cấu hình khởi điểm:

```text
Worker process:      1
AI consumer:         1
AI concurrency:      1
AI prefetch:         1
Manual ACK:          bật
```

Phân biệt:

- **Prefetch:** số message được giao nhưng chưa ACK.
- **Concurrency:** số handler thực sự chạy.
- **Rate limit:** số request/token trong một khoảng thời gian.

Prefetch không bảo đảm RPM/TPM của provider. Nếu chạy `W` Worker, mỗi Worker concurrency `C`, tải bình thường có thể đạt `W × C`; chỉ scale khi có ngân sách quota hoặc limiter dùng chung.

Với RabbitMQ 4.4, dùng prefetch theo consumer; không dựa vào global/channel QoS đã bị hạn chế.

### 4.12. Hợp đồng API

Giữ URL và DTO hiện có, thay phản hồi khi loại tác vụ đã bật async:

```text
POST /lessons/:id/analysis/summary
POST /lessons/:id/analysis/quiz
POST /lessons/:id/analysis/mindmap
```

Phản hồi mới: HTTP `202 Accepted`, giữ envelope `ApiResponse`.

```json
{
  "success": true,
  "data": {
    "jobId": "...",
    "lessonId": "...",
    "type": "summary",
    "status": "queued",
    "statusUrl": "/api/v1/lessons/.../analysis/jobs/..."
  },
  "message": "Đã tiếp nhận yêu cầu xử lý",
  "timestamp": "..."
}
```

Bổ sung:

```text
GET  /lessons/:id/analysis/jobs
GET  /lessons/:id/analysis/jobs/:jobId
POST /lessons/:id/analysis/jobs/:jobId/retry
```

- GET danh sách trả Job active và Job gần nhất để phục hồi sau reload.
- Endpoint Job kiểm tra quyền quản lý lesson.
- GET trạng thái vẫn truy cập được khi khóa học `PENDING_APPROVAL`; không áp nguyên guard cấm chỉnh sửa cho thao tác đọc.
- Retry thủ công tạo Job mới liên kết `retryOfJobId`.

Trong rollout, Frontend tạm hiểu cả `200 + result` và `202 + jobId`.

### 4.13. Trạng thái Frontend

- Dùng một query trạng thái cấp lesson làm nguồn chính, thay cho `isPending` cục bộ.
- Polling 2–3 giây khi `processing`, 5–10 giây khi `queued` lâu; dừng khi terminal.
- Làm mới khi quay lại cửa sổ hoặc reconnect.
- `query-client.ts` đang tắt `refetchOnWindowFocus` toàn cục; hook Job phải ghi đè riêng.
- Invalidate kết quả và approval checklist sau **completed**, không phải ngay sau enqueue.
- Không suy luận thất bại chỉ vì polling đã chờ lâu.

### 4.14. Biến môi trường

| Nhóm | Biến |
|---|---|
| Kết nối | `RABBITMQ_URL` |
| Docker | `RABBITMQ_DEFAULT_USER`, `RABBITMQ_DEFAULT_PASS`, `RABBITMQ_DEFAULT_VHOST` |
| Topology | `RABBITMQ_EXCHANGE`, `RABBITMQ_AI_QUEUE`, `RABBITMQ_DEAD_EXCHANGE`, `RABBITMQ_AI_DLQ` |
| Reconnect | `RABBITMQ_HEARTBEAT_SECONDS`, `RABBITMQ_RECONNECT_SECONDS`, `RABBITMQ_PUBLISH_TIMEOUT_MS` |
| Rollout | `AI_ASYNC_TYPES=summary` ở pilot |
| Worker | `AI_WORKER_CONCURRENCY=1`, `AI_PREFETCH=1` |
| Retry | `JOB_MAX_ATTEMPTS=3`, `JOB_RETRY_DELAYS_MS=30000,120000` |
| Recovery | `JOB_LEASE_MS=90000`, `JOB_HEARTBEAT_MS=15000`, `JOB_DISPATCH_INTERVAL_MS` |
| Timeout | `AI_REQUEST_TIMEOUT_MS`, `AI_JOB_TIMEOUT_MS` |
| Tiếp nhận | Giới hạn Job active theo người dùng và backlog tối đa |
| Video, giai đoạn sau | Queue transcript, concurrency FFmpeg, timeout/polling AssemblyAI |

Frontend không cần biết URL hoặc tài khoản RabbitMQ.

### 4.15. Package và phiên bản

| Package | Phiên bản khảo sát | Yêu cầu Node | Ghi chú |
|---|---:|---:|---|
| `amqplib` | `2.4.0` | `>=18` | CJS, có sẵn TypeScript declarations |
| `amqp-connection-manager` | `5.0.1` | `>=22` | Có ESM/CJS, reconnect, confirm channel |
| `@nestjs/microservices` | `12.0.3` | Peer NestJS 12 | Không bắt buộc nếu dùng AMQP provider trực tiếp |

Đề xuất dùng `amqplib` + `amqp-connection-manager` trong Nest provider thông thường, không dùng decorator RPC.

**Lưu ý về Node:** Node hiện tại `v25.9.0` đáp ứng các `engines` trên. Tuy nhiên OpenAI SDK `7.41.0` yêu cầu Node `>=22`, nên hướng dẫn README "Node >=20" cần được cập nhật khi triển khai. Có thể chuẩn hóa Node 24 LTS cho môi trường tái lập.

**Lưu ý:** đây là xác minh metadata npm, chưa phải kết quả build/runtime. Việc tương thích ESM/NodeNext và reconnect phải được kiểm chứng ở Giai đoạn 1. Không cài `@types/amqplib` dòng 0.10 cho `amqplib 2.4.0`.

### 4.16. Docker Compose

| Hạng mục | Giá trị đề xuất |
|---|---|
| Image | `rabbitmq:4.4.1-management-alpine` |
| AMQP | `127.0.0.1:5672` |
| Management UI | `127.0.0.1:15672` |
| Volume | `rabbitmq_data:/var/lib/rabbitmq` |
| Vhost | `mindly` |
| User | User riêng cho development |
| Restart | `unless-stopped` |
| Healthcheck | `rabbitmq-diagnostics -q ping` |
| Quy mô | Một broker |

Đề xuất đo tài nguyên với ngân sách broker khoảng 512–768 MiB trước khi chốt giới hạn. Đây là ngân sách thử nghiệm, không phải số RAM bảo đảm.

Development giữ API/Worker trên host Windows, phù hợp MongoDB replica set hiện quảng bá `localhost:27017`.

---

## 5. Lộ trình theo giai đoạn

### 5.0. Tóm tắt các giai đoạn

| Giai đoạn | Mục tiêu chính | Kết quả bàn giao | Exit gate ngắn |
|---|---|---|---|
| **0. Baseline** | Chốt hợp đồng và đo hiện trạng | Baseline test, quyết định thiết kế | Không còn câu hỏi blocking |
| **1. Hạ tầng** | RabbitMQ + Worker skeleton | Message kiểm thử được publish/consume | Reconnect và confirm hoạt động |
| **2. Job nền tảng** | Job, outbox, lease, recovery | Vòng đời Job bền vững | Không mất Job, không commit trùng |
| **3. Summary backend** | Summary chạy qua queue | `202 + jobId`, kết quả đúng | Crash/redelivery an toàn |
| **4. Summary frontend** | Theo dõi Job xuyên reload | UI trạng thái và retry | Không báo hoàn thành giả |
| **5. Quiz & Mindmap** | Ba loại AI qua queue chung | Concurrency tổng được giới hạn | Nghiệp vụ Quiz/Mindmap không đổi |
| **6. Transcript/video** | Bỏ fire-and-forget, giới hạn FFmpeg | Pipeline video bền vững | Không treo `TRANSCRIBING` |
| **7. Hardening** | Load test, tài liệu, rollout | Runbook và số đo hiệu năng | Toàn bộ ma trận nghiệm thu đạt |

### 5.1. Sơ đồ phụ thuộc

```text
Giai đoạn 0: Baseline & hợp đồng
        │
        ▼
Giai đoạn 1: Hạ tầng RabbitMQ + Worker skeleton
        │
        ▼
Giai đoạn 2: Nền tảng Job Management
        │
        ▼
Giai đoạn 3: Summary backend async
        │
        ▼
Giai đoạn 4: Summary frontend + pilot lỗi
        │
        ├──────────────┐
        ▼              ▼
Giai đoạn 5: Quiz   (có thể bắt đầu Mindmap song song sau khi
             & Mindmap  Summary ổn định)
        │
        ▼
Giai đoạn 6: Transcript/video queue
        │
        ▼
Giai đoạn 7: Load test, hardening, tài liệu, rollout
```

Nguyên tắc: **không mở giai đoạn sau khi exit gate của giai đoạn trước chưa đạt**, trừ khi chỉ chạy song song phần không chạm cùng file.

---

### Giai đoạn 0 — Chốt baseline và hợp đồng

**Mục tiêu:** biết rõ hành vi hiện tại và chốt các quyết định không thể thay đổi giữa chừng.

**Công việc:**

- [ ] Chốt hợp đồng `202 + jobId`, schema Job, quy tắc dedupe và xử lý xung đột.
- [ ] Chốt một queue AI chung; queue transcript để giai đoạn sau.
- [ ] Xác nhận MongoDB thực sự chạy replica set `rs0` và transaction hoạt động.
- [ ] Ghi baseline: thời gian phản hồi API, RAM khi upload, thời gian từng loại AI, tỷ lệ lỗi hiện có.
- [ ] Chạy bộ test hiện có sau khi được phép triển khai.
- [ ] Chốt phiên bản Node, package AMQP và image RabbitMQ.
- [ ] Chốt chính sách lưu Job cũ (giữ bao lâu, có TTL không).
- [ ] Chốt môi trường chạy Worker (terminal riêng, Docker hay cả hai).

**File dự kiến:**

```text
docs/chatbot/PLAN-rabbitmq-ai-jobs.md   (tài liệu này)
backend/src/modules/transcript-analysis/tests/
backend/src/modules/course/tests/
backend/src/modules/gemini/tests/
backend/src/modules/assemblyai/tests/
```

**Kết quả bàn giao:** baseline test, danh sách quyết định đã chốt, danh sách rủi ro được chấp nhận.

**Kiểm thử:** upload/tạo lesson, transcript, Summary, Quiz, Mindmap, draft/apply, quyền truy cập, course approval.

**Exit gate:**

- [ ] Bộ test hiện có chạy được và lỗi đã có sẵn được phân loại.
- [ ] Transaction MongoDB đã được xác nhận trên môi trường test.
- [ ] Không còn câu hỏi blocking về hợp đồng API.
- [ ] Có baseline số đo trước thay đổi.

**Rollback:** không cần; giai đoạn này chỉ đọc và ghi nhận.

---

### Giai đoạn 1 — Hạ tầng RabbitMQ và Worker skeleton

**Mục tiêu:** API và Worker kết nối RabbitMQ ổn định, reconnect được, publish/nhận message kiểm thử thành công.

**Công việc:**

- [ ] Thêm service RabbitMQ vào `docker-compose.yml` với volume, healthcheck, Management UI.
- [ ] Thêm `amqplib` và `amqp-connection-manager` vào Backend.
- [ ] Tạo `RabbitMqModule`, `RabbitMqService`, khai báo topology idempotent.
- [ ] Bật publisher confirm, `mandatory`, xử lý return/unroutable.
- [ ] Tạo `worker.ts`, `worker.module.ts` dùng `NestFactory.createApplicationContext`.
- [ ] Tạo `tsconfig.worker.json` với output riêng (`dist-worker`) do `nest-cli.json` có `deleteOutDir: true`.
- [ ] Thêm script chạy Worker và script test hạ tầng.
- [ ] Thêm biến môi trường và Joi validation.
- [ ] Cấu hình graceful shutdown: ngừng nhận message, chờ tác vụ hiện tại, đóng channel.
- [ ] Ghi log connection state, reconnect, publish confirm và consumer tag.

**File dự kiến:**

```text
docker-compose.yml
backend/package.json
backend/.env.example
backend/src/config/env.validation.ts
backend/src/modules/messaging/rabbitmq.module.ts
backend/src/modules/messaging/rabbitmq.service.ts
backend/src/modules/messaging/rabbitmq-topology.ts
backend/src/worker.ts
backend/src/worker.module.ts
backend/tsconfig.worker.json
```

**Kết quả bàn giao:** một message kiểm thử đi từ API publisher sang Worker consumer và được ACK.

**Kiểm thử:**

- Worker khởi động trước RabbitMQ.
- RabbitMQ restart khi Worker đang chạy.
- Worker restart khi message đang chờ.
- Publish routing key không được bind.
- Broker restart với volume còn nguyên: queue và message persistent còn.
- API khởi động được khi broker tạm mất kết nối.

**Exit gate:**

- [ ] Build ESM thành công, Worker chạy được bằng Node.
- [ ] Reconnect không tạo consumer trùng.
- [ ] API không crash nếu broker down lúc khởi động.
- [ ] Confirm và unroutable return đều được xử lý.
- [ ] Không có hai cơ chế reconnect chồng nhau (không bật native recovery của `amqplib` cùng `amqp-connection-manager`).

**Rollback:** dừng Worker, gỡ service RabbitMQ khỏi Compose; API chưa phụ thuộc vào queue.

---

### Giai đoạn 2 — Nền tảng Job Management

**Mục tiêu:** có vòng đời Job bền vững, dispatcher, lease, recovery và API trạng thái dùng chung, chưa gọi AI thật.

**Công việc:**

- [ ] Tạo enum `JobStatus`, `JobType`, `JobPhase` trong `share-lib`.
- [ ] Tạo schema `jobs` và repository.
- [ ] Tạo unique index idempotency và unique partial index Job active.
- [ ] Tạo index dispatch/retry/lease.
- [ ] Cài embedded outbox: `dispatchState`, `dispatchSequence`, `publishedAt`.
- [ ] Tạo `JobService` với create/claim/heartbeat/complete/fail/retry.
- [ ] Tạo `JobDispatcherService` chạy trong API: batch nhỏ, confirm, backoff, không giữ backlog trong RAM.
- [ ] Tạo `JobRecoveryService`: quét lease hết hạn và dispatch dở.
- [ ] Tạo `JobConsumerService` khung trong Worker.
- [ ] Tạo endpoint đọc Job và retry thủ công (có thể chưa gắn AI).
- [ ] Tạo `JobManagementPolicy` tái sử dụng kiểm tra quyền, không phụ thuộc HTTP guard.
- [ ] Truyền `requestedById`/`correlationId` vào CLS của Worker.
- [ ] Thêm feature flag `AI_ASYNC_TYPES` nhưng chưa bật loại nào.

**File dự kiến:**

```text
share-lib/src/enums/job-status.enum.ts
share-lib/src/enums/job-type.enum.ts
share-lib/src/interfaces/job.interface.ts
share-lib/src/index.ts

backend/src/modules/jobs/
backend/src/modules/transcript-analysis/analysis-jobs.controller.ts
backend/src/modules/transcript-analysis/services/analysis-job.service.ts
```

**Kết quả bàn giao:** tạo một Job loại test, publish qua outbox, Worker claim, giả lập xử lý, commit và ACK.

**Kiểm thử:**

- Hai request đồng thời cùng lesson/type → một Job active.
- Cùng idempotency key → trả Job cũ.
- Cùng key khác payload → `409`.
- Publish thất bại → Job vẫn ở trạng thái chờ gửi.
- Broker nhận nhưng confirm mất → publish lại an toàn.
- Worker chết trước commit → lease hết hạn, Job được phục hồi.
- Worker chết sau commit trước ACK → delivery lại bị bỏ qua.
- DB lỗi khi commit → không ACK thành công.
- Message malformed → vào DLQ.

**Exit gate:**

- [ ] Không tạo nhiều Job active trùng loại.
- [ ] Không commit kết quả hai lần.
- [ ] Job đã nhận không bị bỏ quên khi process restart.
- [ ] Recovery chạy có index, không quét toàn bộ collection.
- [ ] Log có `jobId`, `correlationId`, `attempts`, `leaseToken` rút gọn.

**Rollback:** tắt dispatcher/consumer bằng flag; collection `jobs` có thể giữ lại, không ảnh hưởng nghiệp vụ.

---

### Giai đoạn 3 — Summary backend async

**Mục tiêu:** Summary chạy hoàn toàn qua Job, từ enqueue đến lưu kết quả, không còn `await` AI trong HTTP.

**Công việc:**

- [ ] Tách `SummaryGenerationService` thành hai phần: sinh/validate và persist.
- [ ] Giữ nguyên prompt, `SummaryValidator`, định dạng timestamp.
- [ ] Cho phần persist nhận `ClientSession`.
- [ ] Tạo processor Summary trong Worker.
- [ ] Bật `AI_ASYNC_TYPES=summary`; controller trả `202 + jobId` cho Summary.
- [ ] Giữ endpoint GET Summary hiện có để đọc kết quả.
- [ ] Thêm kiểm tra revision đầu vào/đầu ra.
- [ ] Transaction commit gồm Summary + Job completed + `active=false`.
- [ ] Kiểm tra lại quyền và trạng thái course tại thời điểm commit.
- [ ] Ghi audit `updatedById` từ `requestedById`.
- [ ] Cập nhật tài liệu API và biến môi trường.

**File dự kiến:**

```text
backend/src/modules/transcript-analysis/services/summary-generation.service.ts
backend/src/modules/transcript-analysis/transcript-analysis.controller.ts
backend/src/modules/transcript-analysis/transcript-analysis.module.ts
backend/src/modules/transcript-analysis/processors/analysis-job.processor.ts
backend/src/modules/course/schemas/lesson.schema.ts
backend/src/modules/course/repositories/lesson.repository.ts
backend/src/modules/course/repositories/lesson-summary.repository.ts
```

**Kết quả bàn giao:** POST Summary trả Job ID; Worker tạo đúng dữ liệu; GET Summary trả kết quả như cũ.

**Kiểm thử:**

- Hai request đồng thời cùng lesson.
- Gửi lại sau completed với cùng idempotency key.
        - Worker chết trước commit.
        - Worker chết sau commit, trước ACK.
        - Publish thành công nhưng mất confirm.
        - Giảng viên chỉnh sửa Summary trong lúc AI chạy.
        - Lesson bị xóa hoặc course chuyển `PENDING_APPROVAL` trong lúc chờ.
        - Transcript chưa `READY`.
        - Summary draft và official đúng hành vi cũ.

        **Exit gate:**

        - [ ] Không còn lời gọi AI Summary trong HTTP request khi flag bật.
        - [ ] Không tạo nhiều Job active trùng loại.
        - [ ] Crash sau commit trước ACK không sinh lại Summary.
        - [ ] Kết quả cũ vẫn đọc được nếu Job mới thất bại.
        - [ ] Chỉnh sửa đồng thời không bị ghi đè âm thầm.

        **Rollback:** đặt `AI_ASYNC_TYPES` bỏ `summary`, chờ các Job active kết thúc, sau đó chuyển lại đường sync cũ. Không tự động fallback khi broker lỗi.

        ---

        ### Giai đoạn 4 — Summary frontend và pilot lỗi

        **Mục tiêu:** người dùng theo dõi được Summary xuyên suốt reload, đổi tab, mất mạng và lỗi AI.

        **Công việc:**

        - [ ] Tạo `analysis-jobs.api.ts` và hook `use-analysis-jobs.ts`.
        - [ ] Hiểu cả phản hồi cũ `200` và mới `202`.
        - [ ] Hiển thị `queued`, `processing`, `waiting_retry`, `failed`, `completed`.
        - [ ] Dùng chung trạng thái giữa `lesson-tabs-container.tsx` và `lesson-summary-tab.tsx`.
        - [ ] Polling có backoff, dừng khi terminal, refetch khi focus/reconnect.
        - [ ] Invalidate Summary khi completed.
        - [ ] Hiển thị retry thủ công khi được phép.
        - [ ] Sửa thông báo timeout: không khẳng định "đang xử lý" nếu chưa có Job.
        - [ ] Vô hiệu hóa nút gửi trùng khi Job đang active.
        - [ ] Giữ nguyên UI chỉnh sửa Summary và apply draft.

        **File dự kiến:**

        ```text
        frontend/src/features/course/api/transcript-analysis.api.ts
        frontend/src/features/course/api/analysis-jobs.api.ts
        frontend/src/features/course/hooks/use-analysis-jobs.ts
        frontend/src/features/course/components/player/analysis-job-status.tsx
        frontend/src/features/course/components/player/lesson-tabs-container.tsx
        frontend/src/features/course/components/player/tabs/lesson-summary-tab.tsx
        ```

        **Kết quả bàn giao:** luồng Summary async dùng được từ đầu đến cuối.

        **Kiểm thử:**

        - Reload trang khi Job đang chạy.
        - Hai tab trình duyệt cùng mở một lesson.
        - Rời lesson rồi quay lại.
        - Mất mạng Frontend trong lúc polling.
        - Broker ngừng hoạt động.
        - Worker ngừng hoạt động.
        - AI trả 429, 5xx, timeout.
        - Job thất bại nhưng Summary cũ vẫn đọc được.

        **Exit gate:**

        - [ ] UI không báo hoàn thành ngay sau enqueue.
        - [ ] Không cần giữ tab mở để Job tiếp tục.
        - [ ] Reload khôi phục đúng trạng thái từ server.
        - [ ] Các chức năng cũ qua regression.
        - [ ] Không còn hai mutation instance tranh nhau trạng thái.

        **Giới hạn pilot:** Quiz/Mindmap vẫn gọi AI trong API, nên tổng concurrency AI toàn hệ thống chưa được kiểm soát cho đến Giai đoạn 5.

        **Rollback:** tắt flag Summary, ẩn UI Job, quay lại mutation cũ sau khi drain Job.

        ---

        ### Giai đoạn 5 — Quiz và Mindmap

        **Mục tiêu:** cả ba tác vụ LLM đi qua queue AI chung, không thay đổi nghiệp vụ.

        **Công việc:**

        - [ ] Thêm processor Quiz và Mindmap.
        - [ ] Quiz: transaction hoàn tất gồm replace quiz, xóa draft, revision, Job completed.
        - [ ] Giữ quy tắc 0 câu: không xóa bộ quiz chính thức hiện tại.
        - [ ] Giữ `timestamp: null` cho câu hỏi mới và `explanationTimestamp` do AI trả.
        - [ ] Mindmap: giữ sanitize tối đa 5 cấp, draft/official như cũ.
        - [ ] Bảo vệ revision khi giảng viên sửa Quiz/Mindmap hoặc autosave.
        - [ ] Invalidate quiz list, quiz draft và approval checklist sau completed.
        - [ ] Mở rộng `AI_ASYNC_TYPES=summary,quiz,mindmap`.
        - [ ] Loại bỏ đường HTTP sinh AI bỏ qua điều phối khi rollout hoàn tất.
        - [ ] Cập nhật test hiện có của ba service.

        **File dự kiến:**

        ```text
        backend/src/modules/transcript-analysis/services/quiz-generation.service.ts
        backend/src/modules/transcript-analysis/services/mindmap-analysis.service.ts
        backend/src/modules/transcript-analysis/processors/analysis-job.processor.ts
        backend/src/modules/course/repositories/lesson-quiz.repository.ts
        backend/src/modules/course/repositories/lesson-quiz-draft.repository.ts
        backend/src/modules/course/repositories/lesson-mindmap.repository.ts
        backend/src/modules/course/services/lesson-quiz.service.ts
        frontend/src/features/course/api/transcript-analysis.api.ts
        frontend/src/features/course/components/player/tabs/lesson-quiz-tab.tsx
        frontend/src/features/course/components/player/tabs/lesson-mindmap-tab.tsx
        ```

        **Kết quả bàn giao:** ba loại AI đều chạy qua Worker, concurrency tổng được giới hạn.

        **Kiểm thử:**

        - Ba loại trên cùng một lesson.
        - Nhiều lesson của nhiều giảng viên.
        - Quiz trả 0 câu.
        - Quiz trả ít hơn `count`.
        - Giao lại message Quiz sau completed.
        - Mindmap autosave khi Job đang chạy.
        - Approval checklist sau khi tạo Quiz.
        - Luồng học viên làm quiz và tiến độ không đổi.

        **Exit gate:**

        - [ ] Không thay đổi nghiệp vụ, prompt hoặc validator.
        - [ ] Không reset ID Quiz do redelivery.
        - [ ] Concurrency quan sát đúng cấu hình.
        - [ ] Tất cả đường sinh AI đều đi qua Job khi flag bật.
        - [ ] Regression pass cho draft/apply/quiz timing.

        **Rollback:** giảm `AI_ASYNC_TYPES` về `summary`, drain Job Quiz/Mindmap, sau đó bật lại đường sync nếu cần.

        ---

        ### Giai đoạn 6 — Queue transcript/video

        **Mục tiêu:** loại bỏ fire-and-forget, giới hạn FFmpeg và phục hồi được khi Worker chết.

        **Công việc:**

        - [ ] Tạo queue `mindly.transcription.v1` và DLQ riêng.
        - [ ] Tạo Job transcript khi tạo lesson video, trong cùng transaction với lesson.
        - [ ] Thay `triggerTranscription()` bằng enqueue.
        - [ ] Giữ nguyên enum `LessonTranscriptionStatusEnum`.
        - [ ] Worker tạo presigned URL mới, chạy FFmpeg, upload AssemblyAI.
        - [ ] Giới hạn số FFmpeg đồng thời.
        - [ ] Dùng `submit()` + lưu `externalTranscriptId` sớm, sau đó poll/resume.
        - [ ] Cấu hình `pollingTimeout` thay vì chờ vô hạn.
        - [ ] Dọn file tạm theo attempt, kể cả khi lỗi.
        - [ ] Hủy FFmpeg/AbortSignal khi Job hết hạn hoặc shutdown.
        - [ ] Cập nhật transcript + duration + lesson `READY` trong transaction ngắn.
        - [ ] Tăng `analysisInputRevision` khi transcript thay đổi.
        - [ ] Cập nhật Frontend transcript polling nếu cần hiển thị trạng thái Job.

        **File dự kiến:**

        ```text
        backend/src/modules/course/services/lesson.service.ts
        backend/src/modules/course/services/lesson-transcript.service.ts
        backend/src/modules/course/services/audio-extractor.service.ts
        backend/src/modules/course/lessons.controller.ts
        backend/src/modules/course/repositories/lesson-transcript.repository.ts
        backend/src/modules/assemblyai/assemblyai.service.ts
        backend/src/modules/transcript-analysis/processors/transcription-job.processor.ts
        frontend/src/features/course/api/course.api.ts
        frontend/src/features/course/components/player/lesson-player-studio.tsx
        ```

        **Kết quả bàn giao:** nhiều video upload không tạo vô hạn pipeline; Worker restart không để `TRANSCRIBING` treo.

        **Kiểm thử:**

        - Nhiều video nhỏ đồng thời.
        - Video không có audio.
        - File lỗi hoặc định dạng lạ.
        - Kill Worker khi FFmpeg đang chạy.
        - Kill Worker sau khi AssemblyAI đã nhận việc.
        - Presigned URL hết hạn do chờ lâu.
        - Retry không ghi transcript cũ lên dữ liệu nguồn mới.
        - Broker restart khi Job đang chờ.

        **Exit gate:**

        - [ ] FFmpeg concurrency đúng giới hạn.
        - [ ] Trạng thái lesson/transcript/Job nhất quán.
        - [ ] Worker restart không để tác vụ treo vô hạn.
        - [ ] Không submit lại AssemblyAI nếu đã có checkpoint hợp lệ.
        - [ ] Không còn đường fire-and-forget khi flag bật.

        **Rollback:** tắt queue transcript, chờ Job hiện tại, bật lại đường cũ nếu thật sự cần; không chạy song song hai cơ chế cho cùng lesson.

        ---

        ### Giai đoạn 7 — Load test, hardening và rollout

        **Mục tiêu:** chứng minh hệ thống chịu được tải mục tiêu và có quy trình vận hành rõ ràng.

        **Công việc:**

        - [ ] Load test với AI mock có độ trễ/lỗi kiểm soát.
        - [ ] Smoke test số lượng nhỏ với provider thật.
        - [ ] Theo dõi queue depth, thời gian chờ, thời gian xử lý, retry, RAM, CPU.
        - [ ] Chốt concurrency và ngân sách retry.
        - [ ] Viết runbook: xem Job, replay DLQ, retry, drain, rollback.
        - [ ] Cập nhật README, `.env.example`, hướng dẫn chạy Worker.
        - [ ] Kiểm thử toàn bộ luồng bị tác động.
        - [ ] Chốt tiêu chí giám sát và log.

        **File dự kiến:**

        ```text
        backend/src/modules/jobs/tests/
        backend/src/modules/transcript-analysis/tests/
        backend/src/modules/course/tests/
        backend/test/ (nếu cần integration test)
        README.md
        backend/README.md
        backend/.env.example
        docker-compose.yml
        ```

        **Kết quả bàn giao:** cấu hình development được kiểm chứng, tài liệu vận hành đầy đủ.

        **Kiểm thử:** toàn bộ ma trận ở mục 7.

        **Exit gate:**

        - [ ] Tất cả kịch bản nghiêm thu ở mục 7 đạt.
        - [ ] Không có regression nghiệp vụ.
        - [ ] Có số đo hiệu năng trước/sau.
        - [ ] Có quy trình rollback đã thử ít nhất một lần.
        - [ ] Tài liệu đủ để người khác chạy lại từ đầu.

        ---

        ## 6. Ma trận file thay đổi

        ### 6.1. Hạ tầng và cấu hình

        | File | Thay đổi |
        |---|---|
        | `docker-compose.yml` | Thêm RabbitMQ, volume, healthcheck |
        | `backend/package.json` | Dependency AMQP, script Worker/test |
        | `pnpm-lock.yaml` | Cập nhật sau khi cài package được duyệt |
        | `backend/.env.example` | Biến môi trường mới |
        | `backend/src/config/env.validation.ts` | Joi validation cho queue/job/worker |
        | `backend/src/app.module.ts` | Import Job dispatch và hạ tầng cần thiết |
        | `backend/nest-cli.json` | Giữ nguyên; không dùng chung `dist` cho Worker |
        | `backend/tsconfig.worker.json` | File mới, output riêng |
        | `README.md`, `backend/README.md` | Hướng dẫn chạy, phiên bản thực tế, troubleshooting |
        | `package.json` (root) | Có thể thêm lệnh chạy Worker |

        ### 6.2. Backend mới

        ```text
        backend/src/worker.ts
        backend/src/worker.module.ts
        backend/tsconfig.worker.json
        backend/src/modules/messaging/
        backend/src/modules/jobs/
        backend/src/modules/transcript-analysis/analysis-jobs.controller.ts
        backend/src/modules/transcript-analysis/services/analysis-job.service.ts
        backend/src/modules/transcript-analysis/processors/
        ```

        ### 6.3. Backend hiện có

        | File/nhóm | Tác động |
        |---|---|
        | `transcript-analysis/transcript-analysis.controller.ts` | Enqueue, trả `202` theo rollout |
        | `transcript-analysis/transcript-analysis.module.ts` | Đăng ký Job facade, controller trạng thái, processor |
        | `summary-generation.service.ts` | Tách sinh/validate và persist |
        | `quiz-generation.service.ts` | Tách sinh/validate và persist; transaction hoàn tất |
        | `mindmap-analysis.service.ts` | Tách sinh/validate và persist |
        | `course/schemas/lesson.schema.ts` | Revision đầu vào/đầu ra |
        | `course/repositories/lesson.repository.ts` | Conditional revision/commit guard |
        | Repository Summary/Mindmap/Quiz/Draft | Nhận `ClientSession`, bảo vệ phiên bản |
        | `course/services/lesson-quiz.service.ts` | Tăng revision khi CRUD/timing/sync |
        | `course/guards/lesson-management.guard.ts` | Tái sử dụng policy trong HTTP và Worker |
        | `course/repositories/course.repository.ts` | Kiểm tra/ghi có điều kiện khi commit |
        | `course/course.module.ts` | Export policy/version helpers |
        | `gemini/gemini.service.ts` | Truyền timeout/abort, phân loại lỗi |
        | `gemini/interfaces/gemini.interface.ts` | Bổ sung execution options/error metadata |
        | `assemblyai/assemblyai.service.ts` | Checkpoint provider ID, polling timeout (giai đoạn 6) |
        | `course/services/lesson-transcript.service.ts` | Thay fire-and-forget (giai đoạn 6) |
        | `course/services/audio-extractor.service.ts` | Cancellation, cleanup theo attempt (giai đoạn 6) |

        ### 6.4. Share-lib và Database

        **File mới dự kiến:**

        ```text
        share-lib/src/enums/job-status.enum.ts
        share-lib/src/enums/job-type.enum.ts
        share-lib/src/interfaces/job.interface.ts
        ```

        Cập nhật `share-lib/src/index.ts` và interface lesson nếu revision là public contract.

        **Database:**

        1. Collection `jobs`.
        2. Unique index idempotency key có scope.
        3. Unique partial index Job active `(lessonId, type)`.
        4. Index dispatch/retry `(status, nextRunAt)`.
        5. Index lease `(status, leaseExpiresAt)`.
        6. Index truy vấn theo lesson/người yêu cầu.
        7. Revision kỹ thuật trên lesson.
        8. Checkpoint transcript/provider ID ở giai đoạn 6.

        Dữ liệu cũ hiểu revision mặc định là 0; không cần viết lại kết quả AI hiện có.

        ### 6.5. Frontend

        **File chỉnh:**

        ```text
        frontend/src/features/course/api/transcript-analysis.api.ts
        frontend/src/features/course/components/player/lesson-tabs-container.tsx
        frontend/src/features/course/components/player/tabs/lesson-summary-tab.tsx
        frontend/src/features/course/components/player/tabs/lesson-quiz-tab.tsx
        frontend/src/features/course/components/player/tabs/lesson-mindmap-tab.tsx
        ```

        **File mới:**

        ```text
        frontend/src/features/course/api/analysis-jobs.api.ts
        frontend/src/features/course/hooks/use-analysis-jobs.ts
        frontend/src/features/course/components/player/analysis-job-status.tsx
        ```

        Giai đoạn transcript có thể chỉnh thêm:

        ```text
        frontend/src/features/course/api/course.api.ts
        frontend/src/features/course/components/player/lesson-player-studio.tsx
        frontend/src/features/course/components/player/lesson-timeline-tab.tsx
        ```

        ---

        ## 7. Kiểm thử và nghiệm thu

        ### 7.1. Ma trận mười kịch bản bắt buộc

        | # | Kịch bản | Giai đoạn | Kết quả cần đạt |
        |---|---|---|---|
        | 1 | Upload video bài học | 6 | Video lưu MinIO; lesson tạo; transcript Job bền vững; không fire-and-forget |
        | 2 | Tạo Summary | 3–4 | API trả `202`; Worker tạo đúng dữ liệu; reload vẫn theo dõi được |
        | 3 | Tạo Quiz | 5 | Đúng số câu/0 câu; không reset ID do redelivery; timestamp giữ quy tắc cũ |
        | 4 | Tạo Mindmap | 5 | Sanitize đúng; draft/official đúng; autosave không bị ghi đè |
        | 5 | Nhiều giảng viên cùng lúc | 4–5 | Mỗi người có Job riêng; backlog hiển thị; không ai giữ HTTP 120s |
        | 6 | Nhiều tác vụ trên cùng lesson | 5 | Ba Job độc lập; Summary xong trước không ảnh hưởng Quiz/Mindmap |
        | 7 | Worker bị tắt đột ngột | 2–3 | Lease hết hạn; Job phục hồi; không commit trùng |
        | 8 | AI lỗi/timeout/rate limit | 3–5 | Retry có giới hạn; cooldown được tôn trọng; lỗi cuối cùng rõ ràng |
        | 9 | RabbitMQ mất kết nối | 1–3 | Job vẫn lưu DB; dispatcher chờ; reconnect gửi tiếp; không mất Job |
        | 10 | Reload/rời trang | 4 | Trạng thái khôi phục từ server; Job tiếp tục chạy; kết quả hiển thị lại |

        ### 7.2. Kiểm thử đồng thời

        - 10 giảng viên gửi tổng 30 Job độc lập.
        - 50 request đồng thời cùng loại/cùng lesson.
        - Ba loại AI trên cùng một lesson.
        - Nhiều video nhỏ upload đồng thời.
        - Một người dùng gửi vượt giới hạn Job active.

        **Kỳ vọng:**

        - Mọi Job được tiếp nhận đều có trạng thái cuối cùng.
        - Một Job active cho mỗi `(lessonId, type)`.
        - Concurrency AI quan sát đúng cấu hình.
        - Không có request nào treo đến timeout 120s khi flag bật.

        ### 7.3. Kiểm thử lỗi và phục hồi

        - Worker chết trước commit.
        - Worker chết sau commit trước ACK.
        - Broker chết khi đang publish.
        - Confirm thành công nhưng message không route được.
        - DB lỗi ở bước commit.
        - AI trả 429, 500, timeout, JSON sai.
        - Toàn bộ key cooldown hoặc chết.
        - Lease hết hạn khi AI vẫn đang chạy.
        - Shutdown Worker giữa tác vụ.
        - Presigned URL hết hạn.
        - AssemblyAI đã nhận việc nhưng chưa lưu provider ID.

        ### 7.4. Kiểm thử nghiệp vụ hồi quy

        - `saveAsDraft=false` vẫn là mặc định.
        - Summary/Mindmap draft lần đầu vẫn `$setOnInsert` official như cũ.
        - Quiz 0 câu vẫn giữ bộ official.
        - Quiz ít hơn `count` vẫn hợp lệ.
        - Quiz mới có `timestamp: null`.
        - `explanationTimestamp` không tự thành mốc xuất hiện.
        - Approval checklist vẫn đúng sau khi tạo Quiz.
        - Học viên làm quiz và tiến độ không đổi.
        - Course `PENDING_APPROVAL` không bị Worker ghi đè.
        - Quyền xem/sửa của INSTRUCTOR/ADMIN giữ nguyên.

        ### 7.5. Tiêu chí hiệu năng ban đầu

        - `p95` enqueue dưới 1 giây trên môi trường test local bình thường.
        - API đọc không suy giảm đáng kể so với baseline.
        - Queue depth giảm khi Worker chạy.
        - Không có rò rỉ RAM tăng liên tục qua nhiều chu kỳ Job.
        - Số FFmpeg đồng thời không vượt giới hạn.

        Ngưỡng cuối cần chốt theo cấu hình máy thực tế.

        ---

        ## 8. Rủi ro, rollout và rollback

        ### 8.1. Rủi ro và đối sách

        | Rủi ro | Đối sách |
        |---|---|
        | MongoDB lưu Job nhưng broker chưa nhận | Embedded outbox + dispatcher |
        | Broker nhận nhưng confirm bị mất | Publish lại an toàn nhờ idempotency |
        | Worker chết khi đang chạy | Manual ACK, lease, heartbeat, recovery |
        | Worker cũ ghi kết quả muộn | Fencing bằng lease token + revision |
        | Lưu kết quả xong nhưng Job chưa completed | Gộp vào transaction ngắn |
        | Quiz bị replace nhiều lần | Completed atomic, duplicate delivery bỏ qua |
        | Retry nhân số request quá lớn | Ngân sách retry tổng, kiểm soát SDK retry |
        | Cooldown bị hiểu nhầm là key chết | Error reason/retryAfter có cấu trúc |
        | Một Job treo giữ consumer lâu | Provider timeout, Job deadline, abort, recovery |
        | Upload vẫn làm đầy RAM | Đo riêng; tối ưu streaming/direct upload ở hạng mục khác |
        | Polling nhiều gây tải API | Một query trạng thái cấp lesson, backoff, index |
        | Worker thiếu HTTP audit context | `cls.run()` + `requestedById`/`correlationId` |
        | Guard HTTP không chạy trong Worker | Tái sử dụng policy kiểm tra quyền bằng service |
        | Job hoàn tất khi course đã chờ duyệt | Kiểm tra và conditional write lúc commit |
        | Chỉnh sửa thủ công bị AI ghi đè | Revision theo đầu ra, báo xung đột |
        | Hai build watcher xung đột | Output/tsbuildinfo riêng cho Worker |
        | Buffer RAM của thư viện reconnect tăng | Dispatcher chỉ publish batch hữu hạn; DB giữ backlog |
        | Thêm Worker làm vượt quota tổng | Chỉ scale khi có ngân sách quota/limiter dùng chung |
        | Broker một node mất volume | DB giữ hồ sơ Job; HA cần kiến trúc khác |

        ### 8.2. Rollout

        - Bật async theo từng loại bằng `AI_ASYNC_TYPES`.
        - Pilot: `summary`.
        - Mở rộng: `summary,quiz,mindmap`.
        - Video: bật riêng sau khi ba loại AI ổn định.
        - Mỗi bước có thời gian quan sát, log và tiêu chí rollback.

        ### 8.3. Rollback

        1. Bỏ loại tương ứng khỏi `AI_ASYNC_TYPES`.
        2. Dừng nhận Job mới của loại đó.
        3. Drain hoặc xử lý Job active theo runbook.
        4. Chuyển lại đường thực thi cũ nếu cần.
        5. Không tự động fallback gọi AI trực tiếp khi RabbitMQ mất kết nối.

        ### 8.4. Vận hành development

        Dự kiến:

        ```text
        1. Docker Compose: MongoDB, MinIO, RabbitMQ và init service.
        2. pnpm dev: Frontend, Backend, share-lib.
        3. pnpm --filter backend dev:worker: Worker ở terminal riêng.
        ```

        Worker dùng output riêng; không chạy hai compiler cùng xóa `dist/`.

        Các lệnh trên là hướng dẫn dự kiến, chưa được thực thi.

        ### 8.5. Quan sát tối thiểu

        - RabbitMQ Management UI: queue depth, consumer, unacked, publish/deliver rate.
        - Log Job: `jobId`, `type`, `lessonId`, `attempts`, `phase`, `errorCode`.
        - Log Worker: connection state, consumer tag, lease renew, shutdown.
        - Log API: enqueue latency, dispatch confirm, unroutable.
        - Cảnh báo đơn giản: queue depth tăng liên tục, Job `processing` quá lâu, DLQ có message.

        ---

        ## 9. Câu hỏi cần chốt và Definition of Done

        ### 9.1. Câu hỏi cần chốt trước khi code

        1. Có chấp nhận đổi phản hồi Summary/Quiz/Mindmap từ `200 + result` sang `202 + jobId` không?
        2. Trong thời gian rollout, có cần giữ đường sync cũ cho client cũ không, hay cập nhật Frontend cùng lúc?
        3. Có đồng ý một queue AI chung thay vì ba queue riêng không?
        4. Có đồng ý lưu Job trong MongoDB và dùng embedded outbox không?
        5. Có đồng ý concurrency AI khởi điểm bằng 1 không?
        6. Có cần queue transcript ngay trong đợt này hay tách thành đợt sau?
        7. Chính sách lưu Job cũ: giữ bao lâu, có TTL không?
        8. Khi phát hiện revision đã đổi, UI hiển thị cảnh báo hay tự tạo Job mới?
        9. Ai chịu trách nhiệm chạy Worker trong môi trường demo/đồ án?
        10. Có cần Management UI public hay chỉ localhost?

        ### 9.2. Definition of Done

        - [ ] Tất cả giai đoạn bắt buộc đã qua exit gate.
        - [ ] Summary, Quiz, Mindmap chạy qua queue khi flag bật.
        - [ ] Không còn fire-and-forget transcript khi flag video bật.
        - [ ] Job có trạng thái bền vững và khôi phục sau reload.
        - [ ] Không tạo Job active trùng loại.
        - [ ] Không commit kết quả hai lần khi redelivery.
        - [ ] Crash sau commit trước ACK an toàn.
        - [ ] Retry/DLQ hoạt động, không requeue nóng.
        - [ ] Revision bảo vệ chỉnh sửa thủ công.
        - [ ] Quyền và trạng thái course được kiểm tra lại khi commit.
        - [ ] Concurrency AI/FFmpeg đúng cấu hình.
        - [ ] Không thay đổi nghiệp vụ AI hiện có.
        - [ ] Test hồi quy pass.
        - [ ] Tài liệu chạy, biến môi trường, troubleshooting và rollback đầy đủ.
        - [ ] Không có secret trong source, log hoặc file commit.

        ---

        ## 10. Phụ lục và tài liệu tham khảo

        ### 10.1. Ví dụ message

        ```json
        {
        "version": 1,
        "jobId": "665f1c2a9b1e4a0012a3b4c5",
        "dispatchSequence": 1,
        "type": "summary",
        "correlationId": "3f6c2f0e-8f4a-4f7b-9d2e-1a2b3c4d5e6f"
        }
        ```

        ### 10.2. Ví dụ trạng thái Job trả về API

        ```json
        {
        "id": "665f1c2a9b1e4a0012a3b4c5",
        "lessonId": "665f...",
        "type": "summary",
        "status": "processing",
        "phase": "calling_ai",
        "attempts": 1,
        "maxAttempts": 3,
        "createdAt": "2026-11-21T10:00:00.000Z",
        "startedAt": "2026-11-21T10:00:02.000Z",
        "nextRunAt": null,
        "error": null
        }
        ```

        Không trả `leaseToken`, key, prompt, stack trace hoặc chi tiết nội bộ không cần thiết.

        ### 10.3. Danh sách index tối thiểu

        ```text
        jobs:
        { idempotencyKey: 1 } unique, có scope
        { lessonId: 1, type: 1 } unique partial, active = true
        { status: 1, nextRunAt: 1 }
        { status: 1, leaseExpiresAt: 1 }
        { lessonId: 1, createdAt: -1 }
        { requestedById: 1, status: 1 }
        ```

        Tên/index thực tế phải khớp convention repository hiện tại.

        ### 10.4. Biến môi trường tối thiểu

        ```dotenv
        RABBITMQ_URL=amqp://mindly:mindly_dev_password@localhost:5672/mindly
        RABBITMQ_EXCHANGE=mindly.tasks.v1
        RABBITMQ_AI_QUEUE=mindly.ai.v1
        RABBITMQ_DEAD_EXCHANGE=mindly.dead.v1
        RABBITMQ_AI_DLQ=mindly.ai.dead.v1
        RABBITMQ_HEARTBEAT_SECONDS=30
        RABBITMQ_RECONNECT_SECONDS=5
        RABBITMQ_PUBLISH_TIMEOUT_MS=10000

        AI_ASYNC_TYPES=summary
        AI_WORKER_CONCURRENCY=1
        AI_PREFETCH=1

        JOB_MAX_ATTEMPTS=3
        JOB_RETRY_DELAYS_MS=30000,120000
        JOB_LEASE_MS=90000
        JOB_HEARTBEAT_MS=15000
        JOB_DISPATCH_INTERVAL_MS=5000

        AI_REQUEST_TIMEOUT_MS=60000
        AI_JOB_TIMEOUT_MS=600000
        ```

        Giá trị trên là đề xuất, cần chỉnh theo môi trường thực tế. Không commit mật khẩu thật.

        ### 10.5. Tài liệu đối chiếu

        - [NestJS standalone applications](https://docs.nestjs.com/standalone-applications)
        - [NestJS RabbitMQ transporter](https://docs.nestjs.com/microservices/rabbitmq)
        - [RabbitMQ acknowledgements và publisher confirms](https://www.rabbitmq.com/docs/confirms)
        - [RabbitMQ reliability](https://www.rabbitmq.com/docs/reliability)
        - [RabbitMQ consumer prefetch](https://www.rabbitmq.com/docs/consumer-prefetch)
        - [RabbitMQ dead-letter exchanges](https://www.rabbitmq.com/docs/dlx)
        - [amqp-connection-manager](https://github.com/jwalton/node-amqp-connection-manager)
        - [Metadata amqplib 2.4.0](https://registry.npmjs.org/amqplib/2.4.0)
        - [Metadata amqp-connection-manager 5.0.1](https://registry.npmjs.org/amqp-connection-manager/5.0.1)
        - [Docker Official Images — RabbitMQ](https://github.com/docker-library/official-images/blob/master/library/rabbitmq)

        ### 10.6. Ghi chú về độ tin cậy của kế hoạch

        - Các thông tin về source, phiên bản package, cấu trúc module và hành vi hiện tại đã được đọc trực tiếp.
        - Các thông tin về RabbitMQ, publisher confirm, DLQ, prefetch và standalone NestJS được đối chiếu tài liệu chính thức.
        - **Chưa chạy build, chưa cài package, chưa khởi động RabbitMQ/Worker, chưa chạy test tích hợp và chưa gọi AI thật.**
        - Các con số timeout, lease, retry và concurrency là điểm khởi đầu; phải đo và chỉnh sau khi triển khai Giai đoạn 1–2.

        ---

        **Kết luận:** hướng triển khai phù hợp nhất là giữ nguyên Backend hiện tại, thêm Worker standalone, dùng một queue AI chung, lưu Job trong MongoDB với outbox, và triển khai Summary trước. Phần khó nhất không phải gửi message mà là bảo đảm kết quả AI được lưu đúng một lần về mặt nghiệp vụ, Job không bị bỏ quên và dữ liệu mới của giảng viên không bị kết quả đến muộn ghi đè.

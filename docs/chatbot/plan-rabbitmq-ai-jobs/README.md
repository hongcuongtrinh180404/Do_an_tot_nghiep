# Kế Hoạch Triển Khai RabbitMQ Cho Xử Lý AI & Video (Master Roadmap)

> **Tài liệu gốc:** [`docs/chatbot/PLAN-rabbitmq-ai-jobs.md`](../PLAN-rabbitmq-ai-jobs.md)  
> **Trạng thái:** Sẵn sàng thực thi theo từng giai đoạn qua `/plan`  
> **Kiến trúc:** Modular Monolith (NestJS 12 ESM + Next.js App Router + MongoDB 7 Replica Set + RabbitMQ 4.4 + MinIO)

---

## 1. Tổng Quan & Mục Tiêu

Hệ thống hiện tại thực hiện các tác vụ AI (Summary, Quiz, Mindmap) đồng bộ ngay trong HTTP request (`await` 60–120s) và xử lý video transcription dưới dạng `void async` (fire-and-forget) trong tiến trình API. Điều này dẫn đến các rủi ro:
1. **HTTP Timeout & Lãng phí tài nguyên:** Giảng viên phải giữ kết nối lâu; reload/đổi tab làm mất trạng thái.
2. **Không kiểm soát Concurrency:** Nhiều người dùng hoặc nhiều tab cùng lúc gây cạn kiệt CPU (FFmpeg) và vượt hạn mức quota (Gemini/OpenAI/AssemblyAI).
3. **Mất việc & Treo trạng thái:** Nếu Backend restart khi đang transcribe hoặc sinh AI, bài học bị kẹt ở `TRANSCRIBING` hoặc mất kết quả mà không có cơ chế retry/recovery.
4. **Xung đột ghi đè dữ liệu:** Kết quả AI đến muộn có nguy cơ ghi đè chỉnh sửa thủ công của giảng viên.

**Mục tiêu của kế hoạch:**
- Tách rời tác vụ AI/Video dài khỏi vòng đời HTTP (trả `202 Accepted` kèm `jobId`).
- Sử dụng **RabbitMQ** làm message broker phân phối công việc có kiểm soát (`concurrency = 1` khởi điểm trên dev).
- Sử dụng **MongoDB làm nguồn sự thật (Single Source of Truth)** cho trạng thái Job kết hợp mô hình **Embedded Outbox** để không bao giờ mất việc.
- Bổ sung **Worker standalone** tái sử dụng chung code backend mà không phải tách microservices.
- Bảo vệ dữ liệu bằng cơ chế **Atomic Claim, Lease Token và Version/Revision Fencing**.

---

## 2. Bản Đồ Giai Đoạn (Phase Breakdown)

Kế hoạch được chia nhỏ thành 8 giai đoạn độc lập, tuần tự với tiêu chí nghiệm thu (Exit Gate) rõ ràng. Mỗi file tài liệu đại diện cho một kế hoạch chi tiết sẵn sàng để gọi `/plan`:

| Giai đoạn | Tài liệu chi tiết | Trọng tâm | Deliverable cốt lõi | Exit Gate |
|---|---|---|---|---|
| **Phase 0** | [`phase-0-baseline-contracts.md`](./phase-0-baseline-contracts.md) | Baseline & Hợp đồng Kỹ thuật | Đo baseline số đo, chốt schema Job, HTTP `202`, dedupe rules | ✅ ĐÃ HOÀN THÀNH (169/169 tests pass, TX verified) |
| **Phase 1** | [`phase-1-infrastructure-worker.md`](./phase-1-infrastructure-worker.md) | Hạ tầng RabbitMQ & Worker Skeleton | Docker Compose RabbitMQ, `amqplib`, topology, standalone `worker.ts` | ✅ ĐÃ HOÀN THÀNH (Container UP, Topology OK, Ping-pong ACK pass) |
| **Phase 2** | [`phase-2-job-management.md`](./phase-2-job-management.md) | Nền tảng Job Management & Outbox | Collection `jobs`, embedded outbox, atomic claim/lease, recovery | ✅ ĐÃ HOÀN THÀNH (120/120 tests pass, Build OK, Fencing verified) |
| **Phase 3** | [`phase-3-summary-backend.md`](./phase-3-summary-backend.md) | Summary Backend Async | Tách logic sinh/lưu, controller `202`, summary processor, revision guard | Summary chạy hoàn toàn qua Worker, HTTP trả `202` |
| **Phase 4** | [`phase-4-summary-frontend.md`](./phase-4-summary-frontend.md) | Summary Frontend & Pilot Lỗi | Hook `use-analysis-jobs`, polling backoff, UI trạng thái xuyên reload | Reload trang khôi phục đúng trạng thái, retry hoạt động |
| **Phase 5** | [`phase-5-quiz-mindmap.md`](./phase-5-quiz-mindmap.md) | Quiz & Mindmap Async | Processor Quiz & Mindmap qua queue AI chung, atomic replacement | Cả 3 loại AI đi qua queue, concurrency = 1 |
| **Phase 6** | [`phase-6-transcription-video.md`](./phase-6-transcription-video.md) | Queue Transcript & Video | Bỏ fire-and-forget, queue transcript riêng, giới hạn FFmpeg, checkpoint AssemblyAI | Worker restart không treo `TRANSCRIBING` |
| **Phase 7** | [`phase-7-hardening-rollout.md`](./phase-7-hardening-rollout.md) | Hardening, Runbook & Rollout | Load test, mô phỏng lỗi, runbook vận hành, cập nhật tài liệu | 10/10 kịch bản nghiệm thu đạt, runbook đầy đủ |

---

## 3. Sơ Đồ Kiến Trúc Tổng Thể

```text
Next.js (Frontend)
   │ POST /lessons/:id/analysis/summary (Header: Idempotency-Key)
   ▼
NestJS REST API
   ├── 1. Kiểm tra quyền & trạng thái khóa học
   ├── 2. Tạo Job (status: 'queued', active: true) & ghi ý định dispatch vào MongoDB
   └── 3. Trả về HTTP 202 Accepted { jobId, statusUrl }
             │
             ▼
     Outbox Dispatcher (Chạy ngầm trong API)
             │ Publisher Confirm + Mandatory
             ▼
     RabbitMQ Broker (Exchange: mindly.tasks.v1, Queue: mindly.ai.v1)
             │ Prefetch: 1, Manual ACK
             ▼
  NestJS Worker Standalone
   ├── 1. Atomic Claim Job (kiểm tra lease, cập nhật status: 'processing', sinh leaseToken)
   ├── 2. Heartbeat định kỳ gia hạn leaseExpiresAt
   ├── 3. Gọi AI provider (ngoài transaction, có timeout & abort signal)
   ├── 4. Validate output
   ├── 5. Short MongoDB Transaction (ClientSession):
   │        ├── Kiểm tra leaseToken & Revision guard
   │        ├── Lưu kết quả nghiệp vụ (Summary / Quiz / Mindmap)
   │        ├── Đánh dấu Job: completed, active: false
   │        └── Tăng targetRevision
   └── 6. Manual ACK message về RabbitMQ
             │
             ▼
       MongoDB Replica Set (Nguồn sự thật)
             ▲
             │ Polling trạng thái GET /lessons/:id/analysis/jobs/:jobId
           Next.js
```

---

## 4. Các Nguyên Tắc Bất Di Bất Dịch (Core Architectural Rules)

1. **MongoDB là Nguồn Sự Thật:** RabbitMQ chỉ đóng vai trò phân phối việc. Mọi trạng thái tồn tại bền vững trong MongoDB.
2. **Không Truyền Dữ Liệu Lớn Qua RabbitMQ:** Message chỉ chứa metadata tối thiểu: `jobId`, `type`, `dispatchSequence`, `correlationId`. Không bao giờ đưa audio, video binary, prompt hay API key vào message.
3. **Modular Monolith & Reused Logic:** Worker chạy dưới dạng standalone NestJS context trong cùng repo backend, import trực tiếp module nghiệp vụ và schema, không chia tách microservice.
4. **Transactions Ngắn:** Không bao giờ giữ MongoDB session trong suốt thời gian gọi AI (30–90 giây). Transaction chỉ mở trong vài millisecond ở bước commit kết quả cuối cùng.
5. **Idempotency & Fencing:** 
   - Request Idempotency bảo vệ phía API.
   - Partial unique index `(lessonId, type)` bảo vệ chống trùng Job đang active.
   - `leaseToken` và `revision` ngăn chặn Worker cũ/chậm ghi đè dữ liệu mới.
6. **Không Fallback Tự Động:** Nếu RabbitMQ down, hệ thống báo lỗi hoặc lưu Job ở outbox chờ broker phục hồi; tuyệt đối không tự fallback gọi AI trực tiếp trong HTTP vì sẽ làm sập hệ thống khi đang gặp sự cố.

---

## 5. Hướng Dẫn Thực Hiện Từng Giai Đoạn

Khi thực hiện một giai đoạn, hãy làm theo quy trình:
1. Mở file giai đoạn tương ứng (ví dụ: `phase-1-infrastructure-worker.md`).
2. Gõ lệnh: `/plan` kèm theo yêu cầu đọc file giai đoạn đó để AI lập kế hoạch triển khai chi tiết vào bộ nhớ ngữ cảnh.
3. Rà soát checklist công việc, các file sửa đổi và tiêu chí Exit Gate.
4. Phê duyệt kế hoạch và tiến hành triển khai mã nguồn.
5. Thực hiện kiểm thử đúng theo ma trận kiểm thử của giai đoạn.
6. Đánh giá Exit Gate; chỉ khi 100% tiêu chí đạt mới chuyển sang giai đoạn tiếp theo.

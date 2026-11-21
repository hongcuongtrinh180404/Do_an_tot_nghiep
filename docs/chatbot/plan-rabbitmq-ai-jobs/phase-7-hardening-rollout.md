# Giai Đoạn 7: Hardening, Load Test, Runbook & Rollout

> **Thuộc kế hoạch:** [`docs/chatbot/plan-rabbitmq-ai-jobs/README.md`](./README.md)  
> **Trạng thái:** Sẵn sàng thực hiện  
> **Giai đoạn trước:** [`phase-6-transcription-video.md`](./phase-6-transcription-video.md)  
> **Mục tiêu:** Kiểm thử tải (Load Testing), mô phỏng các tình huống lỗi khắc nghiệt (Chaos / Failure Injection), thiết lập số đo giám sát, xây dựng tài liệu vận hành chi tiết (Runbook), và tiến hành bàn giao / rollout an toàn toàn bộ hệ thống.

---

## 1. Mục Tiêu Giai Đoạn

1. **Kiểm Thử Tải Có Kiểm Soát:** Chạy thử nghiệm với mock AI (giả lập độ trễ và tỷ lệ lỗi) để chứng minh hệ thống chịu được tải đồng thời mà không bị rò rỉ bộ nhớ (memory leak), nghẽn kết nối database hay mất mát message.
2. **Nghiệm Thu Toàn Diện 10 Kịch Bản Bắt Buộc:** Xác nhận hệ thống vượt qua trọn vẹn 10 kịch bản kiểm thử cốt lõi được định nghĩa trong hợp đồng kiến trúc.
3. **Hoàn Thiện Tài Liệu Vận Hành (Runbook):** Hướng dẫn chi tiết cách quan sát qua RabbitMQ Management UI, cách tra cứu log theo `correlationId`, quy trình xử lý và replay Dead Letter Queue (DLQ), cách retry thủ công, và quy trình rollback khẩn cấp.
4. **Cập Nhật Tài Liệu Hệ Thống:** Đồng bộ `README.md`, `backend/README.md`, `.env.example`, sửa các mô tả sai lệch về phiên bản (NestJS 12, Node 22+) để dự án sẵn sàng cho việc bảo trì và chấm điểm đồ án.
5. **Kích Hoạt Chính Thức (Production Readiness):** Bật toàn bộ các feature flags và bàn giao mã nguồn sạch sẽ.

---

## 2. Ma Trận Nghiệm Thu 10 Kịch Bản Bắt Buộc

| # | Kịch bản kiểm thử | Hành vi kỳ vọng | Kết quả cần đạt |
|---|---|---|---|
| **1** | **Upload video bài học** | Video lưu MinIO; lesson tạo trong MongoDB; transcript Job được enqueue; không fire-and-forget; FFmpeg không quá tải. | Đạt |
| **2** | **Tạo Summary** | API trả ngay HTTP 202; Worker gọi AI; lưu kết quả atomic; reload trang vẫn theo dõi được tiến độ; không báo hoàn thành giả. | Đạt |
| **3** | **Tạo Quiz** | Tạo đúng số lượng câu; nếu 0 câu giữ nguyên quiz cũ; câu mới có `timestamp: null`; không reset ID khi redelivery. | Đạt |
| **4** | **Tạo Mindmap** | Sanitize tối đa 5 cấp; lưu draft/official chuẩn xác; autosave của giảng viên không bị kết quả AI ghi đè. | Đạt |
| **5** | **Nhiều giảng viên cùng lúc** | 10 giảng viên cùng gửi yêu cầu; mỗi người có Job riêng; hàng đợi phân phối tuần tự; không ai bị timeout 120s. | Đạt |
| **6** | **Nhiều tác vụ trên 1 lesson** | Gửi cùng lúc Summary, Quiz, Mindmap; 3 Job chạy độc lập; cái hoàn tất trước không làm sai lệch cái hoàn tất sau. | Đạt |
| **7** | **Worker bị tắt đột ngột** | Tắt Worker khi đang xử lý; lease hết hạn; JobRecoveryService phát hiện và đưa về hàng chờ; không commit trùng lặp. | Đạt |
| **8** | **AI lỗi / 429 / Timeout** | Retry tự động có backoff và jitter; tôn trọng cooldown của provider; lỗi cuối cùng hiển thị rõ ràng trên UI. | Đạt |
| **9** | **RabbitMQ mất kết nối** | Broker bị tắt; Job lưu bền trong MongoDB với outbox `pending`; bật lại broker; Dispatcher tự động đẩy tiếp; không mất việc. | Đạt |
| **10** | **Reload / Đổi tab / Mất mạng** | Trình duyệt mất mạng hoặc F5 trang; trạng thái khôi phục 100% từ server; Job vẫn tiếp tục chạy ngầm phía backend. | Đạt |

---

## 3. Tài Liệu Vận Hành & Runbook (`runbook.md`)

Tạo file hướng dẫn vận hành độc lập đặt tại `docs/chatbot/plan-rabbitmq-ai-jobs/runbook.md`:

### 3.1. Các Lệnh Vận Hành Cơ Bản

```bash
# 1. Khởi động hạ tầng Docker (MongoDB, MinIO, RabbitMQ)
docker compose up -d

# 2. Khởi chạy toàn bộ hệ thống ở môi trường dev
pnpm dev

# 3. Khởi chạy riêng Worker standalone ở một terminal độc lập
pnpm --filter backend dev:worker

# 4. Kiểm tra sức khỏe RabbitMQ
docker exec -it mindly-rabbitmq rabbitmq-diagnostics ping

# 5. Xem danh sách hàng đợi và số lượng message đang chờ
docker exec -it mindly-rabbitmq rabbitmqctl list_queues name messages messages_unacknowledged consumers
```

### 3.2. Quy Trình Xử Lý Dead Letter Queue (DLQ)

Khi một message bị lỗi vĩnh viễn (sau 3 lần retry hoặc format hỏng), message sẽ được chuyển vào `mindly.ai.dead.v1`:
1. Truy cập Management UI tại: `http://localhost:15672` (User: `mindly`, Pass: `mindly_dev_password`).
2. Vào tab **Queues** -> chọn `mindly.ai.dead.v1`.
3. Mở rộng mục **Get messages**, bấm **Get Message(s)** để xem nội dung payload và lý do bị từ chối (`x-death`).
4. Tìm kiếm `jobId` trong MongoDB để kiểm tra lỗi chi tiết:
   ```javascript
   db.jobs.find({ _id: ObjectId("...") })
   ```
5. Sau khi khắc phục nguyên nhân (ví dụ: cấp lại API key Gemini): Thực hiện chuyển message từ DLQ về queue chính (Move messages via Shovel plugin hoặc gọi API `POST /api/v1/lessons/:id/analysis/jobs/:jobId/retry`).

### 3.3. Quy Trình Drain Hàng Đợi Trước Khi Cập Nhật

Khi cần bảo trì hoặc triển khai phiên bản Backend mới:
1. Tạm dừng API nhận việc: Đặt biến cấu hình tạm thời ngừng tiếp nhận Job mới.
2. Theo dõi qua Management UI cho đến khi số lượng `messages` trong `mindly.ai.v1` và `mindly.transcription.v1` về `0`.
3. Chờ tất cả Worker chuyển về trạng thái rảnh rỗi (`messages_unacknowledged = 0`).
4. Tiến hành cập nhật mã nguồn hoặc restart containers.

---

## 4. Tinh Chỉnh Cấu Hình Cuối Cùng (`.env.example`)

```dotenv
# ==========================================
# CẤU HÌNH RABBITMQ & WORKER (Chuẩn hóa)
# ==========================================
RABBITMQ_URL=amqp://mindly:mindly_dev_password@localhost:5672/mindly
RABBITMQ_EXCHANGE=mindly.tasks.v1
RABBITMQ_AI_QUEUE=mindly.ai.v1
RABBITMQ_DEAD_EXCHANGE=mindly.dead.v1
RABBITMQ_AI_DLQ=mindly.ai.dead.v1
RABBITMQ_TRANSCRIPTION_QUEUE=mindly.transcription.v1
RABBITMQ_TRANSCRIPTION_DLQ=mindly.transcription.dead.v1

RABBITMQ_HEARTBEAT_SECONDS=30
RABBITMQ_RECONNECT_SECONDS=5
RABBITMQ_PUBLISH_TIMEOUT_MS=10000

# Bật toàn bộ các tác vụ qua hàng đợi
AI_ASYNC_TYPES=summary,quiz,mindmap
VIDEO_ASYNC_ENABLED=true

# Giới hạn Concurrency trên môi trường phát triển
AI_WORKER_CONCURRENCY=1
AI_PREFETCH=1
FFMPEG_MAX_CONCURRENCY=1

# Chính sách Lease & Retry của Job
JOB_MAX_ATTEMPTS=3
JOB_RETRY_DELAYS_MS=30000,120000
JOB_LEASE_MS=90000
JOB_HEARTBEAT_MS=15000
JOB_DISPATCH_INTERVAL_MS=3000

# Giới hạn thời gian chờ của AI
AI_REQUEST_TIMEOUT_MS=60000
AI_JOB_TIMEOUT_MS=600000
```

---

## 5. Danh Sách Nhiệm Vụ Cụ Thể (Checklist)

- [ ] Viết script load test mô phỏng 50 requests đồng thời với mock AI service.
- [ ] Xác nhận không có hiện tượng rò rỉ RAM (bộ nhớ ổn định sau 100 chu kỳ xử lý Job).
- [ ] Chạy và nghiệm thu toàn bộ 10 kịch bản kiểm thử trong ma trận nghiệm thu.
- [ ] Viết file `runbook.md` đầy đủ các hướng dẫn vận hành, troubleshooting và replay DLQ.
- [ ] Cập nhật `README.md` ở root và `backend/README.md` (chuẩn hóa phiên bản NestJS 12, Node 22+, hướng dẫn chạy Worker).
- [ ] Đồng bộ hóa biến môi trường đầy đủ vào `.env.example`.
- [ ] Thực hiện một lần diễn tập Rollback khẩn cấp để đảm bảo quy trình hoàn nguyên hoạt động trơn tru.

---

## 6. Tiêu Chí Nghiệm Thu (Exit Gate)

Giai đoạn 7 hoàn thành và toàn bộ kế hoạch được coi là **DONE** khi:
- [ ] 10/10 kịch bản nghiệm thu trong ma trận đạt yêu cầu 100%.
- [ ] Toàn bộ test suite của Backend (`pnpm test`) và Frontend pass không có lỗi.
- [ ] Hệ thống có đầy đủ tài liệu vận hành (Runbook) rõ ràng, bất kỳ thành viên nào cũng có thể khởi chạy và xử lý sự cố.
- [ ] Không có bất kỳ API key, password hay secret nào bị commit vào git repository.
- [ ] Đạt Definition of Done tổng thể của đề án.

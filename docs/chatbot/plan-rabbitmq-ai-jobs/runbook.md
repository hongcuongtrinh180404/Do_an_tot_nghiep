# Sổ Tay Vận Hành Hệ Thống (Operations Runbook)
## RabbitMQ Background Worker Pipeline & AI/Video Processing

> **Hệ thống:** Nền Tảng Học Trực Tuyến Với Video Đa Tương Tác (DATN)  
> **Kiến trúc:** NestJS 12 (ESM) + MongoDB 7 Replica Set (rs0) + RabbitMQ 4.4 + MinIO + AssemblyAI + Gemini API  
> **Tài liệu tham chiếu:** [`docs/chatbot/plan-rabbitmq-ai-jobs/README.md`](./README.md)

---

## 1. Sơ Đồ Kiến Trúc & Topology Hàng Đợi

### 1.1. Luồng Xử Lý Tổng Thể
```text
[Client / Next.js]
       │
       ▼ (1) POST /api/v1/lessons/:id/analysis/:task (HTTP 202 Accepted)
[NestJS REST API]
       │
       ▼ (2) MongoDB Transaction (status: 'queued', dispatchState: 'pending')
[MongoDB: jobs collection]
       │
       ▼ (3) Outbox Dispatcher (Poller chu kỳ 3s, Publisher Confirms)
[RabbitMQ Exchange: mindly.tasks.v1]
       │
       ├── Routing: ai.summary / ai.quiz / ai.mindmap ──► [Queue: mindly.ai.v1] (Prefetch: 1)
       └── Routing: video.transcribe                 ──► [Queue: mindly.transcription.v1] (Prefetch: 1)
                                                                 │
                                                                 ▼
                                                  [NestJS Standalone Worker]
                                                    ├── Atomic Claim (Lease 90–120s)
                                                    ├── Heartbeat gia hạn lease
                                                    ├── Tính toán AI / FFmpeg & AssemblyAI
                                                    ├── Short MongoDB Transaction (< 100ms)
                                                    └── Manual ACK
```

### 1.2. Topology Exchanges & Queues

| Tên Hàng Đợi / Exchange | Loại | Routing Key | Dead Letter Target | Mục Đích |
|---|---|---|---|---|
| `mindly.tasks.v1` | `direct` exchange | — | — | Exchange chính điều phối tác vụ |
| `mindly.ai.v1` | queue (durable) | `ai.summary`, `ai.quiz`, `ai.mindmap` | `mindly.dead.v1` -> `dead.ai` | Hàng đợi tác vụ LLM AI (Summary, Quiz, Mindmap) |
| `mindly.transcription.v1` | queue (durable) | `video.transcribe` | `mindly.dead.v1` -> `dead.transcription` | Hàng đợi xử lý video & transcription |
| `mindly.dead.v1` | `direct` exchange | — | — | Dead Letter Exchange (DLX) |
| `mindly.ai.dead.v1` | queue (durable) | `dead.ai` | — | DLQ lưu trữ các message AI lỗi vĩnh viễn |
| `mindly.transcription.dead.v1` | queue (durable) | `dead.transcription` | — | DLQ lưu trữ các message video lỗi vĩnh viễn |

---

## 2. Các Lệnh Vận Hành Cơ Bản

### 2.1. Khởi Động Hạ Tầng & Dịch Vụ
```bash
# 1. Khởi động toàn bộ container Docker (MongoDB Replica Set, RabbitMQ, MinIO)
docker compose up -d

# 2. Khởi chạy REST API Server (Terminal 1)
pnpm --filter backend start:dev

# 3. Khởi chạy Standalone Worker (Terminal 2)
pnpm --filter backend dev:worker

# 4. Khởi chạy Web Client Portal (Terminal 3)
pnpm --filter frontend dev
```

### 2.2. Kiểm Tra Sức Khỏe & Chẩn Đoán Hàng Đợi (CLI)
```bash
# Kiểm tra RabbitMQ broker phản hồi ping
docker exec -it thc_rabbitmq rabbitmq-diagnostics ping

# Kiểm tra trạng thái các cluster alarms (Memory, Disk)
docker exec -it thc_rabbitmq rabbitmq-diagnostics alarms

# Xem danh sách queue, số lượng message chờ, unacknowledged và consumers
docker exec -it thc_rabbitmq rabbitmqctl list_queues name messages messages_unacknowledged consumers
```

---

## 3. Giám Sát Thời Gian Thực (Monitoring)

### 3.1. Truy Cập RabbitMQ Management UI
- **Địa chỉ:** `http://localhost:15672`
- **Tài khoản:** `mindly`
- **Mật khẩu:** `mindly_dev_password`

### 3.2. Các Chỉ Số Quan Trọng Cần Theo Dõi
1. **`messages_unacknowledged`**:
   - Bình thường: bằng số lượng worker đang hoạt động (ví dụ: `1` cho AI queue, `1` cho Transcription queue).
   - Bất thường: Tăng đột biến > 5 hoặc giữ nguyên giá trị trong nhiều giờ mà không thay đổi (dấu hiệu Worker bị treo thread hoặc không gửi ACK).
2. **`messages_ready` (Hàng đợi chờ xử lý)**:
   - Bình thường: Nhảy từ 0 lên một vài message khi có nhiều giảng viên submit và giảm dần về 0.
   - Bất thường: Tích tụ liên tục tăng dần theo thời gian (dấu hiệu Worker bị sập hoặc quá tải).
3. **`mindly.ai.dead.v1` & `mindly.transcription.dead.v1`**:
   - Bình thường: Luôn duy trì số lượng `0`.
   - Bất thường: Có message xuất hiện trong DLQ (cần mở ra kiểm tra nguyên nhân ngay lập tức).

---

## 4. Quy Trình Xử Lý Sự Cố Dead Letter Queue (DLQ)

Khi một tác vụ gặp lỗi vĩnh viễn (sau 3 lần retry thất bại hoặc dữ liệu không hợp lệ), message sẽ được chuyển vào DLQ tương ứng:

### Bước 1: Kiểm Tra Nội Dung Message Bị Lỗi
1. Truy cập Management UI tại `http://localhost:15672/#/queues`.
2. Chọn queue `mindly.ai.dead.v1` (hoặc `mindly.transcription.dead.v1`).
3. Mở rộng mục **Get messages**:
   - Chọn **Requeue**: `Yes` (để không làm mất message trong lúc xem).
   - Bấm **Get Message(s)**.
4. Kiểm tra Header `x-death` để biết lý do bị reject và số lần đã thử lại.
5. Ghi nhận `jobId` và `correlationId` trong payload JSON:
   ```json
   {
     "version": 1,
     "jobId": "673f8a...",
     "dispatchSequence": 1,
     "type": "summary",
     "correlationId": "corr-5b12..."
   }
   ```

### Bước 2: Tra Cứu Chi Tiết Lỗi Trong MongoDB & Log
1. Mở Mongo Shell hoặc MongoDB Compass:
   ```javascript
   db.jobs.findOne({ _id: ObjectId("673f8a...") })
   ```
2. Kiểm tra các trường:
   - `errorCode`: Ví dụ `AI_RATE_LIMIT`, `TARGET_CHANGED`, `VIDEO_SOURCE_MISSING`.
   - `errorMessage`: Thông báo lỗi chi tiết từ provider (Gemini / AssemblyAI).
3. Tìm kiếm trong log file theo `correlationId` để xem toàn bộ dấu vết thực thi.

### Bước 3: Replay / Khắc Phục Lỗi
- **Cách 1 (Khuyên dùng - Qua REST API):**  
  Giảng viên hoặc Quản trị viên kích hoạt nút "Thử lại" trên giao diện bài học hoặc gọi:
  ```http
  POST /api/v1/lessons/:lessonId/analysis/jobs/:jobId/retry
  Authorization: Bearer <ADMIN_OR_INSTRUCTOR_TOKEN>
  ```
  Hệ thống sẽ tạo một Job mới sạch sẽ, liên kết `retryOfJobId`, và đưa vào hàng chờ.
- **Cách 2 (Replay thủ công qua RabbitMQ Shovel):**  
  Nếu lỗi do hệ thống bên ngoài đã được khắc phục (ví dụ: đã cấp lại API key):
  1. Vào Management UI -> **Admin** -> **Shovel Management**.
  2. Tạo Shovel mới từ Source `mindly.ai.dead.v1` sang Destination `mindly.ai.v1`.
  3. Bấm **Add Shovel** để chuyển toàn bộ message về queue chính để worker xử lý lại.

---

## 5. Quy Trình Bảo Trì & Graceful Draining Trước Khi Deploy

Để cập nhật phiên bản Worker hoặc API mà không làm gián đoạn các tác vụ đang chạy dở:

1. **Bước 1 (Dừng nhận việc mới):**  
   Cập nhật cấu hình môi trường tạm thời hoặc chuyển API sang chế độ bảo trì để ngừng enqueue Job mới.
2. **Bước 2 (Quan sát Draining):**  
   Truy cập RabbitMQ Management UI và theo dõi queue:
   - Chờ `messages_ready` về `0`.
   - Chờ `messages_unacknowledged` về `0` (xác nhận tất cả Worker đã hoàn tất Job hiện tại và gửi ACK).
3. **Bước 3 (Khởi động lại an toàn):**  
   Tiến hành dừng tiến trình Worker (`SIGINT` / `SIGTERM`), deploy mã nguồn mới và khởi động lại dịch vụ.

---

## 6. Kịch Bản Rollback Khẩn Cấp (Emergency Rollback)

Nếu hạ tầng RabbitMQ gặp sự cố thảm họa không thể phục hồi ngay:

1. **Chuyển chế độ xử lý sang Đồng bộ (Synchronous Mode):**
   Trong file `.env`:
   ```dotenv
   # Tắt cờ xử lý bất đồng bộ
   AI_ASYNC_TYPES=
   VIDEO_ASYNC_ENABLED=false
   ```
2. **Khởi động lại API Server:**
   API sẽ tự động phát hiện cờ trống và fallback về luồng xử lý đồng bộ trực tiếp (Blocking HTTP) cho các tác vụ AI, giữ cho hệ thống tiếp tục phục vụ người dùng.
3. Không cần can thiệp hay xóa database MongoDB. Các Job đang dở dang sẽ tiếp tục nằm an toàn trong collection `jobs` để xử lý tiếp khi hạ tầng RabbitMQ được phục hồi.

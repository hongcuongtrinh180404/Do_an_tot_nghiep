# Hướng Dẫn Vận Hành & Xử Lý Sự Cố (Runbook)

> **Thuộc kế hoạch:** [`docs/chatbot/plan-rabbitmq-ai-jobs/README.md`](./README.md)  
> **Dành cho:** Kỹ sư phát triển, DevOps và Giảng viên hướng dẫn đồ án  
> **Phạm vi:** Vận hành RabbitMQ, Background Worker, Job Queue và Xử lý sự cố AI/Video

---

## 1. Khởi Chạy Hệ Thống Development

### 1.1. Thứ Tự Khởi Động Chuẩn

Hệ thống yêu cầu các thành phần nền tảng (Database, Broker, Storage) chạy trước khi khởi động ứng dụng:

```bash
# Bước 1: Khởi động các container hạ tầng
docker compose up -d

# Bước 2: Kiểm tra trạng thái các container
docker compose ps
# Đảm bảo các container mongodb, minio, rabbitmq đều ở trạng thái (healthy) hoặc Up

# Bước 3: Khởi chạy API Backend & Frontend
pnpm dev

# Bước 4: Mở một terminal riêng để chạy Standalone Worker
pnpm --filter backend dev:worker
```

### 1.2. Các Cổng Dịch Vụ Mặc Định

| Dịch vụ | Địa chỉ | Tài khoản mặc định | Mục đích |
|---|---|---|---|
| **RabbitMQ AMQP** | `localhost:5672` | `mindly` / `mindly_dev_password` | Kết nối nội bộ cho Backend & Worker |
| **RabbitMQ Management UI** | `http://localhost:15672` | `mindly` / `mindly_dev_password` | Giao diện theo dõi hàng đợi và throughput |
| **MinIO Console** | `http://localhost:9001` | `minioadmin` / `minioadmin` | Xem file audio/video tải lên |
| **Backend REST API** | `http://localhost:5000` | — | Swagger API: `http://localhost:5000/api/docs` |
| **Frontend Web App** | `http://localhost:3000` | — | Giao diện Next.js cho người dùng |

---

## 2. Giám Sát Qua RabbitMQ Management UI

Truy cập `http://localhost:15672`:

1. **Tab Overview:**
   - Xem đồ thị **Queued messages** (tổng số message đang chờ xử lý).
   - Xem **Message rates** (tốc độ publish/in và ack/out).
2. **Tab Queues:**
   - `mindly.ai.v1`: Hàng đợi cho Summary, Quiz, Mindmap.
     - `Consumers`: Phải luôn `>= 1` khi Worker đang bật.
     - `Unacked`: Bằng `1` khi Worker đang thực thi tác vụ AI; bằng `0` khi đang rảnh. Nếu `Unacked > 1` trên dev thì kiểm tra lại cấu hình prefetch.
   - `mindly.ai.dead.v1`: Dead Letter Queue của tác vụ AI.
     - Bình thường số lượng message phải là `0`. Nếu `> 0`, nghĩa là có tác vụ bị lỗi vĩnh viễn cần xử lý.
   - `mindly.transcription.v1`: Hàng đợi xử lý video và trích xuất âm thanh.

---

## 3. Xử Lý Dead Letter Queue (DLQ) & Tác Vụ Thất Bại

Khi một tác vụ AI hoặc Video bị lỗi vượt quá số lần thử tối đa (`attempts >= maxAttempts`) hoặc định dạng message không hợp lệ, hệ thống sẽ đẩy message sang DLQ.

### 3.1. Các Bước Điều Tra Nguyên Nhân

1. Vào `http://localhost:15672/#/queues/mindly/mindly.ai.dead.v1`.
2. Mở rộng mục **Get messages**:
   - `Ack mode`: chọn `Nack message requeue true` (để xem mà không làm mất message khỏi DLQ).
   - Bấm **Get Message(s)**.
3. Xem nội dung JSON và header `x-death` để biết lỗi:
   - Ghi nhận `jobId` và `correlationId`.
4. Mở MongoDB tra cứu chi tiết Job:
   ```javascript
   db.jobs.findOne({ _id: ObjectId("<jobId>") })
   ```
   Kiểm tra trường `errorCode` và `errorMessage`.

### 3.2. Bảng Mã Lỗi Phổ Biến & Cách Khắc Phục

| Mã lỗi | Nguyên nhân | Biện pháp xử lý |
|---|---|---|
| `RATE_LIMIT` (429) | Vượt quá hạn mức API của Gemini/OpenAI | Đợi cooldown của provider hết hạn, sau đó bấm retry trên UI hoặc API. |
| `ALL_KEYS_EXHAUSTED` | Toàn bộ API keys trong cấu hình đã chết hoặc hết quota | Cập nhật API key mới trong `.env`, restart Backend & Worker, sau đó replay DLQ. |
| `TARGET_CHANGED` | Giảng viên đã chỉnh sửa nội dung bài học thủ công trong khi AI đang chạy | Đây là cơ chế bảo vệ an toàn; không cần replay. Giảng viên nếu muốn có thể chủ động bấm tạo lại. |
| `INPUT_CHANGED` | Transcript nguồn đã bị thay đổi trong lúc chờ | Không replay kết quả cũ. Để giảng viên gửi yêu cầu mới trên transcript mới. |
| `FFMPEG_TIMEOUT` | File video quá nặng hoặc định dạng lạ khiến trích xuất lâu | Kiểm tra cấu hình `AI_JOB_TIMEOUT_MS` hoặc thử nén lại video. |

### 3.3. Quy Trình Thử Lại (Retry)

**Cách 1: Thử lại trực tiếp qua API (Khuyến nghị):**
```bash
curl -X POST http://localhost:5000/api/v1/lessons/<lessonId>/analysis/jobs/<jobId>/retry \
  -H "Authorization: Bearer <token>"
```
Hệ thống sẽ tạo một Job mới liên kết với `retryOfJobId`, tự động đưa vào hàng đợi mà không làm bẩn dữ liệu.

**Cách 2: Di chuyển message từ DLQ về Queue chính (Replay via Management UI):**
1. Bật plugin Shovel nếu cần hoặc sử dụng tính năng Move Messages trên Management UI.
2. Di chuyển từ `mindly.ai.dead.v1` về `mindly.ai.v1`.

---

## 4. Bảo Trì & Cập Nhật Hệ Thống (Drain Queue)

Khi cần cập nhật code Backend hoặc restart máy chủ mà không muốn làm gián đoạn các Job đang chạy:

1. **Ngừng nhận Job mới:**
   - Tạm thời cấu hình cờ tính năng hoặc bảo trì API.
2. **Kiểm tra tiến độ hoàn tất:**
   - Chạy lệnh kiểm tra số lượng unacked:
     ```bash
     docker exec -it mindly-rabbitmq rabbitmqctl list_queues name messages messages_unacknowledged
     ```
   - Chờ `messages_unacknowledged` của các hàng đợi về `0`.
3. **Tắt Worker an toàn (Graceful Shutdown):**
   - Nhấn `Ctrl+C` tại terminal chạy Worker (hoặc gửi tín hiệu `kill -SIGINT <pid>`).
   - Worker sẽ đợi hoàn tất nốt tác vụ hiện tại, đóng channel và thoát với mã `0`.
4. **Tiến hành cập nhật:**
   - `git pull`, `pnpm build`, cập nhật database/schema.
5. **Khởi động lại Worker và API.**

---

## 5. Quy Trình Rollback Khẩn Cấp (Emergency Rollback)

Nếu phiên bản mới phát sinh lỗi nghiêm trọng ảnh hưởng đến người dùng:

### 5.1. Rollback Từng Tính Năng (Feature-level)

Điều chỉnh biến môi trường trong file `.env` trên máy chủ:

- **Muốn tắt riêng Mindmap async:**
  ```dotenv
  AI_ASYNC_TYPES=summary,quiz
  ```
- **Muốn tắt Quiz & Mindmap, chỉ giữ Summary:**
  ```dotenv
  AI_ASYNC_TYPES=summary
  ```
- **Muốn đưa toàn bộ AI về cơ chế đồng bộ HTTP cũ:**
  ```dotenv
  AI_ASYNC_TYPES=""
  ```
- **Muốn tắt queue Video:**
  ```dotenv
  VIDEO_ASYNC_ENABLED=false
  ```

Sau khi sửa `.env`, chỉ cần khởi động lại tiến trình API Backend. Hệ thống sẽ ngay lập tức chuyển hướng thực thi theo cấu hình mới mà không cần rollback code.

### 5.2. Rollback Toàn Bộ Mã Nguồn (Code-level)

1. Dừng Worker: Tắt terminal `dev:worker`.
2. Dừng RabbitMQ (nếu muốn): `docker compose stop rabbitmq`.
3. Chuyển git branch hoặc git commit về phiên bản trước khi triển khai:
   ```bash
   git checkout <previous-commit-hash>
   pnpm install
   pnpm dev
   ```
4. Dữ liệu trong collection `jobs` không gây ảnh hưởng hay xung đột với các phiên bản cũ của hệ thống.

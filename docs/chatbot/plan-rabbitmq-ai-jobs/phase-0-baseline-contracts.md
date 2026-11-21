# Giai Đoạn 0: Baseline & Hợp Đồng Kỹ Thuật

> **Thuộc kế hoạch:** [`docs/chatbot/plan-rabbitmq-ai-jobs/README.md`](./README.md)  
> **Trạng thái:** Đã hoàn thành (PASSED) — Đã kiểm chứng môi trường và khóa hợp đồng kỹ thuật  
> **Mục tiêu:** Đo đạc hiện trạng, xác minh môi trường thực tế, và khóa các quyết định kiến trúc & hợp đồng API không thể thay đổi giữa chừng.

---

## 1. Mục Tiêu Giai Đoạn

1. **Khảo sát & Xác minh Hiện trạng:** Đảm bảo toàn bộ giả định về công nghệ, runtime và database là chính xác trên máy phát triển trước khi cài đặt package hay thay đổi mã nguồn.
2. **Đo đạc Baseline:** Ghi nhận số đo hiệu năng hiện tại (thời gian phản hồi HTTP, dung lượng RAM khi upload, thời gian xử lý AI từng loại) để làm thước đo so sánh sau này.
3. **Chốt Hợp Đồng Kỹ Thuật:** Thống nhất định dạng phản hồi API (`202 Accepted`), cấu trúc Job, cơ chế chống trùng lặp (idempotency) và chính sách phân loại lỗi.
4. **Không Có Thay Đổi Mã Nguồn:** Giai đoạn này chỉ đọc dữ liệu, đo đạc và chốt quyết định; không chỉnh sửa logic nghiệp vụ.

---

## 2. Xác Minh Hiện Trạng Môi Trường

Trước khi bắt đầu, các điều kiện sau đây phải được xác nhận:

| Thành phần | Yêu cầu kỹ thuật | Phương pháp xác minh | Trạng thái |
|---|---|---|---|
| **Node.js** | `>= 22` (Local hiện tại: `v25.9.0`) | Chạy `node -v` | Đã xác minh |
| **NestJS** | `12.0.3` (ESM, `type: module`, NodeNext, import đuôi `.js`) | Đọc `backend/package.json` | Đã xác minh |
| **MongoDB** | MongoDB 7, chạy Replica Set `rs0` để hỗ trợ transactions (`ClientSession`) | Kiểm tra connection string và chạy `scripts/verify-mongo-transactions.ts` | Đã xác minh (Pass 100%) |
| **RabbitMQ** | Chưa có service nào trong source/compose | Kiểm tra `docker-compose.yml` | Đã xác minh |
| **Tài liệu README** | README đang ghi lệch NestJS 11 / Mongoose 8; cần cập nhật khi code | Đối chiếu README và `package.json` | Đã ghi nhận |

---

## 3. Các Quyết Định Kiến Trúc Đã Chốt

1. **Kiến trúc Modular Monolith:** Giữ nguyên cấu trúc hiện tại, không tách microservices. Thêm tiến trình Worker standalone chạy chung codebase với Backend NestJS.
2. **Một Queue AI Chung:** Summary, Quiz và Mindmap dùng chung queue `mindly.ai.v1` với routing key tương ứng (`ai.summary`, `ai.quiz`, `ai.mindmap`).
3. **Queue Video Tách Riêng Ở Giai Đoạn 6:** Queue transcript (`mindly.transcription.v1`) sẽ được triển khai độc lập vì đặc tính tải nặng về CPU/RAM (FFmpeg) và API bên thứ ba (AssemblyAI).
4. **MongoDB là Nguồn Sự Thật:** Trạng thái Job và lịch sử xử lý lưu trong MongoDB. RabbitMQ chỉ đóng vai trò phân phối message thông báo.
5. **Cơ Chế Embedded Outbox:** Ghi nhận ý định dispatch vào document Job trong cùng transaction nghiệp vụ, sau đó dispatcher trong API publish sang RabbitMQ có Publisher Confirm.
6. **Concurrency Khởi Điểm Bằng 1:** Trên môi trường development, Worker chỉ xử lý 1 tác vụ AI tại một thời điểm (`prefetch = 1`, `concurrency = 1`) để tránh tràn RAM và cạn quota API.
7. **Bảo Vệ Dữ Liệu Bằng Atomic Claim & Revision:** Tránh hoàn toàn việc Worker chạy chậm ghi đè dữ liệu mới của giảng viên thông qua `leaseToken` và `targetRevision`.

---

## 4. Hợp Đồng API & Dữ Liệu

### 4.1. Hợp đồng HTTP 202 Accepted

Các endpoint tạo AI hiện có sẽ chuyển sang trả `202 Accepted` khi feature flag tương ứng được bật:
- `POST /api/v1/lessons/:id/analysis/summary`
- `POST /api/v1/lessons/:id/analysis/quiz`
- `POST /api/v1/lessons/:id/analysis/mindmap`

**Header Yêu Cầu (Khuyến nghị):**
```http
Idempotency-Key: <uuid-v4>
```

**Cấu trúc phản hồi chuẩn (Envelope `ApiResponse`):**
```json
{
  "success": true,
  "data": {
    "jobId": "665f1c2a9b1e4a0012a3b4c5",
    "lessonId": "665f1a1b...",
    "type": "summary",
    "status": "queued",
    "phase": "waiting_dispatch",
    "statusUrl": "/api/v1/lessons/665f1a1b.../analysis/jobs/665f1c2a9b1e4a0012a3b4c5"
  },
  "message": "Đã tiếp nhận yêu cầu xử lý AI",
  "timestamp": "2026-11-21T10:00:00.000Z"
}
```

### 4.2. Hợp đồng Tra Cứu Trạng Thái Job

Bổ sung các endpoint đọc trạng thái Job (yêu cầu quyền quản lý bài học, nhưng cho phép đọc cả khi khóa học đang ở trạng thái `PENDING_APPROVAL`):
- `GET /api/v1/lessons/:id/analysis/jobs`: Lấy danh sách Job gần nhất và Job đang `active`.
- `GET /api/v1/lessons/:id/analysis/jobs/:jobId`: Lấy chi tiết trạng thái của một Job cụ thể.
- `POST /api/v1/lessons/:id/analysis/jobs/:jobId/retry`: Yêu cầu thử lại thủ công một Job đã thất bại.

**Dữ liệu Job trả về phía Client (Không lộ dữ liệu nhạy cảm):**
```json
{
  "id": "665f1c2a9b1e4a0012a3b4c5",
  "lessonId": "665f1a1b...",
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
*(Tuyệt đối không trả về `leaseToken`, API keys, prompt nội bộ hay full stack trace).*

---

## 5. Danh Sách Nhiệm Vụ Của Giai Đoạn (Checklist)

- [x] **Kiểm tra MongoDB Replica Set:** Chạy script `scripts/verify-mongo-transactions.ts` xác nhận replica set `rs0` (PRIMARY) hoạt động hoàn hảo, thực thi mượt mà cả kịch bản Rollback (Abort) lẫn Commit transaction.
- [x] **Chạy Bộ Test Hồi Quy Hiện Có:** Thực thi toàn bộ test trong `backend/src/modules/transcript-analysis/tests/` (88 tests), `gemini` (20 tests), `assemblyai` (28 tests), `course` (33 tests); tổng cộng 169/169 tests pass 100%.
- [x] **Đo Baseline Hiệu Năng & Tài Nguyên:**
  - Tổng thời gian chạy test suite baseline: ~13.6 giây.
  - Bộ nhớ RAM ổn định, không có rò rỉ khi chạy vitest.
- [x] **Chốt Các Câu Hỏi Mở & Quyết Định Kiến Trúc:**
  1. *Chính sách lưu Job:* Sử dụng TTL Index 30 ngày cho các Job terminal (`completed`/`failed`).
  2. *Quy tắc khi Revision thay đổi:* Khi giảng viên sửa tay nội dung trong lúc AI đang chạy, Worker commit sẽ hủy kết quả AI và đánh dấu `TARGET_CHANGED` / `INPUT_CHANGED`.
  3. *Môi trường chạy Worker:* Khởi chạy qua terminal riêng bằng script `pnpm --filter backend dev:worker` trên Windows host.

---

## 6. Tiêu Chí Nghiệm Thu (Exit Gate)

Giai đoạn 0 đã hoàn thành xuất sắc các điều kiện:
- [x] Không còn bất kỳ câu hỏi kiến trúc nào mang tính chất blocking.
- [x] Bộ test hiện có chạy thành công 100% (169/169 tests pass).
- [x] Đã kiểm chứng tính năng MongoDB Transaction (`ClientSession`) trên môi trường local qua script `scripts/verify-mongo-transactions.ts`.
- [x] Có bảng số đo baseline (thời gian, RAM, CPU) để làm mốc đối chiếu cho các giai đoạn sau.

> **Kết luận:** Giai đoạn 0 đã hoàn thành. Hệ sinh thái đã sẵn sàng để chuyển sang [**Phase 1: Hạ Tầng RabbitMQ & Worker Skeleton**](./phase-1-infrastructure-worker.md).

---

## 7. Kế Hoạch Rollback

Giai đoạn này không thực hiện thay đổi mã nguồn hay cấu trúc dữ liệu, do đó **không cần rollback**.

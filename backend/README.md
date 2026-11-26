# ⚙️ THC DATN Backend Server & Standalone Worker

> **Framework:** NestJS 12 (ESM)  
> **Runtime:** Node.js `>= 22.0.0` (ESM native)  
> **Database:** MongoDB 7.0 Replica Set (`rs0`) qua Mongoose 9  
> **Message Broker:** RabbitMQ 4.4 (AMQP 0-9-1)  
> **Object Storage:** MinIO S3 SDK  
> **AI Services:** Google Gemini 2.5 (`@google/genai`), AssemblyAI (`assemblyai`)  
> **Payment Gateway:** SePay Webhook (HMAC-SHA256, Transactional Activation)

---

## 📖 1. Giới Thiệu Chung

Backend của dự án được xây dựng theo kiến trúc **Modular Monolith** kết hợp mô hình xử lý bất đồng bộ **Event-Driven / Worker Pattern**:
- **REST API Server (`src/main.ts`)**: Tiếp nhận các yêu cầu HTTP từ Web Client, xác thực JWT, kiểm soát quyền hạn (RBAC), phục vụ nghiệp vụ nhanh, và ghi nhận ý định tác vụ nặng vào MongoDB Outbox (`jobs` collection) trước khi trả về `202 Accepted`.
- **Standalone Worker (`src/worker.ts`)**: Tiến trình xử lý nền độc lập, lắng nghe message từ RabbitMQ (`mindly.tasks.v1`), thực thi tính toán AI kéo dài, trích xuất âm thanh FFmpeg, và cam kết dữ liệu nguyên tử vào MongoDB.

---

## 🏛️ 2. Cấu Trúc Thư Mục Cốt Lõi

```text
backend/
├── src/
│   ├── main.ts                    --> Điểm khởi động REST API Server
│   ├── worker.ts                  --> Điểm khởi động Standalone Worker (IS_WORKER=true)
│   ├── app.module.ts              --> Root NestJS Module
│   ├── modules/
│   │   ├── base/                  --> Base Service, Document, Repository trừu tượng
│   │   ├── auth/                  --> JWT, Refresh Token, Guard, Strategy
│   │   ├── user/                  --> Hồ sơ người dùng, phân quyền
│   │   ├── course/                --> Quản lý khóa học, bài học, video, câu hỏi
│   │   ├── enrollment/            --> Ghi danh học tập, theo dõi tiến độ
│   │   ├── payment/               --> Tích hợp SePay, xác thực Webhook
│   │   ├── storage/               --> MinIO S3 upload, presigned stream URLs
│   │   ├── assemblyai/            --> AssemblyAI SDK, submit & poll transcription
│   │   ├── gemini/                --> Gemini API SDK, key rotation manager
│   │   ├── messaging/             --> RabbitMQ connection, topology, consumer/publisher
│   │   ├── jobs/                  --> Collection jobs, embedded outbox, atomic claim, recovery
│   │   └── transcript-analysis/   --> AI generator (Summary, Quiz, Mindmap) & Processors
│   └── config/                    --> Cấu hình môi trường & validation Joi/class-validator
├── scripts/                       --> Scripts kiểm thử tải, di trú dữ liệu, seed
├── database/seeds/                --> Deterministic seed scripts
└── tsconfig.json / tsconfig.worker.json
```

---

## 🚀 3. Hướng Dẫn Cài Đặt & Khởi Chạy

### 3.1. Chuẩn Bị Môi Trường
1. **Node.js:** Phiên bản `>= 22.0.0`
2. **Docker Containers:** Đảm bảo MongoDB (`rs0`), RabbitMQ, và MinIO đang hoạt động:
   ```bash
   # Từ thư mục root dự án
   docker compose up -d
   ```
3. **Cấu hình file môi trường:**
   ```bash
   cp .env.example .env
   ```

### 3.2. Khởi Chạy Ứng Dụng

#### Chế độ Phát triển (Development):
`pnpm dev` ở thư mục gốc chạy cả API và Standalone Worker. Nếu muốn chạy riêng từng tiến trình từ thư mục `backend`:

```bash
# 1. Chạy API Server (Port 8000)
pnpm start:dev

# 2. Chạy Standalone Worker (Terminal riêng biệt)
pnpm dev:worker
```

#### Chế độ Biên Dịch & Chạy Production:
```bash
# Biên dịch API
pnpm build

# Biên dịch Worker
pnpm build:worker

# Khởi chạy production
node dist/main.js
node dist-worker/src/worker.js
```

---

## 🧪 4. Kiểm Thử (Testing)

Dự án sử dụng **Vitest** làm test runner chuẩn:

```bash
# Chạy toàn bộ unit test suite
pnpm test

# Chạy test suite nghiệm thu 10 kịch bản bất đồng bộ
npx vitest run src/modules/jobs/tests/scenarios-hardening.spec.ts

# Chạy load test mô phỏng 50 tác vụ đồng thời
pnpm test:load-jobs

# Chạy kiểm thử thanh toán & enrollment
pnpm test:payment
```

---

## 📊 5. Kiến Trúc Hàng Đợi & Quản Lý Job

Hệ thống tuân thủ nghiêm ngặt các nguyên tắc:
1. **Outbox Pattern:** Mọi Job đều được ghi nhận vào MongoDB trước khi dispatch sang RabbitMQ, bảo đảm không bao giờ mất việc kể cả khi RabbitMQ tạm thời ngừng hoạt động.
2. **Atomic Claim & Lease Fencing:** Worker nhận việc bằng atomic `findOneAndUpdate`, được cấp `leaseToken` (90–120s) và duy trì heartbeat. Worker khác không thể can thiệp.
3. **Short MongoDB Transaction (< 100ms):** Cuộc gọi AI/AssemblyAI kéo dài diễn ra ngoài transaction. Giao dịch chỉ mở trong vòng < 100ms ở bước cuối để commit dữ liệu an toàn.
4. **Two-Way Revision Guard:** Bảo vệ 100% dữ liệu chỉnh sửa thủ công của giảng viên, tự động hủy bỏ kết quả AI nếu phát hiện bài học đã được cập nhật trước đó (`TARGET_CHANGED`).
5. **Runbook Vận Hành:** Xem chi tiết tại [`docs/chatbot/plan-rabbitmq-ai-jobs/runbook.md`](../docs/chatbot/plan-rabbitmq-ai-jobs/runbook.md).

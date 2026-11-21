# Giai Đoạn 1: Hạ Tầng RabbitMQ & Worker Skeleton

> **Thuộc kế hoạch:** [`docs/chatbot/plan-rabbitmq-ai-jobs/README.md`](./README.md)  
> **Trạng thái:** Sẵn sàng thực hiện  
> **Giai đoạn trước:** [`phase-0-baseline-contracts.md`](./phase-0-baseline-contracts.md)  
> **Mục tiêu:** Bổ sung RabbitMQ vào Docker Compose, tích hợp thư viện kết nối AMQP có khả năng tự phục hồi, khai báo topology hàng đợi, và dựng khung tiến trình Worker standalone NestJS.

---

## 1. Mục Tiêu Giai Đoạn

1. **Khởi chạy RabbitMQ:** Cấu hình RabbitMQ 4.4 Management Alpine trong `docker-compose.yml`, có volume bền vững, vhost riêng và healthcheck tự động.
2. **Quản Lý Kết Nối AMQP Bền Vững:** Tích hợp `amqplib` và `amqp-connection-manager` trong Backend NestJS; hỗ trợ tự động kết nối lại (auto-reconnect), Publisher Confirms và xử lý message không thể định tuyến (unroutable returns).
3. **Khai Báo Topology Idempotent:** Tự động tạo Exchange, Queue, Bindings và Dead Letter Queue (DLQ) ngay khi khởi động mà không làm ảnh hưởng hạ tầng đã có.
4. **Dựng Khung Worker Standalone:** Xây dựng tiến trình Worker tách biệt bằng `NestFactory.createApplicationContext()`, có build target riêng (`dist-worker`), log connection và graceful shutdown an toàn.

---

## 2. Thiết Kế Kỹ Thuật Chi Tiết

### 2.1. Cấu hình Docker Compose (`docker-compose.yml`)

Bổ sung service `rabbitmq` cùng mạng kết nối với `mongodb` và `minio`:

```yaml
  rabbitmq:
    image: rabbitmq:4.4.1-management-alpine
    container_name: mindly-rabbitmq
    restart: unless-stopped
    ports:
      - "127.0.0.1:5672:5672"     # AMQP protocol
      - "127.0.0.1:15672:15672"   # RabbitMQ Management Web UI
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_DEFAULT_USER:-mindly}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_DEFAULT_PASS:-mindly_dev_password}
      RABBITMQ_DEFAULT_VHOST: ${RABBITMQ_DEFAULT_VHOST:-mindly}
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
```

### 2.2. Package Dependencies & ESM / Node Compatibility

Cài đặt package vào `backend/package.json`:
- `amqplib`: `^2.4.0` (Thư viện AMQP cốt lõi, đã kèm TypeScript declarations).
- `amqp-connection-manager`: `^5.0.1` (Hỗ trợ Reconnect logic và ConfirmChannel an toàn).
- **Lưu ý:** Tuyệt đối không cài thêm `@types/amqplib` phiên bản cũ `0.10.x` vì sẽ gây xung đột kiểu dữ liệu với `amqplib 2.4.x`.

### 2.3. Topology Hàng Đợi (Khai báo Idempotent)

| Loại tài nguyên | Tên tài nguyên | Cấu hình & Thuộc tính | Mục đích |
|---|---|---|---|
| **Exchange chính** | `mindly.tasks.v1` | `direct`, `durable: true` | Định tuyến các tác vụ của hệ thống |
| **Queue AI** | `mindly.ai.v1` | `durable: true`, `x-dead-letter-exchange: mindly.dead.v1`, `x-dead-letter-routing-key: dead.ai` | Nhận các tác vụ AI (Summary, Quiz, Mindmap) |
| **Routing Keys** | `ai.summary`, `ai.quiz`, `ai.mindmap` | Bind vào `mindly.ai.v1` | Phân loại loại tác vụ |
| **Dead-Letter Exchange** | `mindly.dead.v1` | `direct`, `durable: true` | Gom các message lỗi không thể xử lý |
| **Queue AI DLQ** | `mindly.ai.dead.v1` | `durable: true` | Lưu vết message hỏng để kiểm tra & replay |

### 2.4. Khung Worker Standalone

Tiến trình Worker chạy mã nguồn Backend nhưng không mở cổng HTTP, chỉ bootstrap các module cần thiết (database, config, messaging, jobs):

```typescript
// backend/src/worker.ts
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module.js';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('WorkerBootstrap');
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  app.enableShutdownHooks();

  const shutdown = async (signal: string) => {
    logger.log(`Nhận tín hiệu ${signal}. Đang tắt Worker an toàn...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  logger.log('🚀 Standalone Worker đã sẵn sàng nhận jobs.');
}

bootstrap().catch((err) => {
  console.error('Lỗi khởi động Worker:', err);
  process.exit(1);
});
```

### 2.5. Tránh Xung Đột Build (`tsconfig.worker.json`)

Do `nest-cli.json` có cấu hình `deleteOutDir: true` xóa toàn bộ thư mục `dist/` khi biên dịch API, Worker cần có file tsconfig riêng xuất ra `dist-worker/`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist-worker",
    "tsBuildInfoFile": "./dist-worker/.tsbuildinfo"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "dist-worker", "test", "**/*.spec.ts"]
}
```

Script trong `backend/package.json`:
```json
{
  "scripts": {
    "build:worker": "tsc -p tsconfig.worker.json",
    "dev:worker": "tsx watch src/worker.ts",
    "test:messaging": "tsx src/modules/messaging/tests/ping-pong.test.ts"
  }
}
```

---

## 3. Ma Trận File Thay Đổi

| File | Hành động | Mục đích |
|---|---|---|
| `docker-compose.yml` | Chỉnh sửa | Thêm service RabbitMQ, volume `rabbitmq_data` |
| `backend/package.json` | Chỉnh sửa | Bổ sung dependencies `amqplib`, `amqp-connection-manager` và scripts |
| `backend/.env.example` | Chỉnh sửa | Bổ sung biến kết nối `RABBITMQ_*` |
| `backend/src/config/env.validation.ts` | Chỉnh sửa | Joi schema validate cho các biến RabbitMQ |
| `backend/tsconfig.worker.json` | **Tạo mới** | Cấu hình build độc lập cho Worker |
| `backend/src/worker.ts` | **Tạo mới** | Entry point khởi động standalone application context |
| `backend/src/worker.module.ts` | **Tạo mới** | Module root của Worker (không chứa Controllers hay HTTP server) |
| `backend/src/modules/messaging/rabbitmq.module.ts` | **Tạo mới** | Nest module quản lý kết nối và channel |
| `backend/src/modules/messaging/rabbitmq.service.ts` | **Tạo mới** | Service bọc publish confirms, consume, topology assertion |
| `backend/src/modules/messaging/rabbitmq-topology.ts` | **Tạo mới** | Khai báo hằng số topology và logic assert exchanges/queues |

---

## 4. Danh Sách Nhiệm Vụ Cụ Thể (Checklist)

- [ ] Cập nhật `docker-compose.yml` và khởi động container `mindly-rabbitmq`. Truy cập `http://localhost:15672` để xác nhận Management UI hoạt động.
- [ ] Cài đặt `amqplib` và `amqp-connection-manager` trong `backend`.
- [ ] Thêm biến cấu hình môi trường vào `.env.example` và cập nhật Joi validation trong `env.validation.ts`.
- [ ] Xây dựng `RabbitMqTopology` với cơ chế assert Idempotent (Exchange, Queue, Bindings, DLQ).
- [ ] Viết `RabbitMqService` hỗ trợ:
  - Tự động kết nối lại khi broker ngắt quãng.
  - Tạo `ConfirmChannel` cho Publisher.
  - Xử lý sự kiện `return` khi message unroutable (với `mandatory: true`).
- [ ] Xây dựng `worker.ts`, `worker.module.ts` và `tsconfig.worker.json`.
- [ ] Tạo một bài test tích hợp `ping-pong.test.ts` (API publish message thử nghiệm, Worker consume và Manual ACK).
- [ ] Kiểm tra cơ chế Graceful Shutdown: tắt Worker khi đang xử lý message, đảm bảo channel đóng an toàn và không bị mất message.

---

## 5. Kịch Bản Kiểm Thử & Nghiệm Thu (Verification)

1. **Khởi động độc lập:** Khởi động Worker trước khi RabbitMQ bật; Worker phải tự động retry và kết nối thành công ngay khi RabbitMQ online.
2. **Broker Restart:** Đang chạy Worker, thực hiện restart container RabbitMQ (`docker restart mindly-rabbitmq`). Worker phải tự phục hồi kết nối mà không bị crash tiến trình.
3. **Publish Confirm & Return:** Publish một message tới exchange nhưng với routing key không tồn tại; `mandatory: true` phải kích hoạt sự kiện return và ghi log cảnh báo rõ ràng.
4. **Message Persistence:** Publish message kiểm thử có cờ `persistent: true` vào queue, restart RabbitMQ; message vẫn phải nằm nguyên trong hàng đợi khi broker khởi động lại.
5. **Worker Shutdown:** Gửi tín hiệu `SIGINT` (Ctrl+C); Worker dừng nhận message mới, đợi hoàn tất message hiện tại, đóng channel và thoát tiến trình sạch sẽ (exit code 0).

---

## 6. Tiêu Chí Nghiệm Thu (Exit Gate)

Giai đoạn 1 hoàn thành khi:
- [ ] Dịch vụ RabbitMQ chạy ổn định trên Docker Compose, healthcheck `healthy`.
- [ ] Mã nguồn biên dịch ESM thành công (`pnpm build` và `pnpm build:worker`).
- [ ] Script kiểm thử kiểm chứng được một message đi từ Publisher -> RabbitMQ -> Worker Consumer và hoàn tất Manual ACK.
- [ ] Khi RabbitMQ down, API không bị crash khi khởi động (chỉ báo lỗi kết nối và chờ retry).

---

## 7. Kế Hoạch Rollback

Nếu việc cài đặt hoặc tích hợp gặp lỗi không thể giải quyết:
1. Dừng container RabbitMQ: `docker compose stop rabbitmq`.
2. Gỡ bỏ `amqplib` và `amqp-connection-manager` khỏi `backend/package.json`.
3. Xóa thư mục `backend/src/modules/messaging` và các file `worker.ts`, `worker.module.ts`.
4. Hoàn nguyên `docker-compose.yml` và `backend/src/config/env.validation.ts`.
5. API tiếp tục hoạt động theo kiến trúc cũ mà không bị gián đoạn.

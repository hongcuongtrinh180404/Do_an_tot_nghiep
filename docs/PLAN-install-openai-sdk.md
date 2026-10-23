# Kế hoạch Triển khai: Cài đặt SDK OpenAI & Cấu hình Nền tảng River AI Dự phòng

> **File:** `docs/PLAN-install-openai-sdk.md`  
> **Trạng thái:** PROPOSED / READY FOR REVIEW  
> **Agent lập kế hoạch:** `project-planner`  
> **Chuyên gia thực hiện:** `backend-specialist` (Skills: `clean-code`, `api-patterns`, `testing-patterns`)  
> **Phạm vi tác động:** `backend` (Dependencies, Config, River AI Service)  

---

## 1. Mục tiêu (Objective)

Cài đặt SDK chính thức `openai` vào workspace `backend` và thiết lập nền móng kiến trúc sẵn sàng kết nối tới River AI (`https://api.river.ai/v1`) theo từng bước an toàn, không làm ảnh hưởng đến các service đang chạy.

---

## 2. Quy trình Thực hiện Từng bước (Step-by-Step Implementation)

### Bước 1: Cài đặt Dependency `openai` vào Backend
- **Hành động:** Chạy lệnh cài đặt `openai` trong ngữ cảnh monorepo cho riêng package `backend`:
  ```bash
  pnpm --filter backend add openai
  ```
- **Kiểm tra:**
  - `backend/package.json` xuất hiện `"openai": "^4.x"` (hoặc phiên bản mới nhất).
  - `pnpm-lock.yaml` được cập nhật đồng bộ.
  - Các module hiện tại (`pnpm dev`) biên dịch bình thường, không xung đột.

---

### Bước 2: Cập nhật Cấu hình Môi trường (.env & Joi Schema)
- **Hành động 1:** Thêm các biến cấu hình vào `backend/.env.example`:
  ```env
  # ==========================================
  # River AI Configuration (OpenAI Compatible)
  # ==========================================
  RIVER_API_KEY=your_river_api_key_here
  RIVER_BASE_URL=https://api.river.ai/v1
  RIVER_MODEL=deepseek-ai/DeepSeek-V3
  RIVER_TIMEOUT_MS=60000
  ```
- **Hành động 2:** Khai báo validate schema trong `backend/src/config/env.validation.ts`:
  - `RIVER_API_KEY`: string, optional (`allow('')`).
  - `RIVER_BASE_URL`: string, default `https://api.river.ai/v1`.
  - `RIVER_MODEL`: string, default `deepseek-ai/DeepSeek-V3`.
  - `RIVER_TIMEOUT_MS`: number, default `60000`.

---

### Bước 3: Xây dựng Module & Service River AI (`backend/src/modules/river-ai/`)
Tạo module độc lập tương tự `GeminiModule`:
- `river-ai.interface.ts`: Định nghĩa interface `IRiverAiService`, các kiểu dữ liệu `RiverExecutionResult`, options (temperature, json_object mode).
- `river-ai.service.ts`:
  - Khởi tạo `OpenAI` client:
    ```typescript
    new OpenAI({
      apiKey: this.configService.get<string>('RIVER_API_KEY'),
      baseURL: this.configService.get<string>('RIVER_BASE_URL', 'https://api.river.ai/v1'),
      timeout: this.configService.get<number>('RIVER_TIMEOUT_MS', 60000),
    });
    ```
  - Cung cấp 2 hàm cốt lõi:
    - `generateContent(prompt: string, options)`: Trả về text.
    - `generateJson<T>(prompt: string, options)`: Sử dụng `response_format: { type: 'json_object' }` và parse JSON an toàn.
  - Xử lý lỗi chuẩn HTTP / Domain exception (Auth, RateLimit, ServiceUnavailable).
- `river-ai.module.ts`: Khai báo và export `RiverAiService`.
- Đăng ký `RiverAiModule` vào `AppModule`.

---

### Bước 4: Viết Unit Test Kiểm định (TDD & Mocking)
- **File:** `backend/src/modules/river-ai/tests/river-ai.service.spec.ts`
- **Mục tiêu test:**
  - Mock module `openai` (`chat.completions.create`).
  - Test trường hợp `generateContent` thành công.
  - Test trường hợp `generateJson` parse đúng định dạng schema.
  - Test trường hợp missing API key hoặc timeout.
  - Đảm bảo độ bao phủ test 100% cho service mới theo chuẩn của dự án.

---

### Bước 5: Kiểm tra Toàn diện & Báo cáo
- Chạy linter: `pnpm --filter backend lint`
- Chạy test: `pnpm --filter backend test`
- Đảm bảo hệ thống backend chạy mượt mà, không sinh lỗi.

---

## 3. Danh sách Kiểm định (Verification Checklist)

- [ ] `openai` package có mặt trong `backend/package.json`.
- [ ] `pnpm-lock.yaml` đồng bộ, không có cảnh báo peer dependencies nghiêm trọng.
- [ ] `backend/.env.example` có đủ 4 biến cấu hình của River AI.
- [ ] `env.validation.ts` xác thực hợp lệ các biến môi trường mà không làm crash app khi chưa có key.
- [ ] `RiverAiService` khởi tạo thành công OpenAI client với custom `baseURL`.
- [ ] Toàn bộ unit test mới chạy `PASS`.

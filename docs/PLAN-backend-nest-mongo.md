# PLAN: Khởi Tạo Backend NestJS + MongoDB (Mongoose) Bằng pnpm

> **Mục tiêu:** Khởi tạo khung dự án backend chuẩn NestJS bằng `pnpm`, cài đặt đầy đủ các gói cần thiết để kết nối và làm việc với MongoDB (Mongoose), validation, configuration, CLS context, security và chuẩn bị file `.env.example`.
>
> **Task Slug:** `backend-nest-mongo`
> **Primary Agent:** `backend-specialist`
> **Supporting Agents:** `project-planner`, `security-auditor`

---

## 1. Phân Tích Phạm Vi & Công Nghệ (Scope & Tech Stack)

| Hạng mục | Công nghệ / Thư viện | Mục đích sử dụng |
| :--- | :--- | :--- |
| **Runtime & Framework** | Node.js (v24+) + NestJS 11/12 (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`) | Nền tảng backend chính |
| **Package Manager** | `pnpm` (v11+) | Quản lý gói dependencies tốc độ cao và tiết kiệm dung lượng |
| **Database ODM** | `@nestjs/mongoose`, `mongoose` | Kết nối MongoDB, định nghĩa Schema, Models |
| **Configuration & Env** | `@nestjs/config`, `joi` | Quản lý cấu hình biến môi trường và validate fail-fast khi khởi động |
| **Validation & Transform** | `class-validator`, `class-transformer` | Validate DTO ở boundary và tự động trim whitespace (`@Transform`) |
| **Context & Audit** | `nestjs-cls` (hoặc AsyncLocalStorage native) | Quản lý request context (User ID, Correlation ID) cho `BaseService` và Audit Trail |
| **Security & Auth** | `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`, `@nestjs/throttler` | Mã hóa mật khẩu, JWT token, rate-limiting bảo vệ API |
| **Testing & Tooling** | `jest`, `ts-jest`, `@nestjs/testing`, `eslint`, `prettier` | Kiểm thử unit test (AAA Pattern) và linter chuẩn TypeScript |

---

## 2. Kế Hoạch Triển Khai Từng Bước (Implementation Steps)

### Bước 1: Khởi tạo Project NestJS trong thư mục `backend/`
- Kiểm tra và dọn dẹp file tạm `backend/.gitkeep`.
- Sử dụng Nest CLI thông qua pnpm để khởi tạo khung project sạch sẽ:
  ```powershell
  # Khởi tạo khung NestJS trong backend
  pnpm dlx @nestjs/cli new backend --package-manager pnpm --skip-git --directory ./backend
  ```
  *(Hoặc tạo trực tiếp cấu trúc file chuẩn gồm `package.json`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`, `src/main.ts`, `src/app.module.ts`)*.

### Bước 2: Cài đặt các gói phụ thuộc (Dependencies) bằng `pnpm`

#### A. Database (MongoDB & Mongoose):
```powershell
pnpm --filter backend add @nestjs/mongoose mongoose
```

#### B. Configuration & Validation:
```powershell
pnpm --filter backend add @nestjs/config joi class-validator class-transformer
```

#### C. Request Context & Audit:
```powershell
pnpm --filter backend add nestjs-cls
```

#### D. Security & Auth (Chuẩn bị sẵn cho Auth Feature):
```powershell
pnpm --filter backend add @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt @nestjs/throttler
pnpm --filter backend add -D @types/passport-jwt @types/bcrypt
```

#### E. Dev Dependencies & Typing:
```powershell
pnpm --filter backend add -D @types/node @types/express typescript ts-node @nestjs/cli @nestjs/schematics @nestjs/testing
```

---

### Bước 3: Thiết lập Cấu hình Môi Trường (`.env.example` & `.env`)
Tạo file `backend/.env.example` với đầy đủ các tham số cấu hình:
```env
# Server Configuration
PORT=8000
NODE_ENV=development
APP_NAME=THC_DATN_API
API_PREFIX=api/v1

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/thc_datn
MONGODB_DB_NAME=thc_datn

# JWT Authentication
JWT_SECRET=replace_with_a_very_long_secure_secret_key_at_least_32_characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=replace_with_another_very_long_secure_refresh_secret_key
JWT_REFRESH_EXPIRES_IN=7d

# CORS & Security
CORS_ORIGIN=http://localhost:3000
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

Tạo file `backend/.env` (sao chép từ `.env.example`) để phục vụ chạy dev local.

---

### Bước 4: Cấu hình `AppModule` kết nối MongoDB & Global Pipes

1. **ConfigModule Validation (`backend/src/app.module.ts`)**:
   - Khởi tạo `ConfigModule.forRoot` kèm validation schema bằng `joi` (bắt buộc có `MONGODB_URI`, `PORT`, `JWT_SECRET`).
   - Tích hợp `MongooseModule.forRootAsync` đọc connection string từ `ConfigService`.
   - Đăng ký `ClsModule.forRoot` cho request context tracking.
2. **Global Validation Pipe & Trimming (`backend/src/main.ts`)**:
   - Cấu hình `ValidationPipe` với `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.
   - Cấu hình API Prefix (`/api/v1`).
   - Cấu hình CORS và Port từ `ConfigService`.

---

## 3. Danh Sách Tệp Dự Kiến Tạo Mới / Thay Đổi

```plaintext
backend/
├── .env.example                               # File mẫu biến môi trường
├── .env                                       # File biến môi trường local (dev)
├── package.json                               # Dependencies & scripts
├── pnpm-lock.yaml                             # Khóa phiên bản gói
├── tsconfig.json                              # Cấu hình TypeScript (strict: true, noAny)
├── tsconfig.build.json                        # Cấu hình build NestJS
├── nest-cli.json                              # Cấu hình Nest CLI
└── src/
    ├── main.ts                                # Bootstrap server, pipes, prefix, CORS
    ├── app.module.ts                          # Module gốc: ConfigModule, MongooseModule, ClsModule
    ├── app.controller.ts                      # Health-check endpoint
    ├── app.service.ts                         # Health-check logic
    └── config/
        └── env.validation.ts                  # Joi schema validate biến môi trường
```

---

## 4. Verification Checklist (Kế Hoạch Kiểm Tra)

- [ ] **Dependency Check**: Chạy `pnpm list` trong `backend/` đảm bảo tất cả các gói cài đặt thành công, không có xung đột peer-dependencies.
- [ ] **Build Check**: Chạy `pnpm --filter backend run build` hoặc `pnpm run build` trong `backend/` compile TypeScript thành công 0 lỗi.
- [ ] **Typecheck / Strict Typing**: Đảm bảo cấu hình `tsconfig.json` tuân thủ nghiêm ngặt Zero-`any` (`noImplicitAny: true`).
- [ ] **Startup & Health Check**: Chạy `pnpm run start:dev`, kiểm tra log NestJS khởi động sạch sẽ và kết nối MongoDB thành công.
- [ ] **Git Tracking**: File `.env` được đưa vào `.gitignore`, chỉ commit `.env.example`.

# PLAN: Thiết Kế & Triển Khai Seed Data Cho User Module (Hỗ Trợ Đủ Roles, 1 Lệnh pnpm)

> **Mục tiêu:**
> 1. Xây dựng cơ chế Seeder chuyên biệt, chuẩn hóa, tách biệt theo từng domain module trong NestJS.
> 2. Cung cấp dữ liệu khởi tạo (Seed Data) cho `User` với đầy đủ các role trong hệ thống: `admin`, `instructor`, `student`.
> 3. Hỗ trợ chạy toàn bộ quy trình seeding chỉ với **1 lệnh duy nhất** từ thư mục gốc monorepo (`pnpm seed`) hoặc trong backend (`pnpm --filter backend seed`).
> 4. Đảm bảo tính **Idempotent** (chạy nhiều lần không trùng lặp, không gây lỗi duplicate key), mật khẩu được hash bằng `bcrypt` an toàn.
> 5. Tuân thủ tuyệt đối **Project Architectural Rules**: Sử dụng `UserRepository` (Repository Pattern), không inject model trực tiếp, không dùng `any`, có unit test đầy đủ.
>
> **Task Slug:** `user-seed`  
> **Primary Agent:** `project-planner`  
> **Supporting Agents:** `backend-specialist`, `database-architect`, `security-auditor`  

---

## 1. Phân Tích Hiện Trạng & Yêu Cầu Kỹ Thuật

### 1.1. Hệ Thống Role & Trạng Thái Hiện Tại
Trong `share-lib/src/enums/role.enum.ts` và `user-status.enum.ts`:
- **RoleEnum**:
  - `ADMIN`: `'admin'` (Quản trị viên hệ thống)
  - `INSTRUCTOR`: `'instructor'` (Giảng viên tạo khóa học/nội dung)
  - `STUDENT`: `'student'` (Học viên tham gia học tập)
- **UserStatusEnum**:
  - `ACTIVE`: `'active'` (Tài khoản đang hoạt động bình thường)

### 1.2. Danh Sách Dữ Liệu Khởi Tạo Chuẩn (Seed Users Matrix)

| Role | Email | Mật khẩu mặc định | Họ và tên (`fullName`) | Username | Trạng thái | Ghi chú Profile (`bio`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@thc.edu.vn` | `Admin@123456` | `Quản Trị Viên Hệ Thống` | `admin` | `active` | Quản trị viên cấp cao của nền tảng |
| **INSTRUCTOR** | `instructor@thc.edu.vn` | `Instructor@123456` | `ThS. Nguyễn Văn Giảng Viên` | `instructor` | `active` | Giảng viên chuyên ngành Công Nghệ Phần Mềm & AI |
| **STUDENT** | `student@thc.edu.vn` | `Student@123456` | `Trần Học Viên` | `student` | `active` | Học viên tiêu biểu tham gia các khóa học tương tác |

*(Có thể bổ sung thêm 1 tài khoản giảng viên thứ 2 và 1 học viên thứ 2 để phục vụ kiểm thử phân trang và quan hệ khóa học).*

### 1.3. Cơ Chế Thực Thi: Standalone NestJS ApplicationContext
- Không khởi chạy HTTP server Express/Fastify (không cần bind port `3001`).
- Sử dụng `NestFactory.createApplicationContext(SeedModule)`:
  - Tự động nạp cấu hình `.env` thông qua `ConfigModule` và `envValidationSchema`.
  - Tự động kết nối MongoDB thông qua `MongooseModule`.
  - Khởi tạo đầy đủ DI Container, inject `UserRepository` với cấu trúc Repository chuẩn.
  - Tự động đóng kết nối cơ sở dữ liệu (`app.close()`) sau khi hoàn thành hoặc khi gặp lỗi.
- Trình thông dịch: Cài đặt và sử dụng `tsx` (TypeScript Execute ESM) trong `devDependencies` của `backend` để chạy trực tiếp file TypeScript dạng ESM (`"type": "module"`) với hiệu năng tức thì mà không cần qua bước `nest build`.

---

## 2. Thiết Kế Kiến Trúc & Cấu Trúc Module Tách Biệt

Nhằm tuân thủ nguyên tắc mở rộng (sau này có thêm seed cho Course, Category, Section...), cấu trúc được tổ chức theo 2 tầng:

```
backend/
├── src/
│   ├── modules/
│   │   └── user/
│   │       ├── seeds/
│   │       │   ├── user.seed.data.ts       # Định nghĩa mảng dữ liệu seed thuần túy (Raw Data)
│   │       │   └── user.seeder.ts          # Service thực thi logic seed cho User (kiểm tra tồn tại, hash password, lưu qua UserRepository)
│   │       ├── tests/
│   │       │   └── user.seeder.spec.ts     # Unit test cho UserSeeder (mock UserRepository & bcrypt)
│   │       └── user.module.ts              # Export UserSeeder để SeedModule sử dụng
│   └── database/
│       └── seeds/
│           ├── seeder.interface.ts         # Interface ISeeder { run(): Promise<void> }
│           ├── seed.module.ts              # Module tổng hợp các seeders (ConfigModule, MongooseModule, UserModule, etc.)
│           └── seed.ts                     # CLI Entrypoint script
├── package.json                            # Thêm script: "seed": "tsx src/database/seeds/seed.ts"
package.json (Root Monorepo)                # Thêm script: "seed": "pnpm --filter backend seed"
```

### 2.1. Hợp Đồng Giao Tiếp & Idempotency
- **Interface Seeder**:
  ```typescript
  export interface ISeeder {
    run(): Promise<void>;
  }
  ```
- **Idempotency Logic**:
  - Trước khi insert, kiểm tra `userRepository.findByEmail(item.email)`.
  - Nếu đã tồn tại: ghi log cảnh báo bỏ qua (`[SKIP] User with email ${email} already exists`).
  - Nếu chưa tồn tại: hash mật khẩu với `bcrypt.hash(item.password, 10)`, sau đó gọi `userRepository.create(...)`.
  - Toàn bộ thao tác không bao giờ sinh duplicate email hoặc làm hỏng dữ liệu đang có.

---

## 3. Phân Công Tác Vụ Chi Tiết (Task Breakdown)

| Task ID | Nhiệm Vụ | Phụ Trách | Skill | Input → Output → Verification |
| :--- | :--- | :--- | :--- | :--- |
| **TASK-01** | Cấu hình scripts & dependencies cho Seeder | `backend-specialist` | `clean-code` | **IN**: `package.json` (backend & root)<br>**OUT**: Thêm `tsx` vào devDependencies, script `"seed"` ở root và backend<br>**VERIFY**: Chạy thử `pnpm seed --help` hoặc script test thành công |
| **TASK-02** | Xây dựng Data Dictionary & `user.seed.data.ts` | `database-architect` | `database-design` | **IN**: Đặc tả dữ liệu cho các role (`admin`, `instructor`, `student`)<br>**OUT**: `backend/src/modules/user/seeds/user.seed.data.ts`<br>**VERIFY**: Khớp 100% schema validation & typing |
| **TASK-03** | Xây dựng `UserSeeder` service | `backend-specialist` | `clean-code` | **IN**: `UserRepository`, `user.seed.data.ts`, `bcrypt`<br>**OUT**: `backend/src/modules/user/seeds/user.seeder.ts`<br>**VERIFY**: Type check không lỗi, tuân thủ Repository Pattern |
| **TASK-04** | Xây dựng `SeedModule` & Entrypoint `seed.ts` | `backend-specialist` | `nodejs-best-practices` | **IN**: `NestFactory.createApplicationContext`, `SeedModule`<br>**OUT**: `src/database/seeds/seed.module.ts` & `src/database/seeds/seed.ts`<br>**VERIFY**: Khởi tạo context và đóng gracefully |
| **TASK-05** | Viết Unit Test cho `UserSeeder` | `backend-specialist` | `testing-patterns` | **IN**: Kịch bản seed mới & kịch bản user đã tồn tại (idempotent)<br>**OUT**: `src/modules/user/tests/user.seeder.spec.ts`<br>**VERIFY**: `pnpm --filter backend test` 100% PASS |
| **TASK-06** | Thử nghiệm thực tế lệnh `pnpm seed` | `backend-specialist` | `database-design` | **IN**: Kết nối DB MongoDB Local / Docker<br>**OUT**: Tạo thành công các tài khoản, chạy lần 2 log [SKIP]<br>**VERIFY**: 1 lệnh `pnpm seed` duy nhất chạy thông suốt |
| **TASK-07** | Cập nhật tài liệu Living Docs & Dev History | `project-planner` | `documentation-templates` | **IN**: Kết quả triển khai<br>**OUT**: Cập nhật `a-agentic/features/auth-identity/dev-history.md`<br>**VERIFY**: Tài liệu phản ánh chính xác cấu trúc và hướng dẫn chạy |

---

## 4. Giai Đoạn Kiểm Thử & Nghiệm Thu (Phase X)

- [x] Cấu hình scripts trong root `package.json` và `backend/package.json` sử dụng Nest CLI standalone entrypoint (`nest start --entryFile database/seeds/seed`).
- [x] Type Check Backend: `pnpm --filter backend exec oxlint` (0 errors, 0 warnings) & `npx tsc --noEmit` pass 100%.
- [x] Chạy Unit Test Suite: `pnpm --filter backend test` (Toàn bộ 32 test suites / 386 tests pass 100%, bao gồm cả `user.seeder.spec.ts`).
- [x] Chạy lần 1: `pnpm seed` từ thư mục gốc -> Tạo mới thành công 7 tài khoản (1 admin, 3 instructors, 3 students) với mật khẩu `Password123@`.
- [x] Chạy lần 2: `pnpm seed` từ thư mục gốc -> Toàn bộ 7 tài khoản hiển thị log bỏ qua an toàn (`[SKIP]`, Idempotent), không có lỗi MongoDB duplicate key.
- [x] Chạy cờ refresh: `pnpm seed:refresh` từ thư mục gốc -> Cập nhật thành công 7 tài khoản (`7 refreshed`), reset mật khẩu về `Password123@`.

## ✅ PHASE X COMPLETE
- Lint & Type Check: ✅ Pass (0 errors, 0 warnings)
- Vitest Suite: ✅ 386/386 Pass (32 files)
- Seeder Run & Idempotency: ✅ Pass (100% idempotent & hỗ trợ cờ --refresh)
- Date: 2026-10-07

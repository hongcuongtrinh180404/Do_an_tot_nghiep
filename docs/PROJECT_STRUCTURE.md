# 🏗️ TÀI LIỆU CẤU TRÚC VÀ KIẾN TRÚC DỰ ÁN (PROJECT STRUCTURE & ARCHITECTURE)

> **Dự án**: Hệ Thống Quản Lý Đồ Án Tốt Nghiệp (DATN Portal)  
> **Mô hình**: Monorepo chuẩn doanh nghiệp (Enterprise Architecture)  
> **Quản lý Monorepo**: Turborepo + pnpm workspaces

---

## 🌳 1. Tổng quan sơ đồ cây thư mục

```
Do_an_tot_nghiep/
├── 📁 .agent/                         # Bộ quy chuẩn, nhân bản AI Agent & Rules
│   └── 📁 rules/                      # Quy tắc dự án (project-architecture.md, GEMINI.md)
├── 📁 a-agentic/                      # Living Docs theo dõi tiến độ & context kỹ thuật
├── 📁 docs/                           # Thư mục tài liệu kỹ thuật & quy hoạch dự án
│   ├── 📄 GETTING_STARTED.md          # Hướng dẫn cài đặt và chạy trên máy cá nhân
│   ├── 📄 PROJECT_STRUCTURE.md        # Tài liệu cấu trúc & kiến trúc này
│   └── 📄 PLAN-*.md                   # Các bản kế hoạch kiến trúc chi tiết
│
├── 📦 share-lib/                      # [Package] Thư viện kiểu dữ liệu dùng chung (FE & BE)
│   ├── 📁 src/
│   │   ├── 📁 constants/              # Hằng số toàn hệ thống
│   │   ├── 📁 enums/                  # UserRole, AuthProvider, AuthStatus,...
│   │   ├── 📁 interfaces/             # IUser, ApiResponse, AuthTokens,...
│   │   └── 📄 index.ts                # Entrypoint xuất bản kiểu
│   ├── 📄 package.json
│   └── 📄 tsconfig.json
│
├── ⚙️ backend/                        # [App] REST API Service (NestJS + MongoDB)
│   ├── 📁 src/
│   │   ├── 📁 common/                 # Decorators, Filters, Guards, Interceptors toàn cục
│   │   ├── 📁 config/                 # Cấu hình môi trường (@nestjs/config)
│   │   ├── 📁 modules/
│   │   │   ├── 📁 base/               # [CORE] Base Abstract Document, Repository & Service
│   │   │   ├── 📁 auth/               # Module xác thực JWT & Session Security
│   │   │   │   ├── 📁 controllers/    # Route handlers (/api/v1/auth)
│   │   │   │   ├── 📁 dto/            # Request DTOs (Validation + Trim)
│   │   │   │   ├── 📁 services/       # Nghiệp vụ xác thực
│   │   │   │   ├── 📁 strategies/     # Passport JWT Strategy
│   │   │   │   ├── 📁 schemas/        # Session Mongoose Schema
│   │   │   │   └── 📁 tests/          # Unit tests (AAA Pattern)
│   │   │   └── 📁 user/               # Module quản lý người dùng
│   │   ├── 📄 app.module.ts           # Root Module
│   │   └── 📄 main.ts                 # Bootstrap server (Port 8000)
│   ├── 📄 package.json
│   └── 📄 tsconfig.json
│
├── 💻 frontend/                       # [App] Web Client Portal (Next.js 16 App Router)
│   ├── 📁 src/
│   │   ├── 📁 app/                    # Next.js App Router (Layouts & Pages)
│   │   │   ├── 📁 (auth)/             # Route group: Giao diện Đăng nhập / Đăng ký
│   │   │   ├── 📁 (sites)/            # Route group: Cổng thông tin công khai
│   │   │   ├── 📁 (admin)/            # Route group: Trang quản trị Hội đồng / Admin
│   │   │   ├── 📄 globals.css         # CSS gốc, thiết lập biến theme và Font Roboto
│   │   │   ├── 📄 layout.tsx          # Root Layout (Google Font Roboto, AppProviders)
│   │   │   └── 📄 page.tsx            # Trang chủ hệ thống
│   │   ├── 📁 components/             # Reusable UI Components
│   │   │   └── 📁 ui/                 # Shadcn UI (button, card, dialog, input, icon,...)
│   │   ├── 📁 features/               # [FEATURE-DRIVEN] Đóng gói theo từng tính năng
│   │   │   └── 📁 auth/               # Feature Auth (api, components, hooks, schemas, types)
│   │   ├── 📁 lib/                    # Axios client, utils cấu hình
│   │   └── 📁 providers/              # TanStack Query Provider, Toaster, Nuqs
│   ├── 📄 components.json             # Shadcn config (iconLibrary: "iconify")
│   ├── 📄 package.json
│   └── 📄 tsconfig.json
│
├── 📜 package.json                    # Root manifest quản lý Turborepo scripts
├── ⚡ turbo.json                      # Turborepo Pipeline & TUI Sidebar log configuration
└── 🌿 pnpm-workspace.yaml             # Cấu hình workspace Monorepo
```

---

## ⚙️ 2. Kiến trúc Backend (NestJS + MongoDB Layered Pattern)

Tầng Backend tuân thủ nghiêm ngặt mô hình **Clean Architecture & Repository Pattern** để đảm bảo tính module hóa, dễ dàng mở rộng và phục vụ viết Unit Test độc lập.

```
       [ Client Request ]
               │
               ▼
      [ AuthController ]           <-- Tiếp nhận HTTP Request
               │
               ▼ (DTO Validation & Trimming)
        [ AuthService ]            <-- Kế thừa BaseService (CLS Context, Logging, Audit)
               │
               ▼ (DI qua Interface BaseRepository)
    [ UserRepository / Mongo ]     <-- Tầng trừu tượng DB, kế thừa BaseMongoRepository
               │
               ▼
     [ MongoDB Collection ]        <-- Lưu trữ tài liệu (Kế thừa BaseAbstractDocument)
```

### 2.1. Module Nền tảng (`modules/base/`)

Mọi thực thể (Entity), Kho lưu trữ (Repository) và Dịch vụ (Service) mới đều **bắt buộc kế thừa từ bộ khung Base này**:

1. **`BaseAbstractDocument` (`base.document.ts`)**:
   * Tất cả schema Mongoose đều kế thừa class này.
   * Tự động bổ sung các trường:
     * `createdAt`, `updatedAt`: Thời gian tạo/sửa.
     * `deletedAt`: Phục vụ cơ chế **Soft Delete** (xóa mềm).
     * `createdById`, `updatedById`: ID của người dùng thực hiện thao tác (lấy tự động từ CLS Context).

2. **`BaseRepository<T, ID>` (`base.repository.interface.ts` & `base.mongo.repository.ts`)**:
   * ❌ **CẤM:** Không được inject trực tiếp `@InjectModel(...)` vào Service hoặc viết câu lệnh truy vấn MongoDB trực tiếp trong Service.
   * ✅ **BẮT BUỘC:** Mọi thao tác với Database phải thông qua Repository kế thừa `BaseMongoRepository`.
   * Cung cấp sẵn các hàm chuẩn: `create()`, `findById()`, `findOne()`, `find()`, `updateById()`, `softDeleteById()`, `restoreById()`, `paginate()`.

3. **`BaseService` (`base.service.ts`)**:
   * Cung cấp ngữ cảnh thực thi tự động (Correlation ID, Audit User Context từ `nestjs-cls`).
   * Tích hợp sẵn logger chuẩn doanh nghiệp.

4. **Chuẩn hóa phản hồi (`ApiResponse<T>`)**:
   * Mọi API endpoint đều được bọc tự động qua `TransformInterceptor` trả về envelope đồng nhất:
     ```json
     {
       "statusCode": 200,
       "message": "Thành công",
       "data": { ... },
       "meta": { "timestamp": "..." }
     }
     ```

### 2.2. Module Xác thực (`modules/auth/`)
* **Bảo mật đa tầng**:
  * Access Token (JWT): Hạn ngắn (15 phút), chứa `sub`, `email`, `role`, `sessionId`.
  * Refresh Token (JWT): Hạn dài (7 ngày), lưu trữ trong HttpOnly Cookie hoặc header bảo mật.
* **Session Grace Period (30 giây)**:
  * Khi mở nhiều tab hoặc F5 đồng thời, các tab gửi cùng một refresh token cũ trong vòng 30 giây sẽ không bị coi là tấn công token reuse và không bị đăng xuất đột ngột.
* **Quy chuẩn kiểm thử**:
  * 100% Service nghiệp vụ có file test `tests/auth.service.spec.ts` tương ứng theo mô hình AAA (Arrange-Act-Assert) và mock Abstract Repository hoàn toàn.

---

## 💻 3. Kiến trúc Frontend (Next.js 16 App Router + Feature-Driven)

Frontend được tổ chức theo triết lý **Feature-Driven Design** — gom toàn bộ logic, giao diện và kiểu dữ liệu của một chức năng vào một thư mục riêng, giúp việc bảo trì và mở rộng sau này không bị phân mảnh.

### 3.1. Phân chia Route Groups (`src/app/`)

Sử dụng tính năng Route Groups của Next.js (thư mục trong ngoặc tròn) để áp dụng các Layout khác nhau mà không làm thay đổi đường dẫn URL:

* **`(auth)`**: Dành cho các trang xác thực (`/login`, `/register`). Layout chia 2 cột:
  * Bên trái: Branding Panel hiển thị thông tin giới thiệu, gradient chuyên nghiệp.
  * Bên phải: Form đăng nhập/đăng ký căn giữa, tối ưu trên cả desktop lẫn mobile.
* **`(sites)`**: Cổng thông tin dành cho sinh viên và giảng viên xem đề tài, lịch bảo vệ.
* **`(admin)`**: Bảng điều khiển dành cho Ban Chủ Nhiệm khoa, Hội đồng chấm điểm và Quản trị viên.

### 3.2. Cấu trúc một Feature (`src/features/{feature-name}/`)

Ví dụ với `features/auth/`:
```
features/auth/
├── 📁 api/               # TanStack Query custom hooks (useLoginMutation, useRegisterMutation,...)
├── 📁 components/        # Các UI Components riêng biệt:
│   ├── auth-card-wrapper.tsx   # Card bọc form đăng nhập/đăng ký
│   ├── login-form.tsx          # Form đăng nhập
│   ├── register-form.tsx       # Form đăng ký (có thanh đo độ mạnh mật khẩu)
│   └── password-input.tsx      # Ô nhập mật khẩu có nút ẩn/hiển thị
├── 📁 hooks/             # Client Hooks (useAuth,...)
├── 📁 schemas/           # Schema xác thực Zod (loginSchema, registerSchema)
├── 📁 types/             # Types nội bộ của Feature
└── 📄 index.ts           # Barrel file export các thành phần công khai
```

### 3.3. Quy chuẩn Font chữ & Icon

* **Font Roboto**:
  * Sử dụng font **Roboto** từ `next/font/google` hỗ trợ đầy đủ `latin` và `vietnamese`.
  * Khai báo tập trung qua CSS variables (`--font-roboto`) trong [`layout.tsx`](file:///d:/TrinhHongCuong/thc-datn/Do_an_tot_nghiep/frontend/src/app/layout.tsx) và kích hoạt trong `@layer base` của [`globals.css`](file:///d:/TrinhHongCuong/thc-datn/Do_an_tot_nghiep/frontend/src/app/globals.css).
  * ❌ **CẤM:** Không được hardcode inline font classes (như `font-sans`, `font-serif`) trong các component.
* **Thuần Iconify (`@iconify/react`)**:
  * Dự án sử dụng duy nhất thư viện Iconify qua component dùng chung:
    ```tsx
    import { Icon } from '@/components/ui/icon';
    <Icon icon="lucide:user" className="size-4" />
    ```
  * ❌ **CẤM:** Không cài đặt hoặc import các thư viện icon riêng rẽ khác (`lucide-react`, `react-icons`,...); mọi icon đều lấy từ kho dữ liệu phong phú của Iconify.

---

## 📦 4. Thư viện dùng chung (`share-lib/`)

`share-lib` là trung tâm đảm bảo **Single Source of Truth** (Nguồn chân lý duy nhất) giữa Client và Server:

```
share-lib/src/
├── enums/
│   ├── role.enum.ts          # ADMIN, TEACHER, STUDENT
│   ├── auth-provider.enum.ts # LOCAL, GOOGLE, MICROSOFT,...
│   └── auth-status.enum.ts   # ACTIVE, INACTIVE, SUSPENDED,...
├── interfaces/
│   ├── user.interface.ts     # IUser contract
│   ├── auth.interface.ts     # ILoginResponse, ITokens,...
│   └── response.interface.ts # IApiResponse<T>
└── index.ts                  # Barrel export
```

* Khi Backend hoặc Frontend cần kiểu dữ liệu người dùng, chỉ cần:
  ```ts
  import { UserRole, IUser } from 'share-lib';
  ```
* Bất kỳ thay đổi nào về Enums hay DTO tại đây sẽ lập tức báo lỗi biên dịch ở cả Backend lẫn Frontend nếu có sai lệch, ngăn ngừa 100% lỗi lệch contract giữa 2 đầu.

---

## 📏 5. Quy tắc cốt lõi dành cho Developer (Development Rules)

Khi tham gia phát triển dự án, bắt buộc tuân theo các nguyên tắc sau:

1. **Tuyệt đối không dùng kiểu `any` trong TypeScript**:
   * Phải định nghĩa đầy đủ interface, generic type hoặc `unknown` kèm type-guard.
2. **Trim & Normalize toàn bộ chuỗi đầu vào**:
   * Backend: Sử dụng `@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)`.
   * Frontend: Tự động `.trim()` trước khi gửi form qua Zod schema.
3. **Tuân thủ luồng dữ liệu Repository Pattern**:
   * Không bao giờ viết câu lệnh MongoDB thô trong tầng Service. Luôn thông qua Abstract Domain Repository.
4. **Viết Unit Test cho mọi Service mới**:
   * Sử dụng Vitest đặt trong thư mục `tests/` cùng module.
   * Mock toàn bộ repository dependencies.

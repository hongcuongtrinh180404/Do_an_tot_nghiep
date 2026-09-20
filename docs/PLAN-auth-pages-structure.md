# PLAN: Thiết Kế Chuẩn Hóa Feature Structure & Mẫu Trang Đăng Ký / Đăng Nhập Frontend

> **Mục tiêu:**
> 1. Xây dựng **quy chuẩn cấu trúc thư mục (Feature-Driven Architecture)** kiểu mẫu tại `frontend/src/features/auth/` với sự phân tách tuyệt đối giữa **Route Layer (App Router)** và **Feature Layer (Business Logic & UI)**, làm khuôn mẫu chuẩn để toàn bộ các module nghiệp vụ sau này (Users, Topics, Councils, Defenses...) tuân theo.
> 2. Triển khai hoàn chỉnh 2 trang mẫu:
>    - **Trang Đăng Nhập (`/login`)**: Email, Password, hiển thị/ẩn mật khẩu, ghi nhớ phiên, loading skeleton, validation Zod (tự động trim whitespace), toast notification.
>    - **Trang Đăng Ký (`/register`)**: Email, Password, Confirm Password, Họ và Tên, validate khớp mật khẩu, điều hướng tự động sau đăng ký.
> 3. Thiết kế **Auth Layout** chuyên dụng (branding đồ án tốt nghiệp, glassmorphism, responsive mobile-first, thẩm mỹ cao không dùng màu tím).
> 4. Làm rõ cấu trúc định tuyến giữa Dynamic Segment `[sites]` vs Route Group `(sites)` trong App Router.
>
> **Task Slug:** `auth-pages-structure`
> **Primary Agent:** `project-planner`
> **Supporting Agents:** `frontend-specialist`, `backend-specialist`

---

## 1. Điểm Cần Làm Rõ (Socratic Gate: `[sites]` vs `(sites)`)

Trong thư mục `frontend/src/app/`, hiện đang có 2 thư mục: `[admin]` và `[sites]`.
Cần xác định chính xác mục đích định tuyến:

- **Trường hợp 1 (Route Groups - Khuyên dùng)**: Đổi tên thành `(sites)` và `(admin)` (dấu ngoặc đơn):
  - **Mục đích**: Nhóm các route có chung Layout mà **không làm thay đổi đường dẫn URL**.
  - URL trang đăng nhập sẽ là: `/login` và `/register`.
  - URL portal người dùng: `/dashboard`, `/topics`, v.v.
  - URL admin: `/admin/users`, `/admin/councils`, v.v.
  - Người dùng truy cập ngắn gọn, chuẩn SEO và dễ nhớ.

- **Trường hợp 2 (Dynamic Segments)**: Giữ nguyên `[sites]` và `[admin]` (dấu ngoặc vuông):
  - **Mục đích**: Nhận tham số động `params.sites` (ví dụ multi-tenant theo khoa: `/cntt/login`, `/ktmt/login`).
  - Nếu không có tham số động, dấu ngoặc vuông sẽ bắt buộc URL phải có tiền tố `/:sites/login`.

> **Đề xuất khuyến nghị:** Sử dụng Route Groups `(auth)` hoặc `(sites)` để giữ URL sạch đẹp (`/login`, `/register`).

---

## 2. Kiến Trúc Feature Chuẩn Mẫu (Feature-Driven Structure Pattern)

Để tất cả các module sau này (Người dùng, Đề tài, Hội đồng...) có cấu trúc đồng nhất, mỗi feature sẽ tuân theo cấu trúc module tự khép kín (Self-Contained Module):

```
frontend/src/
├── app/                                 # THIN ROUTE LAYER (Chỉ chứa page shells & layouts)
│   ├── (auth)/                          # Route group dành cho xác thực (URL sạch: /login, /register)
│   │   ├── layout.tsx                   # Auth Layout thẩm mỹ cao (Brand panel + Form container)
│   │   ├── login/
│   │   │   └── page.tsx                 # Thin Server Component (Metadata, Server prefetch nếu cần)
│   │   └── register/
│   │       └── page.tsx                 # Thin Server Component
│   ├── (sites)/                         # Route group dành cho portal giảng viên / sinh viên
│   └── (admin)/                         # Route group dành cho trang quản trị hệ thống
│
└── features/auth/                       # RICH FEATURE LAYER (Toàn bộ logic nghiệp vụ)
    ├── api/                             # Data Access & TanStack Query Hooks
    │   ├── auth.api.ts                  # Axios API calls
    │   └── use-auth-mutations.ts        # useLoginMutation, useRegisterMutation, useLogoutMutation
    ├── components/                      # UI Components độc lập
    │   ├── auth-card-wrapper.tsx        # Khung card bọc form (Logo, Title, Footer link)
    │   ├── login-form.tsx               # Client component form đăng nhập
    │   ├── register-form.tsx            # Client component form đăng ký
    │   └── password-input.tsx           # Input mật khẩu có nút Toggle Ẩn/Hiện
    ├── hooks/                           # Custom Business Logic Hooks
    │   ├── use-auth.ts                  # Lấy user profile, role, isAuthenticated
    │   └── use-auth-redirect.ts         # Tự động chuyển trang khi đã đăng nhập
    ├── schemas/                         # Zod Validation Schemas
    │   ├── login.schema.ts              # Trim whitespace, email, min password
    │   └── register.schema.ts           # Password match confirm, name validation
    ├── types/                           # Feature Types (Kế thừa & mở rộng từ share-lib)
    │   └── index.ts
    └── index.ts                         # Public Barrel Export (chỉ export những gì cần dùng ngoài feature)
```

---

## 3. Chi Tiết Thiết Kế Các Thành Phần

### A. Route Layer (App Router)
- `src/app/(auth)/layout.tsx`:
  - Split-screen layout (trên desktop: bên trái là Hero banner giới thiệu Đồ án tốt nghiệp / Trường, bên phải là Form xác thực).
  - Tự động responsive về single-column trên thiết bị mobile.
  - Phối màu Dark/Light hài hòa theo HSL CSS variables, cấm màu tím/violet (`Purple Ban`), typography sắc nét.
- `src/app/(auth)/login/page.tsx`:
  - Khai báo SEO Metadata: `title: "Đăng nhập | Cổng Quản Lý Đồ Án Tốt Nghiệp"`.
  - Import và render `<LoginForm />` từ `@/features/auth`.
- `src/app/(auth)/register/page.tsx`:
  - Khai báo SEO Metadata: `title: "Đăng ký tài khoản | Cổng Quản Lý Đồ Án Tốt Nghiệp"`.
  - Import và render `<RegisterForm />` từ `@/features/auth`.

### B. Schemas & Data Normalization (`features/auth/schemas/`)
Tuân thủ nghiêm ngặt **Quy tắc 3**: Tự động trim khoảng trắng và từ chối chuỗi chỉ chứa dấu cách:
- `login.schema.ts`:
  - `email`: `.transform(v => v.trim()).pipe(z.string().min(1, 'Email không được để trống').email('Email không hợp lệ'))`
  - `password`: `.transform(v => v.trim()).pipe(z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'))`
- `register.schema.ts`:
  - `firstName`, `lastName`: Trim khoảng trắng, bắt buộc có ít nhất 1 ký tự.
  - `email`: Validate định dạng email.
  - `password`: Tối thiểu 6 ký tự.
  - `confirmPassword`: Phải khớp với `password` (`refine((data) => data.password === data.confirmPassword)`).

### C. UI Components & UX Polish (`features/auth/components/`)
1. **`PasswordInput`**: Component bọc `Input` của Shadcn UI, tích hợp icon Eye / EyeOff cho phép ẩn/hiện mật khẩu.
2. **`LoginForm`**:
   - Sử dụng `react-hook-form` + `zodResolver(loginSchema)`.
   - Các trường Email, Password.
   - Nút "Quên mật khẩu?" và liên kết chuyển nhanh tới trang Đăng ký.
   - Trạng thái loading spinner trên nút Submit (`isPending`).
3. **`RegisterForm`**:
   - Các trường Họ và Tên đệm, Tên, Email, Mật khẩu, Xác nhận mật khẩu.
   - Kiểm tra realtime xác nhận mật khẩu.
   - Nút Submit với loading state và liên kết quay lại trang Đăng nhập.

---

## 4. Kế Hoạch Kiểm Thử & Xác Nhận (Verification Plan)

1. **Kiểm Tra Build & Type Checking**:
   - Chạy `pnpm run build` ở thư mục gốc: Compile thành công cả 3 gói `share-lib`, `backend`, `frontend` với 0 lỗi.
   - Kiểm tra nghiêm ngặt không có bất kỳ type `any` nào trong TypeScript.
2. **Kiểm Tra Linting**:
   - Chạy `pnpm --filter frontend lint`: 0 errors, 0 warnings.
3. **Kiểm Thử Trực Quan (Visual & Functional UI)**:
   - Truy cập `/login`: Form hiển thị sắc nét, thử submit chuỗi khoảng trắng -> báo lỗi validation tiếng Việt chuẩn xác.
   - Đăng nhập thử với tài khoản Backend: Báo toast thành công và lưu access token / refresh token.
   - Truy cập `/register`: Thử đăng ký tài khoản mới -> Backend lưu người dùng mới với Role `USER`.
   - Nút Toggle ẩn/hiện mật khẩu hoạt động trơn tru.
   - Responsive hoàn hảo trên cả giao diện Mobile và Desktop.

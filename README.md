# 🎓 DATN PORTAL — HỆ THỐNG QUẢN LÝ ĐỒ ÁN TỐT NGHIỆP

> **Monorepo Kiến Trúc Doanh Nghiệp** kết hợp giữa **NestJS (Backend)**, **Next.js App Router (Frontend)** và **Share-Lib (Shared Contracts)**, vận hành mượt mà với **Turborepo** và **pnpm workspaces**.

---

## 📑 Mục lục tài liệu

| Tài liệu | Mô tả |
| :--- | :--- |
| 🚀 **[Hướng dẫn triển khai Local (Getting Started)](./docs/GETTING_STARTED.md)** | Hướng dẫn chi tiết cài đặt môi trường, biến môi trường `.env`, chạy MongoDB và khởi động toàn bộ dự án từ A-Z |
| 🏗️ **[Cấu trúc & Kiến trúc dự án (Project Structure)](./docs/PROJECT_STRUCTURE.md)** | Phân tích chi tiết kiến trúc Monorepo, Base Module (Backend), Feature-Driven Design (Frontend), Share-Lib |
| 📐 **[Quy chuẩn kiến trúc hệ thống (Rule Guide)](./.agent/rules/project-architecture.md)** | Các nguyên tắc bắt buộc: Clean Code, Repository Pattern, No `any`, Strict Typing, Iconify, Roboto Font |

---

## 🏛️ Sơ đồ Kiến trúc Monorepo

```
Do_an_tot_nghiep/ (Root)
├── 📦 share-lib/            --> Thư viện dùng chung (Types, Enums, DTOs, Constants)
├── ⚙️ backend/              --> REST API Server (NestJS 11, Mongoose, MongoDB, CLS Context)
├── 💻 frontend/             --> Web Client Portal (Next.js 16 App Router, Shadcn UI, TanStack Query)
├── 📚 docs/                 --> Toàn bộ tài liệu kiến trúc, hướng dẫn và kế hoạch phát triển
├── 📜 package.json          --> Cấu hình scripts Turborepo cấp Root
├── ⚡ turbo.json            --> Cấu hình Turborepo Pipeline & Terminal UI (TUI)
└── 🌿 pnpm-workspace.yaml   --> Khai báo Workspace Monorepo
```

---

## 🚀 Quick Start (Khởi chạy nhanh)

### 1. Yêu cầu môi trường
* **Node.js**: Phiên bản `>= 20.0.0` (khuyên dùng Node 20 LTS hoặc Node 22 LTS).
* **Package Manager**: `pnpm` phiên bản `>= 9.x` (khuyên dùng `pnpm@11.x`).
* **Cơ sở dữ liệu**: MongoDB Server cục bộ (port 27017) hoặc MongoDB Docker Container.

### 2. Cài đặt dependencies
Tại thư mục gốc của dự án:
```bash
pnpm install
```

### 3. Cấu hình biến môi trường (.env)
Tạo file `.env` cho Backend và Frontend từ file mẫu `.env.example`:

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

### 4. Khởi chạy toàn bộ dự án
Chạy duy nhất một câu lệnh tại root:
```bash
pnpm dev
```
> ✨ Lệnh trên sẽ tự động kích hoạt **Turborepo Terminal UI (TUI)**:
> * Chia sidebar bên trái tách biệt các service: `backend#dev`, `frontend#dev`, `share-lib#dev`.
> * Dùng phím mũi tên `↑ / ↓` để chuyển đổi và phím `Enter` để xem chi tiết log của từng service.

* **Frontend Web Portal**: [http://localhost:3000](http://localhost:3000)
* **Backend REST API**: [http://localhost:8000/api/v1](http://localhost:8000/api/v1)

---

## 🛠️ Công nghệ chủ đạo (Tech Stack)

### ⚙️ Backend (REST API)
* **Framework**: NestJS 11 + TypeScript (Strict mode).
* **Database & ODM**: MongoDB 7+ & Mongoose 8.
* **Architecture**: Repository Pattern + Base Abstract Pattern (`BaseRepository`, `BaseService`, `BaseAbstractDocument`).
* **Authentication**: JWT (Access Token 15m + Refresh Token 7d) + Session Security với **30s Multi-tab Grace Period**.
* **Audit & Context**: Async Local Storage (`nestjs-cls`) tự động ghi nhận `createdById`, `updatedById`, `deletedAt` (Soft Delete).
* **Testing**: Vitest + Unit Tests theo chuẩn AAA (Arrange-Act-Assert).

### 💻 Frontend (Web Client)
* **Framework**: Next.js 16 (App Router) + React 19 + TypeScript.
* **Styling**: Tailwind CSS v4 + Tailwind Animate CSS.
* **Typography**: Font **Roboto** (Google Fonts hỗ trợ chuẩn Tiếng Việt, quản lý qua CSS variables).
* **Icons**: Thuần **Iconify** (`@iconify/react`) thông qua component dùng chung `Icon`.
* **UI Components**: Shadcn UI (Base-UI/Radix primitives).
* **Server State & Data Fetching**: TanStack Query v5 + Axios Client (Tự động đính kèm Bearer Token & Interceptor refresh).
* **Forms & Validation**: `react-hook-form` + `zod` + `zxcvbn-ts` (Đo lường độ mạnh mật khẩu).

### 📦 Share-Lib (Thư viện dùng chung)
* Xuất bản các kiểu dữ liệu dùng chung (`UserRole`, `AuthStatus`, `AuthProvider`, `IUser`, `ApiResponse`, ...).
* Biên dịch tự động sang `dist/` thông qua `tsc --watch`, chia sẻ tức thì giữa Backend và Frontend mà không bị lệch kiểu (Single Source of Truth).

---

## 📜 Các câu lệnh CLI thông dụng

| Lệnh | Ý nghĩa |
| :--- | :--- |
| `pnpm dev` | Khởi chạy song song toàn bộ services với Turborepo TUI |
| `pnpm build` | Biên dịch toàn bộ monorepo (`share-lib` -> `backend` -> `frontend`) |
| `pnpm test` | Chạy toàn bộ bộ test cases của các packages |
| `pnpm lint` | Kiểm tra định dạng và quy chuẩn mã nguồn |
| `pnpm --filter backend <cmd>` | Chạy lệnh riêng biệt cho thư mục `backend` |
| `pnpm --filter frontend <cmd>` | Chạy lệnh riêng biệt cho thư mục `frontend` |
| `pnpm --filter share-lib <cmd>` | Chạy lệnh riêng biệt cho thư mục `share-lib` |

---

## 👥 Bản quyền & Giấy phép
Dự án được xây dựng phục vụ Đồ Án Tốt Nghiệp Đại Học (DATN).  
Mọi quyền được bảo lưu © 2026.

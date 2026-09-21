# 🎓 HỆ THỐNG HỌC TRỰC TUYẾN VỚI VIDEO ĐA TƯƠNG TÁC
### Interactive Video E-Learning Platform with AI & Automated Payment

> **Đồ án tốt nghiệp Đại học (DATN)**  
> **Sinh viên thực hiện:** Trịnh Hồng Cường – **MSSV:** 28211151710  
> **Giảng viên hướng dẫn:** ThS. Nguyễn Hữu Phúc  
> **Thời gian:** 28/9/2026 – 22/12/2026 (3 tháng)  
> **Kiến trúc:** Monorepo chuẩn doanh nghiệp kết hợp **NestJS 11**, **Next.js 16 (App Router)**, **RabbitMQ**, **AssemblyAI**, **Gemini API**, **Markmap**, và **SePay**.

---

## 📑 Mục lục tài liệu

| Tài liệu | Mô tả |
| :--- | :--- |
| 🎯 **[Định hướng Đề tài & Master Brief](./a-agentic/project-brief.md)** | Bản định hướng cốt lõi cho AI Agent & thành viên dự án: 5 trụ cột chức năng, kiến trúc RabbitMQ, AI Pipeline |
| 🗺️ **[Sơ đồ Kiến trúc & Code Boundaries](./a-agentic/project-shape.md)** | Sơ đồ tương tác luồng dữ liệu kiến trúc (Mermaid), ranh giới chỉnh sửa code an toàn |
| 🚀 **[Hướng dẫn triển khai Local (Getting Started)](./docs/GETTING_STARTED.md)** | Hướng dẫn cài đặt môi trường, biến môi trường `.env`, MongoDB, RabbitMQ và khởi động dự án |
| 🏗️ **[Cấu trúc & Kiến trúc dự án (Project Structure)](./docs/PROJECT_STRUCTURE.md)** | Phân tích chi tiết kiến trúc Monorepo, Base Module, Feature-Driven Design, RabbitMQ & AI Pipeline |
| 📅 **[Kế hoạch Triển khai 3 Tháng (Master Roadmap)](./docs/PLAN-interactive-video-elearning.md)** | Lộ trình phân rã công việc từ 28/9 đến 22/12/2026 |
| 📐 **[Quy chuẩn kiến trúc hệ thống (Rule Guide)](./.agent/rules/project-architecture.md)** | Các nguyên tắc bắt buộc: Clean Code, Repository Pattern, RabbitMQ ACK/DLQ, Idempotency SePay, No `any` |

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

### ⚙️ Backend (REST API & Async Workers)
* **Framework**: NestJS 11 + TypeScript (Strict mode).
* **Database & ODM**: MongoDB 7+ & Mongoose 8.
* **Architecture**: Repository Pattern + Base Abstract Pattern (`BaseRepository`, `BaseService`, `BaseAbstractDocument`).
* **Message Broker**: **RabbitMQ (AMQP)** điều phối tác vụ upload video, gọi Speech-to-Text và gọi LLM bất đồng bộ với cơ chế Manual ACK & Dead Letter Queue (DLQ).
* **AI Integrations**:
  * **AssemblyAI**: Chuyển đổi giọng nói video sang văn bản có timestamp chi tiết.
  * **Google Gemini API**: Phân tích transcript, sinh sơ đồ tư duy Markdown và ngân hàng câu hỏi in-video quiz.
* **Cổng thanh toán**: **SePay API** (Quét mã VietQR động, kích hoạt khóa học tức thì qua Webhook an toàn Idempotent).
* **Authentication**: JWT (Access Token 15m + Refresh Token 7d) + Session Security với **30s Multi-tab Grace Period**.
* **Audit & Context**: Async Local Storage (`nestjs-cls`) tự động ghi nhận `createdById`, `updatedById`, `deletedAt` (Soft Delete).
* **Testing**: Vitest + Unit Tests theo chuẩn AAA (Arrange-Act-Assert).

### 💻 Frontend (Web Client)
* **Framework**: Next.js 16 (App Router) + React 19 + TypeScript.
* **Interactive Player & Mindmap**:
  * **HTML5 Video Player**: Tích hợp sự kiện tự động tạm dừng để học viên trả lời câu hỏi **In-video Quiz**.
  * **Markmap**: Thư viện `@markmap/react` / `markmap-view` hiển thị trực quan sơ đồ tư duy phân cấp từ Markdown.
* **Styling**: Tailwind CSS v4 + Tailwind Animate CSS.
* **Typography**: Font **Roboto** (Google Fonts hỗ trợ chuẩn Tiếng Việt, quản lý qua CSS variables).
* **Icons**: Thuần **Iconify** (`@iconify/react`) thông qua component dùng chung `Icon`.
* **UI Components**: Shadcn UI (Base-UI/Radix primitives).
* **Server State & Data Fetching**: TanStack Query v5 + Axios Client (Tự động đính kèm Bearer Token & Interceptor refresh).
* **Forms & Validation**: `react-hook-form` + `zod` + `zxcvbn-ts` (Đo lường độ mạnh mật khẩu).

### 📦 Share-Lib (Thư viện dùng chung)
* Xuất bản các kiểu dữ liệu dùng chung (`UserRole`, `AuthStatus`, `AuthProvider`, `IUser`, `ApiResponse`, `VideoStatus`, `OrderStatus`, ...).
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

# 🎓 HỆ THỐNG HỌC TRỰC TUYẾN VỚI VIDEO ĐA TƯƠNG TÁC
### Interactive Video E-Learning Platform with AI & Automated Payment

> **Đồ án tốt nghiệp Đại học (DATN)**  
> **Sinh viên thực hiện:** Trịnh Hồng Cường – **MSSV:** 28211151710  
> **Giảng viên hướng dẫn:** ThS. Nguyễn Hữu Phúc  
> **Thời gian:** 28/9/2026 – 22/12/2026 (3 tháng)  
> **Kiến trúc:** **NestJS 12 (ESM)**, **Next.js 16 (App Router)**, **MongoDB 7 (Replica Set rs0)**, **RabbitMQ 4.4**, **AssemblyAI**, **Gemini API**, **Markmap**, và **SePay**.

---

## 📖 Tổng quan dự án

Hệ thống học trực tuyến hiện đại tích hợp **video đa tương tác**, ứng dụng **AI** tự động hóa biên soạn nội dung học tập và cổng thanh toán tự động qua **VietQR**. Nền tảng khắc phục sự tiếp thu thụ động của phương pháp học video truyền thống, mang lại trải nghiệm học tập chủ động, trực quan và cá nhân hóa theo thời gian thực.

## 🎯 Mục tiêu dự án

* **Tăng cường tương tác bài giảng**: Tích hợp **In-video Quiz** (tự động tạm dừng video tại các điểm mốc tri thức để trả lời câu hỏi củng cố) và **AImindmap Viewer** (sơ đồ tư duy dạng cây hiển thị song song cùng video).
* **Tự động hóa bài giảng bằng AI**: Kết hợp **AssemblyAI** (chuyển đổi giọng nói sang văn bản có timestamp) và **Google Gemini API** (phân tích transcript, sinh sơ đồ tư duy Markdown và ngân hàng câu hỏi kiểm tra).
* **Kiến trúc xử lý bất đồng bộ tin cậy**: Vận hành hàng đợi **RabbitMQ (AMQP)** điều phối các tác vụ nặng (xử lý video, gọi AI pipeline), đảm bảo chống nghẽn và duy trì độ sẵn sàng cao.
* **Thanh toán & kích hoạt tức thì**: Tích hợp cổng thanh toán **SePay** quét mã VietQR động, tự động xác thực và kích hoạt khóa học tức thời qua Webhook an toàn (Idempotency & Transaction).

---

## 🏛️ Sơ đồ Kiến trúc Monorepo

```
Do_an_tot_nghiep/ (Root)
├── 📦 share-lib/            --> Thư viện dùng chung (Types, Enums, DTOs, Constants)
├── ⚙️ backend/              --> REST API Server & Standalone Worker (NestJS 12 ESM, Mongoose 9, MongoDB rs0, CLS Context)
├── 💻 frontend/             --> Web Client Portal (Next.js 16 App Router, Shadcn UI, TanStack Query)
├── 📚 docs/                 --> Toàn bộ tài liệu kiến trúc, hướng dẫn và kế hoạch phát triển
├── 📜 package.json          --> Cấu hình scripts Turborepo cấp Root
├── ⚡ turbo.json            --> Cấu hình Turborepo Pipeline & Terminal UI (TUI)
└── 🌿 pnpm-workspace.yaml   --> Khai báo Workspace Monorepo
```

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy (Sau khi Clone / Pull)

### 1. Yêu cầu môi trường (Prerequisites)
* **Node.js**: Phiên bản `>= 22.0.0` (khuyên dùng Node 22 LTS hoặc Node 24 LTS; tương thích `amqp-connection-manager 5.x` và OpenAI SDK).
* **Package Manager**: `pnpm` phiên bản `11.x` (dự án khai báo `pnpm@11.1.3`).
* **Docker & Docker Compose**: Dùng để khởi chạy đồng bộ **MongoDB 7.0 (Replica Set `rs0`)**, **MinIO Object Storage** và **RabbitMQ 4.4.1**.
* **Git**: Để clone/pull mã nguồn.

### 2. Cài đặt lần đầu sau khi Clone

#### Bước 1: Clone repository & di chuyển vào thư mục gốc
```bash
git clone <repository-url>
cd project_do_an
```

#### Bước 2: Cài đặt dependencies & build thư viện dùng chung (`share-lib`)
```bash
pnpm install
pnpm --filter share-lib build
```
> 💡 Bước build `share-lib` giúp tạo sẵn `share-lib/dist/` trước khi chạy `backend`, `frontend` hoặc các script `seed`.

#### Bước 3: Khởi động hạ tầng Docker
```bash
docker compose up -d
```
Kiểm tra trạng thái các container đã chạy ổn định:
```bash
docker compose ps
```
Lệnh trên sẽ tự động khởi tạo:
* `thc_mongo` & `thc_mongo_init`: MongoDB 7.0 Replica Set `rs0` tại `localhost:27017` (bắt buộc cho MongoDB Transactions).
* `thc_minio` & `thc_minio_init`: MinIO tại `localhost:9000` (API) & `localhost:9001` (Console), tự động tạo sẵn 2 bucket `thc-datn-media` (public) và `thc-datn-media-private` (private).
* `thc_rabbitmq`: RabbitMQ 4.4.1 tại `localhost:5672` (AMQP) & `localhost:15672` (Management UI) với tài khoản/vhost mặc định `mindly`.

#### Bước 4: Cấu hình biến môi trường (`.env`)
Tạo file `.env` cho Backend và Frontend từ file mẫu `.env.example`:

**Linux / macOS / Git Bash:**
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**Windows PowerShell:**
```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

> 📌 **Lưu ý cấu hình `.env`:**
> * Các thông số local (`MONGODB_URI`, `MINIO_*`, `RABBITMQ_URL`, `JWT_*`, `NEXT_PUBLIC_*`) trong `.env.example` đã khớp sẵn với `docker-compose.yml`, có thể chạy ngay ở môi trường dev.
> * Các API key bên thứ ba (`ASSEMBLYAI_API_KEY`, `GEMINI_API_KEY_*`, `RIVER_API_KEY_*`, `CHATBOT_API_KEY`, `GOOGLE_CLIENT_ID`/`SECRET`, `GMAIL_USER`/`APP_PASSWORD`, `SEPAY_*`) chỉ cần điền khi sử dụng tính năng tương ứng. Nếu chưa cấu hình Gmail SMTP, link xác thực email sẽ được in trực tiếp ra terminal của `backend`.

#### Bước 5: Khởi tạo dữ liệu mẫu (Seed Database)
```bash
pnpm seed
```
*(Tùy chọn)* Dùng `pnpm seed:refresh` nếu muốn ghi đè/cập nhật lại dữ liệu tài khoản và danh mục mẫu.

#### Bước 6: Khởi chạy toàn bộ dự án
Tại thư mục gốc, chạy:
```bash
pnpm dev
```
> ✨ Lệnh trên sẽ tự động kích hoạt **Turborepo Terminal UI (TUI)**:
> * Chạy song song `share-lib#dev`, `backend#dev` (port `8000`) và `frontend#dev` (port `3000`).
> * Dùng phím mũi tên `↑ / ↓` để chuyển đổi và phím `Enter` để xem chi tiết log của từng service.

*(Tùy chọn)* Nếu cần test xử lý video bất đồng bộ (FFmpeg tách audio, AssemblyAI transcript, Gemini/River AI sinh Mindmap & In-video Quiz), mở thêm một terminal khác và chạy **Standalone Worker**:
```bash
pnpm --filter backend dev:worker
```

#### Địa chỉ truy cập Local
| Thành phần | URL / Connection | Tài khoản mặc định (Dev) |
| :--- | :--- | :--- |
| **Frontend Web Portal** | [http://localhost:3000](http://localhost:3000) | — |
| **Backend REST API** | [http://localhost:8000/api/v1](http://localhost:8000/api/v1) | — |
| **MinIO Console** | [http://localhost:9001](http://localhost:9001) | `minioadmin` / `minioadmin123` |
| **RabbitMQ Management** | [http://localhost:15672](http://localhost:15672) | `mindly` / `mindly_dev_password` |
| **MongoDB (`rs0`)** | `mongodb://localhost:27017/thc_datn` | Không mật khẩu (local dev) |

### 3. Cập nhật sau khi `git pull` code mới
Mỗi khi kéo code mới từ nhánh về, chạy lại các bước sau để đồng bộ dependencies và `share-lib`:
```bash
git pull
pnpm install
pnpm --filter share-lib build
docker compose up -d
pnpm dev
```

---

## 🛠️ Công nghệ chủ đạo (Tech Stack)

### ⚙️ Backend (REST API & Standalone Worker)
* **Framework**: NestJS 12 (ESM) + TypeScript (Strict mode).
* **Database & ODM**: MongoDB 7.0 Replica Set (`rs0`) & Mongoose 9.
* **Architecture**: Repository Pattern + Base Abstract Pattern (`BaseRepository`, `BaseService`, `BaseAbstractDocument`) + Embedded Outbox Pattern.
* **Message Broker**: **RabbitMQ 4.4 (AMQP)** điều phối tác vụ upload video, transcription và AI pipeline bất đồng bộ với cơ chế Atomic Claim, Lease Fencing, Manual ACK & Dead Letter Queue (DLQ).
* **Standalone Worker**: Tiến trình nền riêng biệt (`pnpm --filter backend dev:worker`) chuyên trách xử lý các tác vụ AI & Video nặng, không làm nghẽn REST API.
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
| `docker compose up -d` | Khởi chạy hạ tầng Docker (MongoDB `rs0`, MinIO, RabbitMQ) |
| `docker compose down` | Dừng và gỡ các container hạ tầng (giữ nguyên Docker volumes) |
| `pnpm dev` | Khởi chạy song song `share-lib`, `backend`, `frontend` với Turborepo TUI |
| `pnpm --filter backend dev:worker` | Khởi chạy Standalone Worker xử lý video & AI pipeline |
| `pnpm seed` | Khởi tạo dữ liệu mẫu (Users, Course Categories) |
| `pnpm seed:refresh` | Chạy lại seeder ở chế độ ghi đè/cập nhật dữ liệu mẫu |
| `pnpm build` | Biên dịch toàn bộ monorepo (`share-lib` -> `backend` -> `frontend`) |
| `pnpm test` | Chạy toàn bộ bộ test cases của các packages |
| `pnpm lint` | Kiểm tra định dạng và quy chuẩn mã nguồn |
| `pnpm --filter backend <cmd>` | Chạy lệnh riêng biệt cho thư mục `backend` |
| `pnpm --filter frontend <cmd>` | Chạy lệnh riêng biệt cho thư mục `frontend` |
| `pnpm --filter share-lib <cmd>` | Chạy lệnh riêng biệt cho thư mục `share-lib` |

### Lưu ý & Xử lý sự cố thường gặp
* **Kết nối MongoDB Compass báo lỗi topology Replica Set**: Dùng chuỗi kết nối `mongodb://localhost:27017/thc_datn?directConnection=true`.
* **Lỗi thiếu module `share-lib` khi chạy backend/seed lần đầu**: Chạy `pnpm --filter share-lib build` để biên dịch thư mục `share-lib/dist/`.

### Dọn trường mô tả ngắn của khóa học cũ

Khóa học chỉ còn dùng `description` (mô tả chi tiết). Sau khi cập nhật backend,
dọn trường `shortDescription` trong database được cấu hình ở `backend/.env`:

```bash
# Chỉ kiểm tra số khóa học bị tác động, không thay đổi dữ liệu
pnpm --filter backend cleanup:course-short-description

# Thay thc_datn bằng đúng MONGODB_DB_NAME của môi trường cần dọn
pnpm --filter backend cleanup:course-short-description --apply --expect-db=thc_datn
```

Lệnh áp dụng sao lưu Extended JSON vào thư mục `opencode` trong thư mục tạm của
người dùng trước khi xóa trường, bao gồm cả khóa học đã xóa mềm. Không xóa khóa học,
không đổi mô tả chi tiết hay dữ liệu khác; chạy lại sau khi dọn sẽ không thay đổi gì.

---


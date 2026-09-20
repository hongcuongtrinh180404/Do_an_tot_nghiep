# 🚀 HƯỚNG DẪN TRIỂN KHAI VÀ CHẠY DỰ ÁN TRÊN MÁY CỤC BỘ (LOCAL SETUP)

> Tài liệu này hướng dẫn chi tiết từng bước chuẩn bị môi trường, cấu hình và khởi chạy toàn bộ hệ thống **DATN Portal Monorepo** (Backend, Frontend, Share-lib) trên máy tính cá nhân (Windows, macOS hoặc Linux).

---

## 📋 1. Chuẩn bị môi trường tiên quyết (Prerequisites)

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt:

| Phần mềm / Công cụ | Phiên bản yêu cầu | Ghi chú kiểm tra |
| :--- | :--- | :--- |
| **Node.js** | `>= 20.0.0` | Kiểm tra bằng lệnh: `node -v` |
| **pnpm** | `>= 10.x` hoặc `11.x` | Kiểm tra bằng lệnh: `pnpm -v` |
| **MongoDB** | `>= 7.0` | Đang chạy tại `localhost:27017` |
| **Git** | Bất kỳ | Quản lý mã nguồn |

### Hướng dẫn cài đặt nhanh các công cụ (nếu chưa có):

1. **Cài đặt Node.js**:
   * Tải bản **Node.js LTS (v20 hoặc v22)** tại [nodejs.org](https://nodejs.org/).
   * Hoặc sử dụng NVM (Node Version Manager):
     ```bash
     nvm install 20
     nvm use 20
     ```

2. **Cài đặt pnpm**:
   ```bash
   npm install -g pnpm
   ```

3. **Cài đặt và khởi chạy MongoDB**:
   * **Cách 1 (Khuyên dùng - Cài đặt trực tiếp)**: Tải và cài đặt **MongoDB Community Server** cùng **MongoDB Compass** từ trang chủ [mongodb.com](https://www.mongodb.com/try/download/community). Sau khi cài, dịch vụ MongoDB sẽ tự động chạy ngầm ở cổng `27017`.
   * **Cách 2 (Sử dụng Docker)**: Nếu máy đã cài Docker Desktop, bạn có thể khởi chạy một container MongoDB nhanh bằng lệnh:
     ```bash
     docker run -d --name mongo-datn -p 27017:27017 -v mongo_data:/data/db mongo:7.0
     ```

---

## 📥 2. Tải mã nguồn & Cài đặt thư viện

1. Mở terminal và clone dự án về máy:
   ```bash
   git clone <URL_REPO>
   cd Do_an_tot_nghiep
   ```

2. Cài đặt toàn bộ dependencies cho toàn bộ Monorepo:
   ```bash
   pnpm install
   ```
   > 💡 *Nhờ cấu hình pnpm workspace và Turborepo, lệnh này sẽ đồng thời liên kết `share-lib` vào cả `backend` và `frontend` tự động.*

---

## ⚙️ 3. Thiết lập biến môi trường (.env)

Hệ thống yêu cầu các file biến môi trường riêng cho Backend và Frontend.

### 3.1. Cấu hình Backend (`backend/.env`)

Tạo file `backend/.env` (bằng cách sao chép từ `backend/.env.example`):

```bash
# Windows PowerShell:
Copy-Item backend/.env.example backend/.env

# Linux / macOS / Git Bash:
cp backend/.env.example backend/.env
```

Nội dung chuẩn của file `backend/.env`:
```env
# Server
PORT=8000
NODE_ENV=development
APP_NAME=THC_DATN_API
API_PREFIX=api/v1

# MongoDB
MONGODB_URI=mongodb://localhost:27017/thc_datn
MONGODB_DB_NAME=thc_datn

# JWT Authentication (Cần tối thiểu 32 ký tự)
JWT_SECRET=super_secret_jwt_key_at_least_32_characters_long_for_security
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=another_super_secret_refresh_key_at_least_32_characters_long
JWT_REFRESH_EXPIRES_IN=7d

# CORS & Security
CORS_ORIGIN=http://localhost:3000
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

### 3.2. Cấu hình Frontend (`frontend/.env.local` hoặc `frontend/.env`)

Tạo file `frontend/.env`:

```bash
# Windows PowerShell:
Copy-Item frontend/.env.example frontend/.env

# Linux / macOS / Git Bash:
cp frontend/.env.example frontend/.env
```

Nội dung của `frontend/.env`:
```env
# Trỏ đến địa chỉ Backend API (bao gồm prefix api/v1)
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## 🏃 4. Khởi chạy dự án

### Cách 1: Chạy tất cả cùng lúc với Turborepo TUI (Khuyên dùng)

Tại thư mục gốc của dự án, chạy lệnh:

```bash
pnpm dev
```

#### 🖥️ Giao diện Terminal UI (TUI) có Sidebar:
Lệnh trên sẽ mở giao diện điều khiển đa nhiệm Turborepo TUI:
* **Sidebar bên trái**: Liệt kê 3 dịch vụ đang chạy song song:
  * `share-lib#dev`: Biên dịch TypeScript kiểu dữ liệu chia sẻ ở chế độ watch mode.
  * `backend#dev`: Khởi động NestJS server (cổng `8000`).
  * `frontend#dev`: Khởi động Next.js App Router (cổng `3000`).
* **Màn hình bên phải**: Hiển thị luồng log thời gian thực của dịch vụ đang được chọn.

#### ⌨️ Các phím thao tác trong TUI:
* `↑` / `↓`: Di chuyển giữa các service để kiểm tra log.
* `Enter`: Mở xem chi tiết log của service đó.
* `F` (hoặc phím cách): Xem phóng to toàn màn hình log.
* `Esc`: Quay lại danh sách tổng quan.
* `Ctrl + C`: Tắt toàn bộ hệ thống an toàn.

---

### Cách 2: Chạy riêng từng service (Dùng khi debug chuyên sâu)

Nếu bạn chỉ muốn mở riêng từng terminal để theo dõi:

1. **Terminal 1 - Share-Lib (Bắt buộc chạy trước nếu có thay đổi Type)**:
   ```bash
   pnpm --filter share-lib dev
   ```
2. **Terminal 2 - Backend**:
   ```bash
   pnpm --filter backend dev
   ```
3. **Terminal 3 - Frontend**:
   ```bash
   pnpm --filter frontend dev
   ```

---

## 🌐 5. Kiểm tra hệ thống sau khi chạy

Sau khi khởi chạy thành công:

1. **Frontend Web Portal**:
   * Truy cập: [http://localhost:3000](http://localhost:3000)
   * Bạn có thể test:
     * Trang chủ `/`: Giới thiệu hệ thống, trạng thái API, thông tin công nghệ.
     * Trang đăng ký `/register`: Đăng ký tài khoản sinh viên / giảng viên mới (có thanh đo độ mạnh mật khẩu và iconify).
     * Trang đăng nhập `/login`: Đăng nhập lấy JWT Access Token và Cookie Refresh Token.

2. **Backend Health Check**:
   * Truy cập trình duyệt hoặc Postman: [http://localhost:8000/api/v1](http://localhost:8000/api/v1)
   * Phản hồi chuẩn:
     ```json
     {
       "statusCode": 200,
       "message": "Welcome to THC_DATN_API",
       "data": { "status": "ok" }
     }
     ```

---

## 🧪 6. Chạy kiểm thử tự động (Unit Tests)

Dự án áp dụng mô hình kiểm thử AAA (Arrange-Act-Assert) cho tầng Service:

```bash
# Chạy toàn bộ test trong monorepo
pnpm test

# Hoặc chỉ chạy test ở Backend
pnpm --filter backend test
```

---

## 🔨 7. Biên dịch dự án cho Production (Build)

Để kiểm tra toàn bộ mã nguồn có lỗi TypeScript hoặc lỗi đóng gói hay không:

```bash
pnpm build
```
Thứ tự Turborepo tự động giải quyết phụ thuộc:  
`share-lib:build` ➡️ `backend:build` + `frontend:build`.

---

## ❓ 8. Các lỗi thường gặp và cách khắc phục (Troubleshooting)

### 🔴 1. Lỗi kết nối MongoDB (`MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017`)
* **Nguyên nhân**: Dịch vụ MongoDB trên máy chưa được bật.
* **Cách khắc phục**:
  * Mở ứng dụng **Services** (trên Windows), tìm `MongoDB Server` và nhấn **Start**.
  * Hoặc mở terminal gõ: `net start MongoDB`.
  * Nếu dùng Docker, gõ: `docker start mongo-datn`.

---

### 🔴 2. Lỗi cổng đã bị chiếm dụng (`EADDRINUSE: address already in use :::8000` hoặc `:::3000`)
* **Nguyên nhân**: Một tiến trình cũ của Node.js vẫn đang chiếm giữ cổng.
* **Cách khắc phục trên Windows**:
  ```powershell
  # Tìm PID đang chiếm port 8000:
  netstat -ano | findstr :8000
  # Tắt tiến trình bằng PID tìm được (ví dụ PID là 1234):
  taskkill /PID 1234 /F
  ```

---

### 🔴 3. Lỗi `pnpm: Packages are blocked from running build scripts (bcrypt)`
* **Nguyên nhân**: Pnpm 10+ có cơ chế bảo mật sandbox chặn build script của thư viện C++ native như `bcrypt`.
* **Cách khắc phục**: Đảm bảo file `pnpm-workspace.yaml` ở thư mục gốc có dòng:
  ```yaml
  allowBuilds:
    bcrypt: true
  ```
  Sau đó chạy lại: `pnpm install`.

---

### 🔴 4. Sửa code trong `share-lib` nhưng Backend/Frontend không nhận kiểu mới
* **Nguyên nhân**: `share-lib` xuất ra thư mục `dist/`, cần được biên dịch lại khi sửa đổi file `.ts`.
* **Cách khắc phục**: Đảm bảo tiến trình `pnpm dev` vẫn đang chạy (đã bao gồm `share-lib#dev` tự động watch), hoặc gõ thủ công:
  ```bash
  pnpm --filter share-lib build
  ```

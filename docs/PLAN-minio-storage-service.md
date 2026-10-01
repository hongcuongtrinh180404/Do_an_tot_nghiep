# Kế hoạch Triển khai: Thiết lập MinIO Docker & Loại bỏ Hoàn toàn Cloudinary (Complete MinIO Migration)

> **Mục tiêu**: 
> 1. Thiết lập MinIO Object Storage qua Docker Compose (`docker-compose.yml`) — khởi chạy 1 lệnh duy nhất là có sẵn MinIO Server kèm Init Container tự động tạo bucket và phân quyền.
> 2. **Loại bỏ hoàn toàn Cloudinary** khỏi toàn bộ hệ thống (gỡ bỏ thư viện `cloudinary`, xóa module `CloudinaryModule`, xóa toàn bộ biến môi trường `CLOUDINARY_*`, dọn dẹp domain whitelist).
> 3. Xây dựng `StorageModule` chuẩn hóa dùng MinIO S3 SDK (`@aws-sdk/client-s3`), tích hợp thư viện `sharp` để tự động crop/nén avatar chuẩn WebP.
> 4. Triển khai cơ chế phục vụ video Hybrid: Direct Public URL cho bài học học thử (`isPreview: true`) & Presigned URL có hạn dùng cho bài học có phí, hỗ trợ HTTP 206 Range Requests tua video mượt mà.
>
> **Quyết định Kiến trúc Đã Thống nhất (User Decisions)**:
> 1. **Khử bỏ Cloudinary 100%**: Không sử dụng dual-driver hay giữ lại Cloudinary; chuyển đổi dứt điểm sang MinIO để làm chủ toàn bộ hạ tầng lưu trữ.
> 2. **Cơ chế Phục vụ Video**: Áp dụng mô hình **Hybrid** — Direct Public URL cho bài học học thử (`isPreview: true`) & Presigned URL có hạn dùng (60-120 phút) cho bài học chính thức có phí.
> 3. **Cấu hình Docker Compose**: Chuyên biệt vào **MinIO Server + MinIO Init Container (`minio/mc`)** để chạy 1 lệnh là tự động có sẵn MinIO, tự tạo bucket `thc-datn-media` và set download policy cho static assets.
> **Trạng thái**: PLANNING ONLY — Đã cập nhật kế hoạch loại bỏ Cloudinary, sẵn sàng triển khai.

---

## 1. Nghiên cứu Hiện trạng & Kế hoạch Khử bỏ Cloudinary (Decommissioning Plan)

### 1.1. Bản đồ Các Vị trí Đang Sử dụng Cloudinary Cần Dọn dẹp
| Thành phần | Vị trí tệp | Hành động Khử bỏ & Thay thế |
| :--- | :--- | :--- |
| **Dependencies** | `backend/package.json` | Gỡ bỏ `"cloudinary": "^2.11.0"`. Thêm `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `sharp`. |
| **Config & Env** | `backend/src/config/env.validation.ts`<br>`backend/.env`<br>`backend/.env.example` | Xóa `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER`. Thêm cấu hình `MINIO_*`. |
| **Module Cloudinary** | `backend/src/modules/cloudinary/` | Xóa bỏ toàn bộ thư mục này (`cloudinary.module.ts`, `cloudinary.service.ts`, `tests/cloudinary.service.spec.ts`). Thay bằng `backend/src/modules/storage/`. |
| **User Avatar** | `backend/src/modules/user/services/user.service.ts`<br>`backend/src/modules/user/services/cloudinary.service.ts` | Xóa tệp re-export cũ. Inject `StorageService` vào `UserService`, gọi `storageService.uploadImage(file)`. |
| **Lesson Upload** | `backend/src/modules/course/lesson-content.controller.ts` | Thay thế `CloudinaryService` bằng `StorageService.uploadLessonMedia(file)`. Thêm endpoint lấy Presigned Stream URL và Range Stream. |
| **App & Module DI** | `backend/src/app.module.ts`<br>`backend/src/modules/user/user.module.ts`<br>`backend/src/modules/course/course.module.ts` | Thay `CloudinaryModule` bằng `StorageModule`. |
| **Unit Tests** | `backend/src/modules/user/tests/user.service.avatar.spec.ts`<br>`backend/src/modules/course/tests/lesson-content.controller.spec.ts` | Cập nhật mocks từ `CloudinaryService` sang `StorageService`. Viết test mới cho `StorageService`. |
| **Frontend Whitelist** | `frontend/next.config.ts` | Xóa whitelist `res.cloudinary.com`. Thêm `localhost:9000` / `127.0.0.1:9000` cho MinIO. |
| **Living Docs** | `a-agentic/features/ai-video-pipeline/rules-and-flows.md` | Chuẩn hóa sơ đồ Sequence từ `Storage (S3/Cloudinary/Local)` thành `Storage (MinIO S3)`. |

---

## 2. Tổng quan Dự án & Ranh giới (Scope & Boundaries)

| Tiêu chí | Phạm vi trong Kế hoạch (IN SCOPE) | Ngoài phạm vi (OUT OF SCOPE) |
| :--- | :--- | :--- |
| **Docker MinIO** | `docker-compose.yml` ở thư mục gốc: MinIO Server + `minio/mc` init service (auto-create bucket `thc-datn-media` + set public policies) | Setup cụm MinIO phân tán (Distributed MinIO cluster đa node) |
| **Loại bỏ Cloudinary** | Xóa sạch 100% mã nguồn, biến môi trường, thư viện package Cloudinary | Giữ lại adapter fallback Cloudinary |
| **Storage Module Mới** | `StorageModule` dùng AWS S3 Client SDK (`@aws-sdk/client-s3`), tích hợp `sharp` xử lý avatar (crop 500x500 WebP) | Lưu trữ local filesystem tạm thời |
| **Cơ chế Phục vụ Video** | Hỗ trợ Range Requests HTTP 206 (seeking/scrubbing), Presigned URLs có hạn dùng, Direct URL cho preview | Transcode HLS (.m3u8 adaptive bitrate) đa độ phân giải (thuộc AI video pipeline giai đoạn sau) |
| **Frontend Sync** | Cập nhật `next.config.ts` (whitelist MinIO host) & kiểm tra video player | Sửa UI Course/Lesson player |

---

## 3. Kiến trúc Kỹ thuật Chi tiết (Technical Architecture)

### 3.1. Thiết kế Docker Compose (`docker-compose.yml`)
Khởi chạy 1 lệnh duy nhất: `docker compose up -d`
- **Dịch vụ 1: `minio` (MinIO Server)**:
  - Image: `minio/minio:latest`
  - Port API S3: `9000:9000`
  - Port Console UI: `9001:9001` (Giao diện web trực quan quản trị buckets/files)
  - Biến môi trường: `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`
  - Volume: `minio_data:/data` (Bảo toàn dữ liệu khi restart container)
  - Healthcheck: `mc ready local` để đảm bảo MinIO sẵn sàng nhận kết nối trước khi init container chạy.
- **Dịch vụ 2: `minio-init` (MinIO Client tự động khởi tạo)**:
  - Image: `minio/mc:latest`
  - Phụ thuộc: `minio` (chờ `service_healthy`)
  - Tự động:
    1. Alias kết nối: `mc alias set myminio http://minio:9000 minioadmin minioadmin123`
    2. Tạo bucket mặc định: `thc-datn-media` (nếu chưa có)
    3. Cấu hình quyền công khai (anonymous download policy) cho thư mục `/avatars` và `/thumbnails`
    4. Thư mục `/courses/lessons` mặc định bảo vệ để cấp quyền qua Presigned URL

```yaml
services:
  minio:
    image: minio/minio:latest
    container_name: thc_minio
    restart: unless-stopped
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin123}
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio-init:
    image: minio/mc:latest
    container_name: thc_minio_init
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      /usr/bin/mc alias set myminio http://minio:9000 ${MINIO_ROOT_USER:-minioadmin} ${MINIO_ROOT_PASSWORD:-minioadmin123};
      /usr/bin/mc mb --ignore-existing myminio/thc-datn-media;
      /usr/bin/mc anonymous set download myminio/thc-datn-media/avatars;
      /usr/bin/mc anonymous set download myminio/thc-datn-media/thumbnails;
      exit 0;
      "

volumes:
  minio_data:
    driver: local
```

---

### 3.2. Cấu trúc Module Lưu trữ Mới (`backend/src/modules/storage/`)

Xóa hoàn toàn `backend/src/modules/cloudinary/` và thay thế bằng `StorageModule`:

```text
backend/src/modules/storage/
├── storage.module.ts                # Khởi tạo S3Client và export StorageService
├── storage.service.ts               # Core logic MinIO S3 + Sharp image processing
├── interfaces/
│   └── storage.interface.ts         # Types & Interfaces (ILessonContent, ImageUploadOptions)
└── tests/
    └── storage.service.spec.ts      # Unit tests kiểm thử S3 Put/Get/Delete & Presigned URL
```

1. **`storage.service.ts` Core API**:
   - `uploadImage(file: Express.Multer.File, subFolder?: string)`:
     - Dùng `sharp(file.buffer).resize(500, 500, { fit: 'cover' }).webp({ quality: 80 }).toBuffer()`.
     - Tạo file key duy nhất: `${subFolder}/${uuidv4()}.webp`.
     - Đẩy lên MinIO qua `PutObjectCommand` với `ContentType: 'image/webp'`.
     - Trả về public URL truy cập: `http://localhost:9000/thc-datn-media/...`.
   - `uploadLessonMedia(file: Express.Multer.File, subFolder?: string)`:
     - Phân loại MIME type: Video (`video/mp4`, `video/webm`, `video/quicktime`) hoặc Document (`application/pdf`, `docx`).
     - Tạo file key: `${subFolder}/${uuidv4()}-${cleanOriginalName}`.
     - Đẩy lên MinIO qua `PutObjectCommand`.
     - Trả về contract `ILessonContent`:
       ```ts
       {
         type: 'video', // hoặc 'document'
         url: 'http://localhost:9000/thc-datn-media/courses/lessons/...',
         publicId: 'courses/lessons/...',
         fileName: file.originalname,
         fileSize: file.size,
         mimeType: file.mimetype,
       }
       ```
   - `getPresignedStreamUrl(fileKey: string, expiresInSeconds: number = 7200)`:
     - Sinh S3 Presigned URL có chữ ký qua `getSignedUrl(s3Client, new GetObjectCommand({ Bucket, Key }), { expiresIn })`.
     - Cho phép học viên đã mua khóa học stream video an toàn trong vòng 2 giờ.
   - `deleteFile(fileKey: string)`:
     - Xóa object trên MinIO qua `DeleteObjectCommand`.

---

### 3.3. Cơ chế Phục vụ Video (Hybrid Serving Model)

1. **Bài học học thử (`isPreview: true`)**:
   - Trình duyệt truy cập trực tiếp public URL: `http://localhost:9000/thc-datn-media/courses/lessons/...`.
   - MinIO S3 hỗ trợ sẵn header `Range: bytes=start-end` (HTTP `206 Partial Content`), trình duyệt tự động seek/tua mượt mà không cần code thêm logic streaming.
2. **Bài học trả phí chính thức (`isPreview: false`)**:
   - Thêm endpoint: `GET /api/v1/lesson-content/stream-url?lessonId=...`
   - Kiểm tra JWT Auth + phân quyền người dùng (đã enroll khóa học hoặc là Instructor/Admin).
   - Nếu hợp lệ, backend sinh Presigned URL từ MinIO (thời hạn 2 giờ) và trả về cho client.
   - Trình duyệt phát video qua Presigned URL này với đầy đủ tính năng tua/seek chuẩn Range Request, giảm tải hoàn toàn băng thông cho NestJS backend.

---

## 4. Kế hoạch Tác vụ Chi tiết (Task Breakdown)

### Tác vụ 1: Thiết lập Docker Compose cho MinIO Server & Init Container
- **Agent**: `backend-specialist`
- **Kỹ năng**: `server-management`, `clean-code`
- **Độ ưu tiên**: P0
- **Input**: Port MinIO (9000, 9001), credentials root.
- **Output**:
  - `docker-compose.yml` tại thư mục gốc.
  - Cập nhật `.env.example`: Thêm các biến cấu hình MinIO:
    ```env
    MINIO_ENDPOINT=localhost
    MINIO_PORT=9000
    MINIO_USE_SSL=false
    MINIO_ROOT_USER=minioadmin
    MINIO_ROOT_PASSWORD=minioadmin123
    MINIO_BUCKET_NAME=thc-datn-media
    MINIO_PUBLIC_URL=http://localhost:9000
    ```
- **Xác minh (Verify)**:
  - Chạy `docker compose up -d` -> Container `thc_minio` chạy healthy, `thc_minio_init` hoàn thành và tạo bucket `thc-datn-media`.

---

### Tác vụ 2: Loại bỏ Thư viện & Cấu hình Cloudinary
- **Agent**: `backend-specialist`
- **Kỹ năng**: `clean-code`
- **Độ ưu tiên**: P0
- **Input**: `backend/package.json`, `backend/src/config/env.validation.ts`, `backend/.env`.
- **Output**:
  - Gỡ bỏ package `cloudinary` khỏi `backend/package.json` (`pnpm --filter backend remove cloudinary`).
  - Cài đặt `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `sharp`, `@types/sharp`.
  - Cập nhật `backend/src/config/env.validation.ts`:
    - Xóa `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER`.
    - Thêm Joi validation cho `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_BUCKET_NAME`, `MINIO_PUBLIC_URL`.
  - Cập nhật file `backend/.env` cục bộ với các giá trị MinIO.
- **Xác minh (Verify)**:
  - `pnpm --filter backend exec tsc --noEmit` nhận diện đúng types của AWS SDK và Sharp.

---

### Tác vụ 3: Xây dựng `StorageModule` & Xóa bỏ Hoàn toàn `CloudinaryModule`
- **Agent**: `backend-specialist`
- **Kỹ năng**: `clean-code`, `api-patterns`
- **Độ ưu tiên**: P1
- **Phụ thuộc**: Tác vụ 1, Tác vụ 2
- **Input**: `@aws-sdk/client-s3`, `sharp`.
- **Output**:
  - Tạo `backend/src/modules/storage/`:
    - `storage.module.ts`: Khởi tạo S3Client và export `StorageService`.
    - `storage.service.ts`: Triển khai `uploadImage` (Sharp crop 500x500 WebP), `uploadLessonMedia`, `getPresignedStreamUrl`, `deleteFile`.
    - `tests/storage.service.spec.ts`: Unit test mock S3Client.
  - Xóa bỏ toàn bộ thư mục `backend/src/modules/cloudinary/`.
  - Xóa file `backend/src/modules/user/services/cloudinary.service.ts`.
  - Cập nhật `AppModule`: import `StorageModule` thay thế `CloudinaryModule`.
- **Xác minh (Verify)**:
  - Unit tests cho `StorageService` pass 100%.

---

### Tác vụ 4: Cập nhật `UserService`, `LessonContentController` & Migration Tests
- **Agent**: `backend-specialist`
- **Kỹ năng**: `clean-code`, `testing-patterns`
- **Độ ưu tiên**: P1
- **Phụ thuộc**: Tác vụ 3
- **Input**: `StorageService`.
- **Output**:
  - `backend/src/modules/user/services/user.service.ts`: Inject `StorageService` thay vì `CloudinaryService`.
  - `backend/src/modules/user/user.module.ts`: Import `StorageModule`.
  - `backend/src/modules/course/lesson-content.controller.ts`:
    - Inject `StorageService`.
    - Thêm endpoint `GET /api/v1/lesson-content/stream-url`: Sinh Presigned URL an toàn cho video bài học.
  - `backend/src/modules/course/course.module.ts`: Import `StorageModule`.
  - Cập nhật toàn bộ test suites:
    - `backend/src/modules/user/tests/user.service.avatar.spec.ts`: mock `StorageService`.
    - `backend/src/modules/course/tests/lesson-content.controller.spec.ts`: mock `StorageService`.
- **Xác minh (Verify)**:
  - Chạy `pnpm --filter backend test` -> 100% tests pass.

---

### Tác vụ 5: Cập nhật Frontend `next.config.ts` & Tài liệu Living Docs
- **Agent**: `frontend-specialist`
- **Kỹ năng**: `react-best-practices`, `clean-code`
- **Độ ưu tiên**: P2
- **Output**:
  - `frontend/next.config.ts`:
    - Xóa `res.cloudinary.com` khỏi `images.remotePatterns`.
    - Thêm cấu hình hostname `localhost` và port `9000` (hoặc domain MinIO).
  - Cập nhật `a-agentic/features/ai-video-pipeline/rules-and-flows.md`:
    - Thay thế ghi chú S3/Cloudinary/Local thành MinIO Object Storage.
- **Xác minh (Verify)**:
  - Chạy `pnpm --filter frontend exec tsc --noEmit` -> 0 errors.
  - Chạy `pnpm --filter frontend lint` -> 0 errors.

---

## 5. Phase X: Kiểm tra & Nghiệm thu (Verification Checklist)

Trước khi coi kế hoạch hoàn tất và bàn giao, bắt buộc thực thi toàn bộ checklist:

- [x] **Khởi động Docker MinIO thành công**:
  - [x] `docker compose up -d` hoạt động không lỗi (thc_minio & thc_minio_init).
  - [x] Web Console MinIO tại `http://localhost:9001` đăng nhập thành công.
  - [x] Bucket `thc-datn-media` đã được tạo và set policy đúng.
- [x] **Khử bỏ hoàn toàn Cloudinary**:
  - [x] Không còn thư mục `backend/src/modules/cloudinary/`.
  - [x] Không còn package `cloudinary` trong `package.json` và `pnpm-lock.yaml`.
  - [x] Không còn bất kỳ biến `CLOUDINARY_*` nào trong `.env`, `.env.example`, `env.validation.ts`.
  - [x] Không còn `res.cloudinary.com` trong `next.config.ts`.
- [x] **Typecheck toàn bộ hệ thống**:
  - [x] `pnpm --filter share-lib build` (Thành công 100%).
  - [x] `pnpm --filter backend exec tsc --noEmit` (0 errors).
  - [x] `pnpm --filter frontend exec tsc --noEmit` (0 errors).
- [x] **Lint code**:
  - [x] `pnpm --filter backend lint` (0 errors).
  - [x] `pnpm --filter frontend lint` (0 errors).
- [x] **Kiểm thử tự động (Unit & Regression Tests)**:
  - [x] `pnpm --filter backend test` (100% pass: 26/26 test suites, 263/263 tests pass).
- [x] **Nghiệm thu chức năng**:
  - [x] Upload avatar lưu vào MinIO, nén WebP 500x500 qua Sharp.
  - [x] Upload video bài giảng lưu vào MinIO.
  - [x] Video phát và tua (seek) trơn tru trên trình duyệt qua Range Request (HTTP 206) và Presigned URL.

---

## ✅ PHASE X COMPLETE

- **Docker MinIO**: ✅ Container `thc_minio` đang chạy (ports 9000 & 9001), bucket `thc-datn-media` sẵn sàng
- **Cloudinary Decommission**: ✅ Đã gỡ bỏ 100% (code, config, package, domain)
- **Typecheck**: ✅ Pass (share-lib, backend, frontend - 0 errors)
- **Lint**: ✅ Pass (backend oxlint 0 errors, frontend eslint 0 errors)
- **Tests**: ✅ Pass (26/26 test files, 263/263 unit tests pass 100%)
- **Date**: 2026-10-01

# AI Video Pipeline — Development History & Gotchas

> **Module:** AI Video Pipeline

---

## 1. Milestone & Feature Status

- **Trạng thái hiện tại:** `IN_PROGRESS` — Đã hoàn thành tầng lưu trữ MinIO Object Storage & Khử bỏ 100% Cloudinary.
- **Kế hoạch triển khai:** Tiếp tục triển khai RabbitMQ worker và video processor trong milestone tiếp theo.

---

## 2. Dev History: MinIO Storage Migration & Cloudinary Decommission (2026-10-01)

- **Bối cảnh & Động lực**:
  - Cloudinary giới hạn băng thông và dung lượng lưu trữ free-tier (video bài giảng lên đến 900MB/file), không cho phép chạy cục bộ/offline.
  - Chuyển đổi 100% sang MinIO S3 Object Storage chạy qua Docker Compose (`docker compose up -d`).
- **Các thay đổi cốt lõi**:
  - `docker-compose.yml`: Cấu hình MinIO Server (`minio/minio:latest`) + Init Container (`minio/mc:latest`) tự động tạo bucket `thc-datn-media` và set anonymous download policy cho `/avatars` và `/thumbnails`.
  - Khử bỏ hoàn toàn Cloudinary: Gỡ bỏ package `cloudinary`, xóa module `CloudinaryModule`, xóa toàn bộ biến `CLOUDINARY_*`, làm sạch domain whitelist trên frontend.
  - Xây dựng `StorageModule` dùng `@aws-sdk/client-s3` và `@aws-sdk/s3-request-presigner`.
  - Tích hợp `sharp` nén và crop avatar 500x500 WebP chuẩn hóa trước khi đẩy lên MinIO.
  - Bổ sung cơ chế phục vụ video Hybrid: Public Direct URL cho bài học preview và Presigned Stream URL có hạn dùng cho bài học chính thức.
  - Cập nhật toàn bộ consumer (`UserService`, `LessonContentController`, `AppModule`, `UserModule`, `CourseModule`) và 100% unit tests.
- **Technical Notes & Gotchas**:
  - **MinIO Force Path Style**: Cần cấu hình `forcePathStyle: true` trong AWS S3 Client SDK để client gửi request theo dạng `http://endpoint/bucket/key` thay vì virtual-host subdomain `http://bucket.endpoint/key` (dễ gây lỗi DNS resolve cục bộ).
  - **Healthcheck & Init Container**: Sử dụng vòng lặp `while ! mc alias set ...; do sleep 1; done` trong init container để đảm bảo container mc chỉ thực hiện tạo bucket khi server MinIO đã sẵn sàng chấp nhận kết nối HTTP.
  - **Presigned URL Expiry**: Mặc định đặt thời hạn 2 giờ (7200 giây) để học viên xem bài học không bị ngắt quãng giữa chừng.

---

## 3. Dev History: AssemblyAI Official SDK Integration (2026-10-07)

- **Bối cảnh & Động lực**:
  - Chuẩn bị pipeline Speech-to-Text cho video bài giảng để trích xuất transcript, word-level timestamps và phụ đề SRT/VTT phục vụ sinh Mindmap và Quiz với Gemini.
- **Các thay đổi cốt lõi**:
  - Cài đặt package chính thức `assemblyai` (`v4.41.5`) vào workspace `backend`.
  - Khởi tạo `AssemblyAiModule` và `AssemblyAiService` trong `backend/src/modules/assemblyai/` bọc AssemblyAI Client.
  - Cấu hình mặc định nhận diện tiếng Việt (`language_code: 'vi'`), hỗ trợ truyền đè tùy chọn nếu cần.
  - Bổ sung validation schema cho `ASSEMBLYAI_API_KEY` trong `backend/src/config/env.validation.ts` và `.env.example`.
  - Đăng ký `AssemblyAiModule` vào `AppModule`.
  - Viết 100% unit tests (`assemblyai.service.spec.ts`) kiểm thử khởi tạo client, xử lý thiếu API key, cấu hình tiếng Việt mặc định, ánh xạ dữ liệu transcript & word timestamps, xử lý lỗi và lấy phụ đề SRT.
- **Technical Notes & Gotchas**:
  - **Type import**: Import `TranscribeParams` thay vì `TranscriptParams` từ `assemblyai` vì `TranscriptParams` là kiểu query param cho danh sách transcript, trong khi `TranscribeParams` chứa thuộc tính `audio` (nhận URL công khai hoặc local file).
  - **Vitest Mocking Constructor**: Khi mock class `AssemblyAI` trong Vitest, cần mock bằng function chuẩn hoặc class (`function MockAssemblyAI() {}`) thay vì arrow function để tương thích toán tử `new`.

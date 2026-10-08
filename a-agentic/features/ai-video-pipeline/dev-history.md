# AI Video Pipeline — Development History & Gotchas

> **Module:** AI Video Pipeline

---

## 1. Milestone & Feature Status

- **Trạng thái hiện tại:** `IN_PROGRESS` — Đã hoàn thành tầng lưu trữ MinIO Object Storage, Tích hợp AssemblyAI SDK và Tự động trích xuất Transcript video bài học lưu Database.
- **Kế hoạch triển khai:** Tiếp tục triển khai RabbitMQ worker quy mô lớn và tích hợp Google Gemini API để sinh Mindmap Markdown & In-video Quiz từ transcript đã lưu.

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

---

## 4. Dev History: MinIO Video Stream & Auto Background Transcription to Database (2026-10-07)

- **Bối cảnh & Động lực**:
  - Khi giảng viên upload video bài học lên hệ thống, sau khi file video đã lưu trữ thành công trên MinIO S3, hệ thống cần tự động trích xuất transcript (tiếng Việt `vi`) qua AssemblyAI và lưu vào database của bài học.
  - Phải tuân thủ Rule 7 (Non-blocking HTTP): Tuyệt đối không để request tạo bài học bị nghẽn chờ AssemblyAI. Phản hồi HTTP ngay cho client, xử lý trích xuất ngầm.
- **Các thay đổi cốt lõi**:
  - **`share-lib`**:
    - Thêm `LessonTranscriptionStatusEnum` (`IDLE`, `QUEUED`, `TRANSCRIBING`, `READY`, `FAILED`).
    - Thêm interfaces `ILessonTranscript` và `ITranscribedWord`.
    - Bổ sung trường `transcriptionStatus` vào `ILesson`.
  - **`StorageService`**:
    - Bổ sung method `getObjectStream(fileKeyOrUrl: string): Promise<Readable>` sử dụng `GetObjectCommand` của AWS S3 SDK.
  - **`AssemblyAiService`**:
    - Bổ sung method `transcribeStream(audioStream: Readable, options?)`: Sử dụng `client.files.upload(audioStream)` để tải stream video lên AssemblyAI Staging Storage an toàn trước khi kích hoạt `client.transcripts.transcribe(...)`.
  - **Database & Architecture**:
    - Thiết kế Mongoose collection riêng `lesson_transcripts` (`LessonTranscriptEntity`), kế thừa `BaseAbstractDocument`, đánh chỉ mục duy nhất `lessonId: 1`.
    - Cài đặt `LessonTranscriptRepository` triển khai `BaseMongoRepository`.
    - Cài đặt `LessonTranscriptService` (`BaseService`): quản lý trạng thái, tải stream từ MinIO, gọi AssemblyAI, lưu transcript & subtitles SRT vào DB và cập nhật `Lesson.transcriptionStatus`.
    - Tự động hook trong `LessonService.createLesson`: Khi bài học có kiểu `VIDEO` và có `videoUrl`, tự động khởi chạy tác vụ ngầm `lessonTranscriptService.triggerTranscription(...)` với `transcriptionStatus = QUEUED`.
    - Bổ sung endpoints trên `LessonsController`: `GET /api/v1/lessons/:id/transcript` và `POST /api/v1/lessons/:id/transcript/retry`.
  - **Testing**:
    - Viết 100% unit tests theo mẫu AAA cho `StorageService.getObjectStream`, `AssemblyAiService.transcribeStream`, `LessonTranscriptService`, `LessonsController` và `LessonService`. Toàn bộ 405 tests pass.
- **Technical Notes & Gotchas**:
  - **MinIO Localhost vs Cloud AI**: MinIO chạy cục bộ tại `localhost:9000` không thể public URL cho cloud worker của AssemblyAI. Phương pháp stream bytes trực tiếp qua `client.files.upload` giải quyết hoàn toàn sự phụ thuộc vào public IP hay tunnel (ngrok).
  - **Mongoose 9 Generic Overload**: Khi query document theo `lessonId` trong Mongoose model kế thừa BaseAbstractDocument, cần ép kiểu bộ lọc qua `as Record<string, unknown>` để tránh lỗi TypeScript type overload mismatch.
  - **Tách riêng Collection**: Tách `lesson_transcripts` khỏi `Lesson` là quyết định thiết kế tối quan trọng nhằm ngăn chặn Document Bloat (transcript với mảng hàng nghìn từ có thể vượt quá giới hạn hoặc làm chậm query danh sách bài học).

---

## 5. Dev History: Sentence-Level Transcription via AssemblyAI Sentences API & Data Stripping (2026-10-08)

- **Bối cảnh & Động lực**:
  - Nhằm tối ưu dung lượng MongoDB và cấu trúc dữ liệu cho học tập, hệ thống cần trích xuất transcript theo từng câu thay vì lưu hàng nghìn từ lẻ tẻ (`words`).
  - Toàn bộ trường `confidence` và danh sách từ `words` được loại bỏ khỏi database để giữ kích thước document gọn nhẹ tối đa (chỉ lưu `rawTranscript` và `sentences`).
- **Các thay đổi cốt lõi**:
  - **`share-lib`**:
    - Định nghĩa interface `ITranscribedSentence`: `{ text: string, start: number, end: number }`.
    - Cập nhật `ILessonTranscript`: thay `words` bằng `sentences: ITranscribedSentence[]`.
    - Build thành công `pnpm --filter share-lib build`.
  - **`AssemblyAiService`**:
    - Sau khi hoàn thành transcript, gọi `client.transcripts.sentences(transcript.id)`.
    - Chuẩn hóa và làm sạch chuỗi câu (`text.trim()`, `start`, `end`), loại bỏ `confidence`.
    - Cập nhật kết quả `AssemblyAiTranscriptionResult`: trả về mảng `sentences: TranscribedSentence[]`.
  - **`LessonTranscriptSchema` & Service**:
    - Loại bỏ `TranscribedWordEntity` và thuộc tính `confidence`.
    - Bổ sung subdocument `TranscribedSentenceEntity` (`_id: false`) gồm 3 trường sạch: `text`, `start`, `end`.
    - `LessonTranscriptService.processTranscriptionTask` lưu `sentences` vào MongoDB collection `lesson_transcripts`.
  - **Testing**:
    - Cập nhật 100% unit tests cho `AssemblyAiService` và `LessonTranscriptService`. Toàn bộ 33 test files (405 tests) pass hoàn toàn.
- **Technical Notes & Gotchas**:
  - **Sentences API Format**: AssemblyAI trả về `SentencesResponse` chứa mảng `TranscriptSentence[]`. Mỗi phần tử có `text`, `start` và `end` tính bằng mili-giây, rất thuận tiện để frontend hiển thị highlight đồng bộ với video player theo từng câu.
  - **Data Sanitization**: Luôn áp dụng `.trim()` cho `text` của từng câu để đảm bảo không bị thừa khoảng trắng ở đầu/cuối chuỗi câu do AssemblyAI trả về.


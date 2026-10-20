# AI Video Pipeline — Technical Specifications

> **Module:** Technical Contracts, RabbitMQ Topology, AssemblyAI & Gemini Integration Schemas.

---

## 1. RabbitMQ Topology & Contracts

- **Exchange**: `elearning.video.events` (Topic Exchange, durable: true).
- **Queues**:
  - `video.process.queue` (durable: true, routing_key: `video.process`).
  - `video.dead_letter.queue` (durable: true, linked via DLX).
- **Message Payload**:
```json
{
  "lessonId": "650f1234abcd5678ef012345",
  "courseId": "650f1234abcd5678ef012340",
  "videoUrl": "https://storage.example.com/videos/lesson-1.mp4",
  "timestamp": 1726930000000
}
```

---

## 2. Gemini API Prompting & Output Contract

### A. System Prompt yêu cầu:
- Ngôn ngữ: Tiếng Việt (hoặc theo ngôn ngữ của video).
- Phân tích transcript thành 2 thành phần chính:
  1. `mindmapMarkdown`: Chuỗi Markdown dạng cây phân cấp hợp lệ với `@markmap/react`. Ví dụ:
  ```markdown
  # Tổng quan về Lập trình Web
  ## Frontend
  - HTML & CSS
  - JavaScript & TypeScript
  - React & Next.js
  ## Backend
  - Node.js & NestJS
  - Cơ sở dữ liệu MongoDB
  ```
  2. `inVideoQuizzes`: Mảng các câu hỏi trắc nghiệm kiểm tra độ hiểu bài được đặt tại các mốc thời gian quan trọng (`timestamp` tính bằng giây):
  ```json
  [
    {
      "timestamp": 185,
      "question": "Điểm khác biệt chính giữa React Server Component và Client Component là gì?",
      "options": [
        "Server Component chỉ render trên server và giảm dung lượng bundle tải về client",
        "Server Component không thể dùng được với CSS",
        "Client Component không thể tương tác được với form",
        "Cả hai đều render hoàn toàn ở client"
      ],
      "correctIndex": 0,
      "explanation": "React Server Component được render trên server, giúp giảm kích thước Javascript bundle gửi tới trình duyệt và tăng tốc độ tải trang."
    }
  ]
  ```

---

## 3. Data Storage & Schema Modifications

- **`Lesson` Document** (`lessons` collection):
  - Bổ sung trường `transcriptionStatus`: `LessonTranscriptionStatusEnum` (`IDLE`, `QUEUED`, `TRANSCRIBING`, `READY`, `FAILED`).
- **`LessonTranscript` Document** (`lesson_transcripts` collection) — Kế thừa `BaseAbstractDocument`:
  - `lessonId`: `Types.ObjectId` (Indexed, Unique, Ref: `LessonEntity`)
  - `rawTranscript`: `string` (Verbatim transcript text)
  - `sentences`: `Array<{ text: string, start: number, end: number }>` (Sentence-level timestamps, đã làm sạch whitespace, **không lưu confidence**)
  - `durationSeconds`: `number` (Thời lượng tính bằng giây)
  - `languageCode`: `string` (Default: `vi`)
  - `externalTranscriptId`: `string | null` (AssemblyAI Transcript ID)
  - `status`: `LessonTranscriptionStatusEnum`
  - `failureReason`: `string | null` (Lý do thất bại nếu status = FAILED)
- **API Endpoints**:
  - `GET /api/v1/lessons/:id/transcript`: Lấy transcript chi tiết của bài học.
  - `POST /api/v1/lessons/:id/transcript/retry`: Yêu cầu thực hiện lại tác vụ trích xuất transcript khi bài học bị `FAILED`.

---

## 4. Gemini Model Fallback & High-Availability Contract

- **Primary Model**: `gemini-3.8-flash` (`GEMINI_MODEL`, ưu tiên hàng đầu ở mọi request).
- **Fallback Model**: `gemini-3.5-flash-lite` (`GEMINI_FALLBACK_MODEL`, tự động chuyển tạm thời khi model chính quá tải).
- **Phân loại Lỗi & Ứng phó**:
  - `503 UNAVAILABLE` / `Model Overloaded`: Lỗi cụm máy chủ model Google quá tải tạm thời, **không phạt cooldown API key**. Ngay lập tức chuyển request sang `gemini-3.5-flash-lite` trên cùng key đó. Request tiếp theo tự động thử lại `gemini-3.8-flash` trước.
  - `429 RESOURCE_EXHAUSTED`: Cooldown key 30s và xoay vòng sang API key tiếp theo.
  - `401 / 403 AUTH_ERROR`: Đánh dấu key `DEAD` và xoay vòng sang API key tiếp theo.
- **Execution Metadata Contract**:
  - `GeminiExecutionResult`:
    - `model`: Tên model thực tế phục vụ (`gemini-3.8-flash` hoặc `gemini-3.5-flash-lite`).
    - `isFallback`: `boolean` (`true` nếu dùng fallback, `false` nếu dùng primary).

---

## 5. FFmpeg Audio Extraction & Speech-to-Text Optimization Contract

- **Binary Resolution Strategy**:
  1. `FFMPEG_PATH`: Biến môi trường tùy biến trong `.env`.
  2. `ffmpeg-static`: Binary đóng gói sẵn tương thích đa nền tảng (Windows `.exe`, Linux, macOS).
  3. `ffmpeg`: Lệnh toàn cục trên hệ điều hành.
- **Input Stream Source**:
  - Nguồn video từ MinIO được cấp qua Presigned Download URL (`getPresignedStreamUrl(key, 3600)`), cho phép FFmpeg kéo dữ liệu trực tiếp bằng HTTP Range Requests mà không phải tải toàn bộ video MP4 về đĩa máy chủ backend.
- **FFmpeg Conversion Parameters (Chuẩn tối ưu cho ASR)**:
  - `-i <presigned_url>`: Nguồn video đầu vào từ MinIO.
  - `-vn`: Loại bỏ hoàn toàn luồng hình ảnh (No Video).
  - `-ac 1`: Chuyển đổi âm thanh sang 1 kênh duy nhất (Mono).
  - `-ar 16000`: Hạ tần số lấy mẫu (Sample rate) về 16.000 Hz (chuẩn native của mô hình nhận diện giọng nói).
  - `-c:a libmp3lame`: Bộ mã hóa định dạng MP3.
  - `-b:a 64k`: Bitrate 64 kbps (nhẹ ~28MB/giờ bài giảng, giữ trọn độ nét giọng nói).
  - `-y`: Tự động ghi đè tệp tạm.
- **Quản lý Vòng đời Tệp Tạm (Temp File Lifecycle)**:
  - Vị trí tệp: `path.join(os.tmpdir(), `audio-${lessonId}-${Date.now()}.mp3`)`.
  - Cơ chế dọn dẹp: Bọc trong khối `try ... finally` của `LessonTranscriptService.processTranscriptionTask`, đảm bảo luôn dọn dẹp (xóa bỏ) tệp MP3 tạm sau khi AssemblyAI hoàn tất hoặc khi gặp ngoại lệ.


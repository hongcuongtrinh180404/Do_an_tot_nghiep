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


# Kế hoạch Triển khai: Lấy Transcript Video Bài học với AssemblyAI & Lưu Database

> **Mục tiêu**: Tự động kích hoạt quy trình lấy transcript bài giảng qua AssemblyAI ngay sau khi video được tải lên MinIO và lưu vào bài học, sau đó lưu trữ toàn bộ dữ liệu transcript (raw text, word-level timestamps, phụ đề) vào cơ sở dữ liệu MongoDB theo đúng chuẩn kiến trúc của dự án.

---

## 1. Tổng quan & Ranh giới (Scope & Boundaries)

| Tiêu chí | Trong phạm vi (IN SCOPE) | Ngoài phạm vi (OUT OF SCOPE) |
| :--- | :--- | :--- |
| **Luồng cốt lõi** | ① Upload video lên MinIO thành công.<br>② Kích hoạt tiến trình trích xuất transcript bất đồng bộ.<br>③ Lưu trữ bản ghi transcript vào MongoDB và cập nhật trạng thái bài học. | Sinh Mindmap Markdown với Gemini (thuộc milestone tiếp theo).<br>Sinh câu hỏi In-video Quiz. |
| **Modules backend** | `modules/course` (Lesson, LessonTranscript)<br>`modules/storage` (đọc file/stream từ MinIO)<br>`modules/assemblyai` (gọi SDK chuyển giọng nói) | Auth, Payment, User |
| **Xử lý môi trường** | MinIO chạy trên Docker localhost (môi trường dev) lẫn Cloud S3: Stream trực tiếp từ MinIO đẩy sang AssemblyAI. | Triển khai CDN production hoặc streaming HLS đa độ phân giải. |
| **Bất đồng bộ** | Chạy background event non-blocking (không làm treo HTTP request upload bài học). | Setup cụm RabbitMQ cluster phân tán nâng cao (chuẩn bị interface tương thích). |

---

## 2. Kiến trúc Kỹ thuật & Luồng Dữ liệu (Architecture & Data Flow)

### 2.1. Biểu đồ luồng tổng thể

```text
[Frontend]
   │
   │ 1. Upload Video File
   ▼
[LessonContentController]
   │
   │ 2. Lưu trữ video
   ▼
[MinIO Object Storage] ──(Lưu thành công, trả về publicId & url)──> [Frontend]
                                                                        │
                                                                        │ 3. Tạo/Cập nhật Lesson
                                                                        ▼
                                                             [LessonService]
                                                                │
                                                ┌───────────────┴───────────────┐
                                                ▼                               ▼
                                       Lưu Lesson vào DB               Bắn Event / Task
                                  (status = TRANSCRIBING)              Trích xuất ngầm
                                                │                               │
                                                ▼                               ▼
                                       Trả về 201/200 ngay           [Transcription Worker]
                                       (Không đợi AI)                           │
                                                                                ├── Đọc stream từ MinIO
                                                                                ├── Gửi tới AssemblyAI (vi)
                                                                                ▼
                                                                     Nhận Transcript & Timestamps
                                                                                │
                                                                                ▼
                                                                     Lưu LessonTranscript DB
                                                                     Set Lesson status = READY
```

### 2.2. Điểm kiến trúc then chốt (Gotcha & Solution)

1. **Vấn đề MinIO Localhost vs Cloud AI**:
   - MinIO chạy trên máy dev nội bộ (`http://localhost:9000/...`), do đó server của AssemblyAI ở trên cloud **không thể truy cập ngược** vào địa chỉ `localhost:9000` để kéo video.
   - **Giải pháp**: `StorageService` cung cấp hàm `getObjectStream(key)`. Backend sẽ đọc dữ liệu từ MinIO dưới dạng stream/buffer rồi đẩy trực tiếp lên AssemblyAI qua `client.files.upload` (hoặc truyền stream vào `transcribe`), hoàn toàn không phụ thuộc vào việc MinIO có public IP hay không.
2. **Nguyên tắc Non-blocking HTTP (Rule 7)**:
   - Quá trình transcribe video (vài phút) không được phép chạy đồng bộ trong HTTP request của người dùng.
   - Khi lưu video, bài học chuyển trạng thái `transcriptionStatus = 'TRANSCRIBING'` và trả về client ngay lập tức (`HTTP 200/201`).
   - Transcription worker chạy ngầm, sau khi hoàn tất sẽ ghi vào collection `LessonTranscript` và chuyển trạng thái bài học thành `'READY'` (hoặc `'FAILED'` nếu có lỗi).

---

## 3. Thiết kế Schema & Hợp đồng Dữ liệu (Schema & Data Contracts)

### 3.1. Hợp đồng `share-lib`

1. **Enum trạng thái**:
   ```ts
   // share-lib/src/enums/lesson-transcription-status.enum.ts
   export enum LessonTranscriptionStatusEnum {
     IDLE = 'IDLE',
     QUEUED = 'QUEUED',
     TRANSCRIBING = 'TRANSCRIBING',
     READY = 'READY',
     FAILED = 'FAILED',
   }
   ```
2. **Interface Transcript**:
   ```ts
   // share-lib/src/interfaces/lesson-transcript.interface.ts
   export interface ITranscribedWord {
     word: string;
     start: number; // mili-giây
     end: number;   // mili-giây
     confidence: number;
   }

   export interface ILessonTranscript {
     id: string;
     lessonId: string;
     rawTranscript: string;
     words: ITranscribedWord[];
     durationSeconds: number;
     languageCode: string;
     externalTranscriptId?: string;
     failureReason?: string | null;
     createdAt: Date | string;
     updatedAt: Date | string;
   }
   ```

### 3.2. Mongoose Schema (`backend`)

1. **Collection riêng biệt `lesson_transcripts`** (để tránh làm phình to document `Lesson` do mảng từ hàng ngàn phần tử):
   - `LessonTranscriptEntity` kế thừa `BaseAbstractDocument`:
     - `lessonId`: `Types.ObjectId` (ref: `LessonEntity`, unique index).
     - `rawTranscript`: `String` (full text).
     - `words`: `Array<{ word: String, start: Number, end: Number, confidence: Number }>`.
     - `durationSeconds`: `Number`.
     - `languageCode`: `String` (mặc định `'vi'`).
     - `externalTranscriptId`: `String` (AssemblyAI UUID).
     - `failureReason`: `String | null`.
2. **Bổ sung trường vào `LessonEntity`**:
   - `transcriptionStatus`: `LessonTranscriptionStatusEnum` (mặc định `IDLE`).
   - `duration`: `Number` (thời lượng video tính bằng giây).

---

## 4. Kế hoạch Phân rã Công việc (Task Breakdown)

### Phase 1: Mở rộng Hợp đồng chung (`share-lib`)
- [ ] **Task 1.1**: Tạo `LessonTranscriptionStatusEnum` (`IDLE`, `QUEUED`, `TRANSCRIBING`, `READY`, `FAILED`).
- [ ] **Task 1.2**: Tạo interface `ILessonTranscript` và `ITranscribedWord`.
- [ ] **Task 1.3**: Thêm `transcriptionStatus` vào `ILesson` và export đầy đủ trong `share-lib/src/index.ts`.
- [ ] **Task 1.4**: Chạy `pnpm --filter share-lib build`.

### Phase 2: Nâng cấp `StorageModule` (MinIO Object Stream)
- [ ] **Task 2.1**: Thêm method `getObjectStream(key: string): Promise<Readable>` vào `StorageService`.
- [ ] **Task 2.2**: Cập nhật `storage.interface.ts` và viết unit test trong `storage.service.spec.ts`.

### Phase 3: Nâng cấp `AssemblyAiService` hỗ trợ Stream Upload
- [ ] **Task 3.1**: Bổ sung method `transcribeStream(stream: ReadableStream | NodeJS.ReadableStream, options?)` vào `AssemblyAiService`.
- [ ] **Task 3.2**: Tận dụng cơ chế `client.files.upload` của AssemblyAI để upload file từ MinIO stream lên cloud an toàn.
- [ ] **Task 3.3**: Cập nhật unit test trong `assemblyai.service.spec.ts` (100% pass).

### Phase 4: Xây dựng Module `LessonTranscript` & Tích hợp `LessonService`
- [ ] **Task 4.1**: Tạo `LessonTranscriptEntity` và `LessonTranscriptSchema` (MongoDB indexes: `{ lessonId: 1 }`).
- [ ] **Task 4.2**: Tạo `LessonTranscriptRepository` kế thừa `BaseMongoRepository`.
- [ ] **Task 4.3**: Tạo `LessonTranscriptService` chịu trách nhiệm:
  - Khởi tạo tiến trình trích xuất ngầm.
  - Cập nhật trạng thái bài học (`TRANSCRIBING` → `READY` / `FAILED`).
  - Lưu transcript và mảng từ vào DB.
- [ ] **Task 4.4**: Tích hợp hook vào `LessonService`:
  - Khi bài học được tạo hoặc cập nhật có `content.type === 'VIDEO'`, kích hoạt `LessonTranscriptService.processVideoTranscription(lessonId, videoKey)`.
- [ ] **Task 4.5**: Thêm Endpoint `GET /api/v1/lessons/:id/transcript` và `POST /api/v1/lessons/:id/transcript/retry` (cho phép thử lại nếu lỗi).

### Phase 5: Kiểm thử Toàn diện & Xác thực (Quality Assurance)
- [ ] **Task 5.1**: Viết Unit Tests cho `LessonTranscriptService` và `LessonTranscriptRepository` theo chuẩn AAA.
- [ ] **Task 5.2**: Chạy kiểm thử tự động `pnpm --filter backend test` đạt 100% pass.
- [ ] **Task 5.3**: Chạy `pnpm --filter backend lint` và `pnpm --filter backend build`.
- [ ] **Task 5.4**: Đồng bộ tài liệu `a-agentic/features/ai-video-pipeline/` và `dev-history.md`.

---

## 5. Tiêu chí Nghiệm thu (Acceptance Criteria)

1. **Khả năng tự động hóa**: Khi instructor upload video và lưu bài học, hệ thống tự động khởi chạy tiến trình trích xuất transcript mà không cần can thiệp thủ công.
2. **Độc lập môi trường**: Hoạt động mượt mà với MinIO cục bộ (Docker `localhost:9000`) qua cơ chế stream upload lên AssemblyAI.
3. **Hiệu năng & Trải nghiệm**: Request lưu bài học phản hồi ngay lập tức (`< 500ms`), trạng thái bài học hiển thị `TRANSCRIBING` và tự động đổi sang `READY` khi xử lý xong.
4. **Độ chính xác dữ liệu**:
   - `rawTranscript` lưu đầy đủ văn bản tiếng Việt có dấu câu.
   - `words` lưu đúng mốc mili-giây `start`, `end` và điểm `confidence`.
5. **Chất lượng mã nguồn**: Không sử dụng kiểu `any`, 100% unit tests pass, tuân thủ Clean Code và kiến trúc DDD/Repository của dự án.
